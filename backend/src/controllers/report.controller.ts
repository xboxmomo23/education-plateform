import { Request, Response } from 'express';
import { pool } from '../config/database';
import { findTermById } from '../models/term.model';
import PDFDocument from 'pdfkit'; 

// ============================================
// NOTE: Pour la génération PDF native, installer :
// npm install pdfkit @types/pdfkit
// Puis décommenter les sections marquées [PDFKIT]
// ============================================

// =========================
// Types
// =========================

interface SubjectSummary {
  subjectId: string;
  subjectName: string;
  coefTotal: number;
  studentAverage20: number;
  classAverage20: number | null;
  min: number | null;
  max: number | null;
  gradeCount: number;
  appreciation: string;
}

interface EvaluationDetail {
  subjectId: string;
  subjectName: string;
  evaluationId: string;
  title: string;
  type: string;
  date: string;
  coefficient: number;
  maxScale: number;
  gradeValue: number | null;
  normalizedValue: number | null;
  absent: boolean;
  comment: string | null;
}

interface GradesSummaryResponse {
  term: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  overallAverage: number;
  overallAppreciation: string;
  subjects: SubjectSummary[];
  evaluations: EvaluationDetail[];
}

// =========================
// Helpers
// =========================

function generateAppreciation(average: number): string {
  if (average >= 16) return 'Excellent travail';
  if (average >= 14) return 'Très bon travail';
  if (average >= 12) return 'Bon travail';
  if (average >= 10) return 'Travail satisfaisant';
  if (average >= 8) return 'Travail insuffisant';
  return 'Travail très insuffisant';
}

// =========================
// GET /api/students/me/grades/summary
// Synthèse des notes pour l'élève connecté
// =========================

