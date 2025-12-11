import { Request, Response } from 'express';
import { pool } from '../config/database';
import { findTermById } from '../models/term.model';
import { findReportCard } from '../models/reportCard.model';
import PDFDocument from 'pdfkit';
import { assertParentCanAccessStudent } from '../models/parent.model';

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

// Helper pour formater les nombres
function formatNumber(num: number | null, decimals: number = 2): string {
  if (num === null) return '-';
  return num.toFixed(decimals).replace('.', ',');
}

// Helper pour tronquer le texte avec ellipsis
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
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

    if (req.user.role !== 'student') {
      res.status(403).json({
        success: false,
        error: 'Cet endpoint est réservé aux élèves',
      });
      return;
    }

    const year = academicYear ? parseInt(academicYear as string) : new Date().getFullYear();
    const establishmentId = req.user.establishmentId;
    if (!establishmentId) {
      res.status(403).json({
        success: false,
        error: 'Aucun établissement associé à ce compte',
      });
      return;
    }

    let termInfo = null;
    if (termId) {
      termInfo = await findTermById(termId as string, establishmentId);
      if (!termInfo) {
        res.status(404).json({
          success: false,
          error: 'Période introuvable pour cet établissement',
        });
        return;
      }
    }

    console.log('[Reports] getStudentGradesSummary', {
      studentId,
      academicYear: year,
      termId: termId || null,
      establishmentId,
    });

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

    if (termId && termInfo) {
      gradesQuery += ` AND e.term_id = $${paramIndex}`;
      params.push(termId);
      paramIndex += 1;
    }

    gradesQuery += ` ORDER BY s.name ASC, e.eval_date DESC`;

    const gradesResult = await pool.query(gradesQuery, params);
    const grades = gradesResult.rows;

    console.log('[Reports] getStudentGradesSummary result', {
      studentId,
      termId: termId || null,
      rows: grades.length,
    });

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

      if (!grade.absent && grade.normalized_value !== null) {
        const normalizedValue = parseFloat(grade.normalized_value);
        const coefficient = parseFloat(grade.coefficient);
        subject.totalCoef += coefficient;
        subject.weightedSum += normalizedValue * coefficient;
      }

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

    const overallAverage = countSubjectsWithGrades > 0
      ? totalSubjectAverages / countSubjectsWithGrades
      : 0;

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
// FORMAT PROFESSIONNEL INSPIRÉ DU MODÈLE ESIEE
// =========================

