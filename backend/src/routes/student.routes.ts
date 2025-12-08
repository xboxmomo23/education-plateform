import { Router } from 'express';
import { param, query } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';
import {
  getStudentGradesSummaryHandler,
  getStudentReportHandler,
  getStudentReportDataHandler,
} from '../controllers/report.controller';

const router = Router();

// =========================
// ROUTES - Synthèse des notes élève
// =========================

/**
 * GET /api/students/me/grades/summary
 * Récupère la synthèse des notes de l'élève connecté
 * 
 * Query params:
 * - academicYear: number (optionnel, défaut = année en cours)
 * - termId: UUID (optionnel, si absent = année complète)
 * 
 * Accès : student uniquement (pour ses propres notes)
 */
router.get(
  '/me/grades/summary',
  authenticate,
  authorize('student'),
  query('academicYear').optional().isInt({ min: 2020, max: 2100 }),
  query('termId').optional().isUUID(),
  validateRequest,
  getStudentGradesSummaryHandler
);

/**
 * GET /api/students/:studentId/grades/summary
 * Récupère la synthèse des notes d'un élève spécifique
 * 
 * Accès : admin, staff, parent (de l'élève), ou l'élève lui-même
 */
router.get(
  '/:studentId/grades/summary',
  authenticate,
  param('studentId').isUUID(),
  query('academicYear').optional().isInt({ min: 2020, max: 2100 }),
  query('termId').optional().isUUID(),
  validateRequest,
  async (req, res) => {
    // Vérification des permissions
    const canAccess = 
      req.user?.role === 'admin' ||
      req.user?.role === 'staff' ||
      (req.user?.role === 'student' && req.user.userId === req.params.studentId) ||
      req.user?.role === 'parent'; // TODO: vérifier le lien parent-élève

    if (!canAccess) {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    // Modifier temporairement le user pour réutiliser le handler
    const originalUserId = req.user!.userId;
    req.user!.userId = req.params.studentId;
    
    // Appeler le handler de synthèse (qui vérifie que c'est un student)
    // On bypass la vérification du rôle pour permettre l'accès admin/staff
    const { pool } = require('../config/database');
    const { findTermById } = require('../models/term.model');
    
    try {
      const studentId = req.params.studentId;
      const { academicYear, termId } = req.query;

      const year = academicYear ? parseInt(academicYear as string) : new Date().getFullYear();
      const establishmentId = req.user!.establishmentId;
      if (!establishmentId) {
        res.status(403).json({
          success: false,
          error: "Aucun établissement associé à ce compte",
        });
        return;
      }

      let termInfo = null;
      if (termId) {
        termInfo = await findTermById(termId as string, establishmentId);
      }

      // Construire la requête SQL
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
        AND c.academic_year = $2
      `;

      const params: any[] = [studentId, year];
      if (termId) {
        gradesQuery += ` AND e.term_id = $3`;
        params.push(termId);
      }

      gradesQuery += ` ORDER BY s.name ASC, e.eval_date DESC`;

      const gradesResult = await pool.query(gradesQuery, params);
      const grades = gradesResult.rows;

      // Grouper et calculer (même logique que dans report.controller.ts)
      const subjectsMap = new Map();
      
      grades.forEach((grade: any) => {
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

        const subject = subjectsMap.get(grade.subject_id);
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

      const subjects: any[] = [];
      let totalSubjectAverages = 0;
      let countSubjectsWithGrades = 0;

      const generateAppreciation = (avg: number) => {
        if (avg >= 16) return 'Excellent travail';
        if (avg >= 14) return 'Très bon travail';
        if (avg >= 12) return 'Bon travail';
        if (avg >= 10) return 'Travail satisfaisant';
        if (avg >= 8) return 'Travail insuffisant';
        return 'Travail très insuffisant';
      };

      subjectsMap.forEach((subject: any) => {
        const studentAverage = subject.totalCoef > 0 
          ? subject.weightedSum / subject.totalCoef 
          : 0;

        const classAverage = subject.classAverages.length > 0
          ? subject.classAverages.reduce((a: number, b: number) => a + b, 0) / subject.classAverages.length
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
          coefTotal: subject.grades.reduce((sum: number, g: any) => sum + parseFloat(g.coefficient), 0),
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

      const evaluations = grades.map((grade: any) => ({
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

      res.json({
        success: true,
        data: {
          term: termInfo ? {
            id: termInfo.id,
            name: termInfo.name,
            startDate: termInfo.start_date,
            endDate: termInfo.end_date,
          } : null,
          overallAverage: parseFloat(overallAverage.toFixed(2)),
          overallAppreciation: generateAppreciation(overallAverage),
          subjects: subjects.sort((a: any, b: any) => a.subjectName.localeCompare(b.subjectName)),
          evaluations,
        },
      });
    } catch (error) {
      console.error('Erreur récupération synthèse notes:', error);
      res.status(500).json({
        success: false,
        error: 'Erreur lors de la récupération de la synthèse des notes',
      });
    }
  }
);

// =========================
// ROUTES - Bulletins
// =========================

/**
 * GET /api/students/:studentId/report
 * Génère et télécharge un bulletin PDF
 * 
 * Query params:
 * - termId: UUID (requis)
 * 
 * Accès : admin, staff, parent (de l'élève), ou l'élève lui-même
 */
router.get(
  '/:studentId/report',
  authenticate,
  param('studentId').isUUID(),
  query('termId').isUUID().withMessage('termId est requis'),
  validateRequest,
  getStudentReportHandler
);

/**
 * GET /api/students/:studentId/report/data
 * Récupère les données du bulletin en JSON (pour prévisualisation)
 * 
 * Query params:
 * - termId: UUID (requis)
 * 
 * Accès : admin, staff, parent (de l'élève), ou l'élève lui-même
 */
router.get(
  '/:studentId/report/data',
  authenticate,
  param('studentId').isUUID(),
  query('termId').isUUID().withMessage('termId est requis'),
  validateRequest,
  getStudentReportDataHandler
);

export default router;