export async function getStudentGradesSummaryHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const studentId = req.user.userId;
    const { academicYear, termId } = req.query;

    // Vérifier que l'utilisateur est bien un élève
    if (req.user.role !== 'student') {
      res.status(403).json({ 
        success: false, 
        error: 'Cet endpoint est réservé aux élèves' 
      });
      return;
    }

    const year = academicYear ? parseInt(academicYear as string) : new Date().getFullYear();
    const establishmentId = req.user.establishmentId || '18fdec95-29be-4d71-8669-21d67f3a4587';

    // Récupérer les infos du term si spécifié
    let termInfo = null;
    if (termId) {
      termInfo = await findTermById(termId as string, establishmentId);
    }

    // Construire la requête SQL pour récupérer toutes les notes
    let gradesQuery = `
      SELECT 
        g.id as grade_id,
        g.value,
        g.absent,
        g.normalized_value,
        g.comment,
        e.id as evaluation_id,
        e.title as evaluation_title,
        e.type as evaluation_type,
        e.coefficient,
        e.max_scale,
        e.eval_date,
        e.term_id,
        s.id as subject_id,
        s.name as subject_name,
        s.code as subject_code,
        c.id as course_id,
        c.academic_year,
        -- Stats de classe
        (
          SELECT AVG(g2.normalized_value)
          FROM grades g2
          WHERE g2.evaluation_id = e.id
          AND g2.absent = false
          AND g2.normalized_value IS NOT NULL
        ) as class_average,
        (
          SELECT MIN(g2.normalized_value)
          FROM grades g2
          WHERE g2.evaluation_id = e.id
          AND g2.absent = false
          AND g2.normalized_value IS NOT NULL
        ) as class_min,
        (
          SELECT MAX(g2.normalized_value)
          FROM grades g2
          WHERE g2.evaluation_id = e.id
          AND g2.absent = false
          AND g2.normalized_value IS NOT NULL
        ) as class_max
      FROM grades g
      INNER JOIN evaluations e ON e.id = g.evaluation_id
      INNER JOIN courses c ON c.id = e.course_id
      INNER JOIN subjects s ON s.id = c.subject_id
      WHERE g.student_id = $1
      AND c.academic_year = $2
    `;

    const params: any[] = [studentId, year];
    let paramIndex = 3;

    // Filtre par période si spécifié
    // On filtre soit par term_id direct, soit par date si term_id est NULL
    if (termId && termInfo) {
      gradesQuery += ` AND (
        e.term_id = $${paramIndex}
        OR (e.term_id IS NULL AND e.eval_date >= $${paramIndex + 1} AND e.eval_date <= $${paramIndex + 2})
      )`;
      params.push(termId, termInfo.start_date, termInfo.end_date);
      paramIndex += 3;
    }

    gradesQuery += ` ORDER BY s.name ASC, e.eval_date DESC`;

    const gradesResult = await pool.query(gradesQuery, params);
    const grades = gradesResult.rows;

    // Grouper par matière pour calculer les moyennes
    const subjectsMap = new Map<string, {
      subjectId: string;
      subjectName: string;
      grades: any[];
      totalCoef: number;
      weightedSum: number;
      classAverages: number[];
      mins: number[];
      maxs: number[];
    }>();

    grades.forEach((grade) => {
      if (!subjectsMap.has(grade.subject_id)) {
        subjectsMap.set(grade.subject_id, {
          subjectId: grade.subject_id,
          subjectName: grade.subject_name,
          grades: [],
          totalCoef: 0,
          weightedSum: 0,
          classAverages: [],
          mins: [],
          maxs: [],
        });
      }

      const subject = subjectsMap.get(grade.subject_id)!;
      subject.grades.push(grade);

      // Calculer la moyenne pondérée (seulement les notes valides)
      if (!grade.absent && grade.normalized_value !== null) {
        const normalizedValue = parseFloat(grade.normalized_value);
        const coefficient = parseFloat(grade.coefficient);
        subject.totalCoef += coefficient;
        subject.weightedSum += normalizedValue * coefficient;
      }

      // Collecter les stats de classe
      if (grade.class_average !== null) {
        subject.classAverages.push(parseFloat(grade.class_average));
      }
      if (grade.class_min !== null) {
        subject.mins.push(parseFloat(grade.class_min));
      }
      if (grade.class_max !== null) {
        subject.maxs.push(parseFloat(grade.class_max));
      }
    });

    // Construire la réponse des matières
    const subjects: SubjectSummary[] = [];
    let totalSubjectAverages = 0;
    let countSubjectsWithGrades = 0;

    subjectsMap.forEach((subject) => {
      const studentAverage = subject.totalCoef > 0 
        ? subject.weightedSum / subject.totalCoef 
        : 0;

      const classAverage = subject.classAverages.length > 0
        ? subject.classAverages.reduce((a, b) => a + b, 0) / subject.classAverages.length
        : null;

      const minGrade = subject.mins.length > 0 ? Math.min(...subject.mins) : null;
      const maxGrade = subject.maxs.length > 0 ? Math.max(...subject.maxs) : null;

      // Compter seulement les matières avec des notes valides pour la moyenne générale
      if (subject.totalCoef > 0) {
        totalSubjectAverages += studentAverage;
        countSubjectsWithGrades++;
      }

      subjects.push({
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        coefTotal: subject.grades.reduce((sum, g) => sum + parseFloat(g.coefficient), 0),
        studentAverage20: parseFloat(studentAverage.toFixed(2)),
        classAverage20: classAverage !== null ? parseFloat(classAverage.toFixed(2)) : null,
        min: minGrade !== null ? parseFloat(minGrade.toFixed(2)) : null,
        max: maxGrade !== null ? parseFloat(maxGrade.toFixed(2)) : null,
        gradeCount: subject.grades.length,
        appreciation: generateAppreciation(studentAverage),
      });
    });

    // Calculer la moyenne générale
    const overallAverage = countSubjectsWithGrades > 0
      ? totalSubjectAverages / countSubjectsWithGrades
      : 0;

    // Transformer les évaluations en détails
    const evaluations: EvaluationDetail[] = grades.map((grade) => ({
      subjectId: grade.subject_id,
      subjectName: grade.subject_name,
      evaluationId: grade.evaluation_id,
      title: grade.evaluation_title,
      type: grade.evaluation_type,
      date: grade.eval_date,
      coefficient: parseFloat(grade.coefficient),
      maxScale: parseFloat(grade.max_scale),
      gradeValue: grade.value !== null ? parseFloat(grade.value) : null,
      normalizedValue: grade.normalized_value !== null ? parseFloat(grade.normalized_value) : null,
      absent: grade.absent,
      comment: grade.comment,
    }));

    const response: GradesSummaryResponse = {
      term: termInfo ? {
        id: termInfo.id,
        name: termInfo.name,
        startDate: termInfo.start_date.toISOString(),
        endDate: termInfo.end_date.toISOString(),
      } : null,
      overallAverage: parseFloat(overallAverage.toFixed(2)),
      overallAppreciation: generateAppreciation(overallAverage),
      subjects: subjects.sort((a, b) => a.subjectName.localeCompare(b.subjectName)),
      evaluations,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Erreur récupération synthèse notes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la synthèse des notes',
    });
  }
}