export async function getStudentReportHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { studentId } = req.params;
    const rawTermId = req.query.termId;
    const termId =
      typeof rawTermId === 'string'
        ? rawTermId
        : Array.isArray(rawTermId)
        ? (rawTermId[0] as string | undefined)
        : undefined;

    const canAccess =
      req.user.role === 'admin' ||
      req.user.role === 'staff' ||
      (req.user.role === 'student' && req.user.userId === studentId) ||
      req.user.role === 'parent';

    if (!canAccess) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    if (req.user.role === 'parent') {
      try {
        await assertParentCanAccessStudent(req.user.userId, studentId, {
          requireCanViewGrades: true,
        });
      } catch (error) {
        res.status(403).json({ success: false, error: 'Accès refusé' });
        return;
      }
    }

    if (!termId) {
      res.status(400).json({
        success: false,
        error: 'Le paramètre termId est requis pour générer un bulletin',
      });
      return;
    }

    // Récupérer les infos de l'élève avec date de naissance
    const studentQuery = `
      SELECT 
        u.id,
        u.full_name,
        u.email,
        sp.student_no,
        sp.birthdate,
        cl.id as class_id,
        cl.label as class_label,
        cl.level as class_level,
        cl.academic_year,
        u.establishment_id
      FROM users u
      INNER JOIN student_profiles sp ON sp.user_id = u.id
      INNER JOIN students st ON st.user_id = u.id
      INNER JOIN classes cl ON cl.id = st.class_id
      WHERE u.id = $1
    `;

    const studentResult = await pool.query(studentQuery, [studentId]);
    if (studentResult.rows.length === 0) {
      res.status(404).json({ success: false, error: 'Élève non trouvé' });
      return;
    }

    const student = studentResult.rows[0];
    const studentEstablishmentId = student.establishment_id;

    if (!studentEstablishmentId) {
      res.status(403).json({
        success: false,
        error: 'Établissement élève introuvable',
      });
      return;
    }

    const requesterEstId = req.user.establishmentId;
    if (requesterEstId && requesterEstId !== studentEstablishmentId) {
      res.status(403).json({
        success: false,
        error: 'Accès refusé pour cet établissement',
      });
      return;
    }

    const effectiveEstablishmentId = studentEstablishmentId;

    const reportCard = await findReportCard(studentId, termId, effectiveEstablishmentId);
    if (!reportCard || !reportCard.validatedAt) {
      res.status(400).json({
        success: false,
        error: 'Le bulletin n\'a pas encore été validé.',
      });
      return;
    }

    // Récupérer les infos de l'établissement
    const establishmentQuery = `
      SELECT name, address, city, postal_code, email, phone, director_name, director_signature
      FROM establishments
      WHERE id = $1
    `;

    const establishmentResult = await pool.query(establishmentQuery, [effectiveEstablishmentId]);
    const establishment = establishmentResult.rows[0] || {
      name: 'Établissement',
      address: '',
      city: '',
      postal_code: '',
    };

    // Récupérer les infos de la période
    const term = await findTermById(termId, effectiveEstablishmentId);
    if (!term) {
      res.status(404).json({ success: false, error: 'Période non trouvée' });
      return;
    }

    // Récupérer les appréciations par matière
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
    const councilAppreciation = reportCard.councilAppreciation || null;

    // Récupérer les noms des professeurs par matière
    const teachersQuery = `
      SELECT DISTINCT
        s.name as subject_name,
        u.full_name as teacher_name
      FROM courses c
      INNER JOIN subjects s ON s.id = c.subject_id
      INNER JOIN users u ON u.id = c.teacher_id
      INNER JOIN evaluations e ON e.course_id = c.id
      INNER JOIN grades g ON g.evaluation_id = e.id
      WHERE g.student_id = $1
      AND (
        e.term_id = $2
        OR (e.term_id IS NULL AND e.eval_date >= $3 AND e.eval_date <= $4)
      )
    `;
    const teachersResult = await pool.query(teachersQuery, [studentId, termId, term.start_date, term.end_date]);
    const teachersMap = new Map<string, string>();
    teachersResult.rows.forEach((row) => {
      teachersMap.set(row.subject_name, row.teacher_name);
    });

    // Récupérer les notes avec stats de classe (min, max)
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
      AND (
        e.term_id = $2
        OR (e.term_id IS NULL AND e.eval_date >= $3 AND e.eval_date <= $4)
      )
      ORDER BY s.name
    `;

    const gradesResult = await pool.query(gradesQuery, [studentId, termId, term.start_date, term.end_date]);
    const grades = gradesResult.rows;

    // Calculer le rang de l'élève dans la classe
    const rankQuery = `
      WITH student_averages AS (
        SELECT 
          g.student_id,
          AVG(g.normalized_value) as average
        FROM grades g
        INNER JOIN evaluations e ON e.id = g.evaluation_id
        INNER JOIN enrollments en ON en.student_id = g.student_id AND en.end_date IS NULL
        WHERE en.class_id = $1
        AND g.absent = false
        AND g.normalized_value IS NOT NULL
        AND (
          e.term_id = $2
          OR (e.term_id IS NULL AND e.eval_date >= $3 AND e.eval_date <= $4)
        )
        GROUP BY g.student_id
      ),
      ranked AS (
        SELECT 
          student_id,
          average,
          RANK() OVER (ORDER BY average DESC) as rank
        FROM student_averages
      )
      SELECT rank, (SELECT COUNT(*) FROM student_averages) as total
      FROM ranked
      WHERE student_id = $5
    `;
    const rankResult = await pool.query(rankQuery, [student.class_id, termId, term.start_date, term.end_date, studentId]);
    const studentRank = rankResult.rows[0]?.rank || '-';
    const totalStudents = rankResult.rows[0]?.total || '-';

    // Grouper par matière et calculer les moyennes
    const subjectsMap = new Map<string, {
      name: string;
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
          name: grade.subject_name,
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

      if (!grade.absent && grade.normalized_value !== null) {
        const value = parseFloat(grade.normalized_value);
        const coef = parseFloat(grade.coefficient);
        subject.totalCoef += coef;
        subject.weightedSum += value * coef;
      }

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

    // Préparer les données du bulletin
    const reportSubjects: Array<{
      name: string;
      teacherName: string;
      studentAverage: number;
      classAverage: number | null;
      min: number | null;
      max: number | null;
      coefficient: number;
      appreciation: string;
    }> = [];

    let totalAverages = 0;
    let subjectCount = 0;
    let overallMin = Infinity;
    let overallMax = -Infinity;
    let classOverallAvg = 0;
    let classAvgCount = 0;

    subjectsMap.forEach((subject) => {
      const avg = subject.totalCoef > 0 ? subject.weightedSum / subject.totalCoef : 0;
      const classAvg = subject.classAverages.length > 0
        ? subject.classAverages.reduce((a, b) => a + b, 0) / subject.classAverages.length
        : null;
      const minGrade = subject.mins.length > 0 ? Math.min(...subject.mins) : null;
      const maxGrade = subject.maxs.length > 0 ? Math.max(...subject.maxs) : null;

      if (subject.totalCoef > 0) {
        totalAverages += avg;
        subjectCount++;
      }

      if (minGrade !== null && minGrade < overallMin) overallMin = minGrade;
      if (maxGrade !== null && maxGrade > overallMax) overallMax = maxGrade;
      if (classAvg !== null) {
        classOverallAvg += classAvg;
        classAvgCount++;
      }

      reportSubjects.push({
        name: subject.name,
        teacherName: teachersMap.get(subject.name) || '',
        studentAverage: parseFloat(avg.toFixed(2)),
        classAverage: classAvg !== null ? parseFloat(classAvg.toFixed(2)) : null,
        min: minGrade !== null ? parseFloat(minGrade.toFixed(2)) : null,
        max: maxGrade !== null ? parseFloat(maxGrade.toFixed(2)) : null,
        coefficient: subject.totalCoef,
        appreciation: subjectAppreciationsMap.get(subject.name) || generateAppreciation(avg),
      });
    });

    const overallAverage = subjectCount > 0 ? totalAverages / subjectCount : 0;
    const classGeneralAverage = classAvgCount > 0 ? classOverallAvg / classAvgCount : null;

    // ========================================
    // GÉNÉRATION DU PDF - FORMAT PROFESSIONNEL
    // ========================================

    const doc = new PDFDocument({
      margin: 40,
      size: 'A4',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bulletin_${student.full_name.replace(/\s+/g, '_')}_${term.name.replace(/\s+/g, '_')}.pdf"`
    );

    doc.pipe(res);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const margin = 40;
    const contentWidth = pageWidth - (margin * 2);

    // === EN-TÊTE ===
    doc.fontSize(14).font('Helvetica-Bold').text(establishment.name, margin, margin, { align: 'center', width: contentWidth });

    if (establishment.address) {
      doc.fontSize(9).font('Helvetica').text(
        `${establishment.address}`,
        margin, doc.y + 2,
        { align: 'center', width: contentWidth }
      );
      doc.text(
        `${establishment.postal_code} ${establishment.city}`,
        margin, doc.y,
        { align: 'center', width: contentWidth }
      );
    }

    doc.moveDown(0.5);

    // Titre avec année scolaire et semestre
    doc.fontSize(10).font('Helvetica-Bold').text(
      `${student.academic_year}-${student.academic_year + 1} - ${term.name}`,
      margin, doc.y,
      { align: 'center', width: contentWidth }
    );

    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica-Bold').text(
      student.class_label.toUpperCase(),
      margin, doc.y,
      { align: 'center', width: contentWidth }
    );

    doc.moveDown(0.8);

    // === INFORMATIONS ÉLÈVE (gauche) et ABSENCES (droite) ===
    const infoY = doc.y;
    const leftColX = margin;
    const rightColX = pageWidth / 2 + 20;

    // Colonne gauche - Infos élève
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text(student.full_name.toUpperCase(), leftColX, infoY);

    doc.fontSize(9).font('Helvetica');
    if (student.birthdate) {
      doc.text(`Né(e) le : ${new Date(student.birthdate).toLocaleDateString('fr-FR')}`, leftColX, doc.y + 2);
    }
    doc.text(`N° Élève : ${student.student_no || 'N/A'}`, leftColX, doc.y + 2);

    // Colonne droite - Absences (placeholder - à implémenter avec vraies données)
    doc.fontSize(9).font('Helvetica');
    doc.text('Absences justifiées :', rightColX, infoY);
    doc.text('00h00', rightColX + 100, infoY);

    doc.text('Absences injustifiées :', rightColX, infoY + 12);
    doc.text('00h00', rightColX + 100, infoY + 12);

    doc.text('Retards :', rightColX, infoY + 24);
    doc.text('00h00', rightColX + 100, infoY + 24);

    doc.moveDown(2);

    // === TABLEAU DES NOTES ===
    const tableTop = doc.y + 10;

    // Définition des colonnes
    const colWidths = {
      matiere: 150,
      eleve: 45,
      rang: 35,
      classe: 45,
      min: 35,
      max: 35,
      appreciation: 165,
    };

    const colX = {
      matiere: margin,
      eleve: margin + colWidths.matiere,
      rang: margin + colWidths.matiere + colWidths.eleve,
      classe: margin + colWidths.matiere + colWidths.eleve + colWidths.rang,
      min: margin + colWidths.matiere + colWidths.eleve + colWidths.rang + colWidths.classe,
      max: margin + colWidths.matiere + colWidths.eleve + colWidths.rang + colWidths.classe + colWidths.min,
      appreciation: margin + colWidths.matiere + colWidths.eleve + colWidths.rang + colWidths.classe + colWidths.min + colWidths.max,
    };

    // En-tête du tableau
    const headerHeight = 30;

    // Fond gris clair pour l'en-tête
    doc.fillColor('#e6e6e6')
      .rect(margin, tableTop, contentWidth, headerHeight)
      .fill();

    doc.fillColor('#000000');
    doc.fontSize(8).font('Helvetica-Bold');

    // Première ligne d'en-tête
    doc.text('Matières', colX.matiere + 3, tableTop + 4, { width: colWidths.matiere - 6 });

    // Sous-en-tête "Moyennes"
    doc.text('Moyennes', colX.eleve, tableTop + 2, { width: colWidths.eleve + colWidths.rang + colWidths.classe + colWidths.min + colWidths.max, align: 'center' });

    doc.text('Appréciations', colX.appreciation + 3, tableTop + 4, { width: colWidths.appreciation - 6, align: 'center' });

    // Deuxième ligne d'en-tête
    doc.fontSize(7).font('Helvetica');
    const headerRow2Y = tableTop + 15;
    doc.text('Élève', colX.eleve, headerRow2Y, { width: colWidths.eleve, align: 'center' });
    doc.text('Rang', colX.rang, headerRow2Y, { width: colWidths.rang, align: 'center' });
    doc.text('Classe', colX.classe, headerRow2Y, { width: colWidths.classe, align: 'center' });
    doc.text('Min', colX.min, headerRow2Y, { width: colWidths.min, align: 'center' });
    doc.text('Max', colX.max, headerRow2Y, { width: colWidths.max, align: 'center' });

    // Lignes du tableau
    let rowY = tableTop + headerHeight;
    const rowHeight = 35;

    reportSubjects.forEach((subject, index) => {
      // Vérifier si on dépasse la page
      if (rowY + rowHeight > pageHeight - 150) {
        doc.addPage();
        rowY = margin;
      }

      // Alternance de couleurs
      if (index % 2 === 0) {
        doc.fillColor('#f9f9f9')
          .rect(margin, rowY, contentWidth, rowHeight)
          .fill();
      }

      doc.fillColor('#000000');

      // Nom de la matière
      doc.fontSize(8).font('Helvetica-Bold');
      doc.text(subject.name, colX.matiere + 3, rowY + 5, { width: colWidths.matiere - 6 });

      // Nom du professeur
      if (subject.teacherName) {
        doc.fontSize(7).font('Helvetica');
        doc.text(subject.teacherName, colX.matiere + 3, rowY + 16, { width: colWidths.matiere - 6 });
      }

      // Moyenne élève
      doc.fontSize(8).font('Helvetica');
      doc.text(formatNumber(subject.studentAverage), colX.eleve, rowY + 12, { width: colWidths.eleve, align: 'center' });

      // Rang (placeholder - à calculer par matière si nécessaire)
      doc.text('-', colX.rang, rowY + 12, { width: colWidths.rang, align: 'center' });

      // Moyenne classe
      doc.text(formatNumber(subject.classAverage), colX.classe, rowY + 12, { width: colWidths.classe, align: 'center' });

      // Min
      doc.text(formatNumber(subject.min), colX.min, rowY + 12, { width: colWidths.min, align: 'center' });

      // Max
      doc.text(formatNumber(subject.max), colX.max, rowY + 12, { width: colWidths.max, align: 'center' });

      // Appréciation (texte qui peut être long)
      doc.fontSize(7).font('Helvetica');
      doc.text(subject.appreciation, colX.appreciation + 3, rowY + 5, {
        width: colWidths.appreciation - 6,
        height: rowHeight - 8,
        ellipsis: true,
      });

      rowY += rowHeight;
    });

    // Ligne de moyenne générale
    doc.fillColor('#d9e6f2')
      .rect(margin, rowY, contentWidth, 25)
      .fill();

    doc.fillColor('#000000');
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Moyenne générale', colX.matiere + 3, rowY + 8);
    doc.text(formatNumber(overallAverage), colX.eleve, rowY + 8, { width: colWidths.eleve, align: 'center' });
    doc.text(`${studentRank}`, colX.rang, rowY + 8, { width: colWidths.rang, align: 'center' });
    doc.text(formatNumber(classGeneralAverage), colX.classe, rowY + 8, { width: colWidths.classe, align: 'center' });
    doc.text(overallMin !== Infinity ? formatNumber(overallMin) : '-', colX.min, rowY + 8, { width: colWidths.min, align: 'center' });
    doc.text(overallMax !== -Infinity ? formatNumber(overallMax) : '-', colX.max, rowY + 8, { width: colWidths.max, align: 'center' });

    rowY += 35;

    // === APPRÉCIATION GÉNÉRALE ET SIGNATURE ===
    const bottomSectionY = rowY + 10;

    // Titre appréciation
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('APPRÉCIATION DU CONSEIL DE CLASSE', margin, bottomSectionY, { underline: true });

    // Texte appréciation (gauche)
    doc.fontSize(9).font('Helvetica');
    const appreciationText = councilAppreciation || generateAppreciation(overallAverage);
    doc.text(appreciationText, margin, bottomSectionY + 18, {
      width: contentWidth / 2 - 20,
      height: 60,
    });

    // Section signature (droite)
    const signatureX = pageWidth / 2 + 30;
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text('Cachet et signature', signatureX, bottomSectionY, { align: 'center', width: contentWidth / 2 - 40 });

    // Signature du directeur
    let signatureY = bottomSectionY + 20;

    if (establishment.director_signature) {
      try {
        const signatureBuffer = Buffer.from(
          establishment.director_signature.replace(/^data:image\/\w+;base64,/, ''),
          'base64'
        );
        doc.image(signatureBuffer, signatureX + 30, signatureY, { width: 80, height: 40 });
        signatureY += 45;
      } catch (err) {
        console.error('Erreur chargement signature:', err);
      }
    }

    // Nom du directeur
    if (establishment.director_name) {
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(establishment.director_name, signatureX, signatureY, {
        width: contentWidth / 2 - 40,
        align: 'center',
      });
    }

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
// Retourne les données du bulletin en JSON
// =========================

export async function getStudentReportDataHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { studentId } = req.params;
    const { termId } = req.query;

    const canAccess =
      req.user.role === 'admin' ||
      req.user.role === 'staff' ||
      (req.user.role === 'student' && req.user.userId === studentId) ||
      req.user.role === 'parent';

    if (!canAccess) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    if (req.user.role === 'parent') {
      try {
        await assertParentCanAccessStudent(req.user.userId, studentId, {
          requireCanViewGrades: true,
        });
      } catch (error) {
        res.status(403).json({ success: false, error: 'Accès refusé' });
        return;
      }
    }
    if (!termId) {
      res.status(400).json({
        success: false,
        error: 'Le paramètre termId est requis',
      });
      return;
    }

    const establishmentId = req.user.establishmentId;
    if (!establishmentId) {
      res.status(403).json({
        success: false,
        error: 'Aucun établissement associé à ce compte',
      });
      return;
    }

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

    // Récupérer les appréciations par matière
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