// =========================
// GET /api/students/:studentId/report
// Génère un bulletin PDF pour un élève
// =========================

export async function getStudentReportHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { studentId } = req.params;
    const { termId } = req.query;

    // Vérification des permissions
    const canAccess = 
      req.user.role === 'admin' ||
      req.user.role === 'staff' ||
      (req.user.role === 'student' && req.user.userId === studentId) ||
      req.user.role === 'parent'; // TODO: vérifier que c'est bien le parent de l'élève

    if (!canAccess) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    if (!termId) {
      res.status(400).json({ 
        success: false, 
        error: 'Le paramètre termId est requis pour générer un bulletin' 
      });
      return;
    }

    const establishmentId = req.user.establishmentId || '18fdec95-29be-4d71-8669-21d67f3a4587';

    // Récupérer les infos de l'élève
    const studentQuery = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        sp.student_no,
        sp.birthdate,
        cl.label as class_label,
        cl.level as class_level,
        en.academic_year
      FROM users u
      INNER JOIN student_profiles sp ON sp.user_id = u.id
      INNER JOIN enrollments en ON en.student_id = u.id AND en.end_date IS NULL
      INNER JOIN classes cl ON cl.id = en.class_id
      WHERE u.id = $1
    `;

    const studentResult = await pool.query(studentQuery, [studentId]);
    if (studentResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Élève non trouvé' });
      return;
    }

    const student = studentResult.rows[0];

    // Récupérer les infos de l'établissement
    const establishmentQuery = `
      SELECT name, address, city, postal_code, email, phone
      FROM establishments
      WHERE id = $1
    `;

    const establishmentResult = await pool.query(establishmentQuery, [establishmentId]);
    const establishment = establishmentResult.rows[0] || {
      name: 'Établissement',
      address: '',
      city: '',
      postal_code: '',
      email: '',
      phone: '',
    };

    // Récupérer les infos de la période
    const term = await findTermById(termId as string, establishmentId);
    if (!term) {
      res.status(404).json({ success: false, error: 'Période non trouvée' });
      return;
    }


    // Récupérer les appréciations par matière (prof)
    const subjectAppreciationsQuery = `
      SELECT 
        sa.appreciation,
        c.id as course_id,
        s.name as subject_name
      FROM subject_appreciations sa
      INNER JOIN courses c ON c.id = sa.course_id
      INNER JOIN subjects s ON s.id = c.subject_id
      WHERE sa.student_id = $1 AND sa.term_id = $2
    `;
    const subjectAppreciationsResult = await pool.query(subjectAppreciationsQuery, [studentId, termId]);
    const subjectAppreciationsMap = new Map<string, string>();
    subjectAppreciationsResult.rows.forEach((row) => {
      subjectAppreciationsMap.set(row.subject_name, row.appreciation);
    });

    // Récupérer l'appréciation du conseil de classe
    const reportCardQuery = `
      SELECT council_appreciation
      FROM report_cards
      WHERE student_id = $1 AND term_id = $2
    `;
    const reportCardResult = await pool.query(reportCardQuery, [studentId, termId]);
    const councilAppreciation = reportCardResult.rows[0]?.council_appreciation || null;

    // Récupérer les notes pour cette période
    // Filtre par term_id direct OU par date si term_id est NULL
    const gradesQuery = `
      SELECT 
        g.normalized_value,
        g.absent,
        g.comment,
        e.coefficient,
        s.id as subject_id,
        s.name as subject_name,
        (
          SELECT AVG(g2.normalized_value)
          FROM grades g2
          WHERE g2.evaluation_id = e.id
          AND g2.absent = false
          AND g2.normalized_value IS NOT NULL
        ) as class_average
      FROM grades g
      INNER JOIN evaluations e ON e.id = g.evaluation_id
      INNER JOIN courses c ON c.id = e.course_id
      INNER JOIN subjects s ON s.id = c.subject_id
      WHERE g.student_id = $1
      AND (
        e.term_id = $2
        OR (e.term_id IS NULL AND e.eval_date >= $3 AND e.eval_date <= $4)
      )
      ORDER BY s.name
    `;

    const gradesResult = await pool.query(gradesQuery, [studentId, termId, term.start_date, term.end_date]);
    const grades = gradesResult.rows;

    // Grouper par matière et calculer les moyennes
    const subjectsMap = new Map<string, {
      name: string;
      grades: any[];
      totalCoef: number;
      weightedSum: number;
      classAverages: number[];
    }>();

    grades.forEach((grade) => {
      if (!subjectsMap.has(grade.subject_id)) {
        subjectsMap.set(grade.subject_id, {
          name: grade.subject_name,
          grades: [],
          totalCoef: 0,
          weightedSum: 0,
          classAverages: [],
        });
      }

      const subject = subjectsMap.get(grade.subject_id)!;
      subject.grades.push(grade);

      if (!grade.absent && grade.normalized_value !== null) {
        const value = parseFloat(grade.normalized_value);
        const coef = parseFloat(grade.coefficient);
        subject.totalCoef += coef;
        subject.weightedSum += value * coef;
      }

      if (grade.class_average !== null) {
        subject.classAverages.push(parseFloat(grade.class_average));
      }
    });

    // Préparer les données du bulletin
    const reportSubjects: Array<{
      name: string;
      studentAverage: number;
      classAverage: number | null;
      coefficient: number;
      appreciation: string;
    }> = [];

    let totalAverages = 0;
    let subjectCount = 0;

    subjectsMap.forEach((subject) => {
      const avg = subject.totalCoef > 0 ? subject.weightedSum / subject.totalCoef : 0;
      const classAvg = subject.classAverages.length > 0
        ? subject.classAverages.reduce((a, b) => a + b, 0) / subject.classAverages.length
        : null;

      if (subject.totalCoef > 0) {
        totalAverages += avg;
        subjectCount++;
      }

      reportSubjects.push({
        name: subject.name,
        studentAverage: parseFloat(avg.toFixed(2)),
        classAverage: classAvg !== null ? parseFloat(classAvg.toFixed(2)) : null,
        coefficient: subject.totalCoef,
        appreciation: subjectAppreciationsMap.get(subject.name) || generateAppreciation(avg),
      });
    });

    const overallAverage = subjectCount > 0 ? totalAverages / subjectCount : 0;

    // Générer le PDF
    const doc = new PDFDocument({ margin: 50 });

    // Headers HTTP pour le PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bulletin_${student.full_name.replace(/\s+/g, '_')}_${term.name.replace(/\s+/g, '_')}.pdf"`
    );

    doc.pipe(res);

    // === EN-TÊTE DU BULLETIN ===
    doc.fontSize(20).font('Helvetica-Bold').text(establishment.name, { align: 'center' });
    doc.moveDown(0.3);
    if (establishment.address) {
      doc.fontSize(10).font('Helvetica').text(
        `${establishment.address}, ${establishment.postal_code} ${establishment.city}`,
        { align: 'center' }
      );
    }
    doc.moveDown(0.5);

    // Titre du bulletin
    doc.fontSize(16).font('Helvetica-Bold').text('BULLETIN DE NOTES', { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(term.name, { align: 'center' });
    doc.fontSize(10).text(
      `Du ${new Date(term.start_date).toLocaleDateString('fr-FR')} au ${new Date(term.end_date).toLocaleDateString('fr-FR')}`,
      { align: 'center' }
    );
    doc.moveDown();

    // Ligne de séparation
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // === INFORMATIONS ÉLÈVE ===
    doc.fontSize(11).font('Helvetica-Bold').text('ÉLÈVE');
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nom : ${student.full_name}`);
    doc.text(`Classe : ${student.class_label}`);
    doc.text(`N° Élève : ${student.student_no || 'N/A'}`);
    doc.text(`Année scolaire : ${student.academic_year}-${student.academic_year + 1}`);
    doc.moveDown();

    // Ligne de séparation
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // === TABLEAU DES NOTES ===
    const tableTop = doc.y;
    const colWidths = [180, 80, 80, 60, 90];
    const headers = ['Matière', 'Moy. Élève', 'Moy. Classe', 'Coef.', 'Appréciation'];

    // En-tête du tableau
    doc.font('Helvetica-Bold').fontSize(9);
    let xPos = 50;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: i === 0 ? 'left' : 'center' });
      xPos += colWidths[i];
    });

    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();

    // Lignes du tableau
    doc.font('Helvetica').fontSize(9);
    let rowY = doc.y + 5;

    reportSubjects.forEach((subject) => {
      if (rowY > 700) {
        doc.addPage();
        rowY = 50;
      }

      let xPos = 50;
      doc.text(subject.name, xPos, rowY, { width: colWidths[0] });
      xPos += colWidths[0];
      
      doc.text(subject.studentAverage.toFixed(2) + '/20', xPos, rowY, { width: colWidths[1], align: 'center' });
      xPos += colWidths[1];
      
      doc.text(subject.classAverage !== null ? subject.classAverage.toFixed(2) + '/20' : '-', xPos, rowY, { width: colWidths[2], align: 'center' });
      xPos += colWidths[2];
      
      doc.text(subject.coefficient.toFixed(1), xPos, rowY, { width: colWidths[3], align: 'center' });
      xPos += colWidths[3];
      
      doc.text(subject.appreciation, xPos, rowY, { width: colWidths[4], align: 'center' });

      rowY += 20;
    });

    // Ligne de séparation finale
    doc.moveTo(50, rowY).lineTo(545, rowY).stroke();
    rowY += 15;

    // === MOYENNE GÉNÉRALE ===
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`MOYENNE GÉNÉRALE : ${overallAverage.toFixed(2)}/20`, 50, rowY);
    rowY += 20;

    doc.fontSize(11);
    // Utiliser l'appréciation du conseil si elle existe, sinon générer automatiquement
    const finalAppreciation = councilAppreciation || generateAppreciation(overallAverage);
    doc.text(`Appréciation générale : ${finalAppreciation}`, 50, rowY);    
    rowY += 30;

    // === SIGNATURES ===
    doc.font('Helvetica').fontSize(10);
    doc.text('Le Chef d\'Établissement', 50, rowY);
    rowY += 50;

    // Date et lieu
    doc.text(`Fait le ${new Date().toLocaleDateString('fr-FR')}`, 50, rowY);

    // Finaliser le PDF
    doc.end();
  } catch (error) {
    console.error('Erreur génération bulletin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du bulletin',
    });
  }
}

// =========================
// GET /api/students/:studentId/report/data
// Retourne les données du bulletin en JSON (pour prévisualisation)
// =========================

export async function getStudentReportDataHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { studentId } = req.params;
    const { termId } = req.query;

    // Vérification des permissions
    const canAccess = 
      req.user.role === 'admin' ||
      req.user.role === 'staff' ||
      (req.user.role === 'student' && req.user.userId === studentId) ||
      req.user.role === 'parent';

    if (!canAccess) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    if (!termId) {
      res.status(400).json({ 
        success: false, 
        error: 'Le paramètre termId est requis' 
      });
      return;
    }

    const establishmentId = req.user.establishmentId || '18fdec95-29be-4d71-8669-21d67f3a4587';

    // Récupérer les infos de l'élève
    const studentQuery = `
      SELECT 
        u.id,
        u.full_name,
        sp.student_no,
        cl.label as class_label,
        en.academic_year
      FROM users u
      INNER JOIN student_profiles sp ON sp.user_id = u.id
      INNER JOIN enrollments en ON en.student_id = u.id AND en.end_date IS NULL
      INNER JOIN classes cl ON cl.id = en.class_id
      WHERE u.id = $1
    `;

    const studentResult = await pool.query(studentQuery, [studentId]);
    if (studentResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Élève non trouvé' });
      return;
    }

    const student = studentResult.rows[0];
    const term = await findTermById(termId as string, establishmentId);

    if (!term) {
      res.status(404).json({ success: false, error: 'Période non trouvée' });
      return;
    }



    // Récupérer les appréciations par matière (prof)
    const subjectAppreciationsQuery = `
      SELECT 
        sa.appreciation,
        c.id as course_id,
        s.name as subject_name
      FROM subject_appreciations sa
      INNER JOIN courses c ON c.id = sa.course_id
      INNER JOIN subjects s ON s.id = c.subject_id
      WHERE sa.student_id = $1 AND sa.term_id = $2
    `;
    const subjectAppreciationsResult = await pool.query(subjectAppreciationsQuery, [studentId, termId]);
    const subjectAppreciationsMap = new Map<string, string>();
    subjectAppreciationsResult.rows.forEach((row) => {
      subjectAppreciationsMap.set(row.subject_name, row.appreciation);
    });

    // Récupérer l'appréciation du conseil de classe
    const reportCardQuery = `
      SELECT council_appreciation
      FROM report_cards
      WHERE student_id = $1 AND term_id = $2
    `;
    const reportCardResult = await pool.query(reportCardQuery, [studentId, termId]);
    const councilAppreciation = reportCardResult.rows[0]?.council_appreciation || null;

    // Récupérer les notes pour cette période
    // Filtre par term_id direct OU par date si term_id est NULL
    const gradesQuery = `
      SELECT 
        g.normalized_value,
        g.absent,
        e.coefficient,
        s.name as subject_name,
        (
          SELECT AVG(g2.normalized_value)
          FROM grades g2
          WHERE g2.evaluation_id = e.id
          AND g2.absent = false
          AND g2.normalized_value IS NOT NULL
        ) as class_average
      FROM grades g
      INNER JOIN evaluations e ON e.id = g.evaluation_id
      INNER JOIN courses c ON c.id = e.course_id
      INNER JOIN subjects s ON s.id = c.subject_id
      WHERE g.student_id = $1
      AND (
        e.term_id = $2
        OR (e.term_id IS NULL AND e.eval_date >= $3 AND e.eval_date <= $4)
      )
      ORDER BY s.name
    `;

    const gradesResult = await pool.query(gradesQuery, [studentId, termId, term.start_date, term.end_date]);

    // Calculer les moyennes par matière
    const subjectsMap = new Map<string, { totalCoef: number; weightedSum: number; classAvgs: number[] }>();

    gradesResult.rows.forEach((grade) => {
      if (!subjectsMap.has(grade.subject_name)) {
        subjectsMap.set(grade.subject_name, { totalCoef: 0, weightedSum: 0, classAvgs: [] });
      }

      const subject = subjectsMap.get(grade.subject_name)!;

      if (!grade.absent && grade.normalized_value !== null) {
        const value = parseFloat(grade.normalized_value);
        const coef = parseFloat(grade.coefficient);
        subject.totalCoef += coef;
        subject.weightedSum += value * coef;
      }

      if (grade.class_average !== null) {
        subject.classAvgs.push(parseFloat(grade.class_average));
      }
    });

    const subjects: Array<{
      name: string;
      studentAverage: number;
      classAverage: number | null;
      appreciation: string;
    }> = [];

    let totalAvg = 0;
    let count = 0;

    subjectsMap.forEach((data, name) => {
      const avg = data.totalCoef > 0 ? data.weightedSum / data.totalCoef : 0;
      const classAvg = data.classAvgs.length > 0
        ? data.classAvgs.reduce((a, b) => a + b, 0) / data.classAvgs.length
        : null;

      if (data.totalCoef > 0) {
        totalAvg += avg;
        count++;
      }

      // Utiliser l'appréciation du prof si elle existe, sinon générer automatiquement
      const profAppreciation = subjectAppreciationsMap.get(name);

      subjects.push({
        name,
        studentAverage: parseFloat(avg.toFixed(2)),
        classAverage: classAvg !== null ? parseFloat(classAvg.toFixed(2)) : null,
        appreciation: profAppreciation || generateAppreciation(avg),
      });
    });

    const overallAverage = count > 0 ? totalAvg / count : 0;

    res.json({
      success: true,
      data: {
        student: {
          id: student.id,
          fullName: student.full_name,
          studentNo: student.student_no,
          classLabel: student.class_label,
          academicYear: student.academic_year,
        },
        term: {
          id: term.id,
          name: term.name,
          startDate: term.start_date,
          endDate: term.end_date,
        },
        subjects,
        overallAverage: parseFloat(overallAverage.toFixed(2)),
        overallAppreciation: councilAppreciation || generateAppreciation(overallAverage),      
      },
    });
  } catch (error) {
    console.error('Erreur récupération données bulletin:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des données du bulletin',
    });
  }
}