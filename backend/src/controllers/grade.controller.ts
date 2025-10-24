import { pool } from '../config/database';
import { Request, Response } from 'express';
import {
  createEvaluation,
  findEvaluations,
  findEvaluationById,
  findTeacherEvaluations,
  updateEvaluation,
  deleteEvaluation,
  getEvaluationStats,
  canTeacherModifyEvaluation,
} from '../models/evaluation.model';
import {
  createGrade,
  createGrades,
  findGrades,
  findGradeById,
  findStudentGrades,
  findEvaluationGrades,
  updateGrade,
  deleteGrade,
  getGradeHistory,
  getStudentAverages,
  getStudentOverallAverage,
  getClassAverages,
  getChildrenGrades,
} from '../models/grade.model';
import { UserRole } from '../types';

// =========================
// EVALUATIONS - Pour Professeurs
// =========================

/**
 * POST /api/grades/evaluations
 * Crée une nouvelle évaluation
 */
export async function createEvaluationHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const {
      courseId,
      termId,
      title,
      type,
      coefficient,
      maxScale,
      evalDate,
      description,
    } = req.body;

    // Validation
    if (!courseId || !title || !type || !coefficient || !evalDate) {
      res.status(400).json({
        success: false,
        error: 'Données manquantes',
        required: ['courseId', 'title', 'type', 'coefficient', 'evalDate'],
      });
      return;
    }

    // Créer l'évaluation
    const evaluation = await createEvaluation({
      courseId,
      termId,
      title,
      type,
      coefficient,
      maxScale: maxScale || 20,
      evalDate: new Date(evalDate),
      description,
      createdBy: req.user.userId,
      establishmentId: req.user.establishmentId,
    });

    res.status(201).json({
      success: true,
      message: 'Évaluation créée avec succès',
      data: evaluation,
    });
  } catch (error) {
    console.error('Erreur création évaluation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'évaluation',
    });
  }
}

/**
 * GET /api/grades/evaluations
 * Liste les évaluations du professeur
 */
export async function getTeacherEvaluationsHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { courseId, termId, type, startDate, endDate } = req.query;

    const filters = {
      courseId: courseId as string,
      termId: termId as string,
      type: type as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      establishmentId: req.user.establishmentId,
    };

    let evaluations;
    
    if (req.user.role === 'teacher') {
      evaluations = await findTeacherEvaluations(req.user.userId, filters);
    } else if (req.user.role === 'admin' || req.user.role === 'responsable') {
      evaluations = await findEvaluations(filters);
    } else {
      res.status(403).json({ success: false, error: 'Accès refusé' });
      return;
    }

    // ✅ CORRECTION : Mapper snake_case vers camelCase
    const mappedEvaluations = evaluations.map(evaluation => ({
      id: evaluation.id,
      courseId: evaluation.course_id,
      termId: evaluation.term_id,
      title: evaluation.title,
      type: evaluation.type,
      coefficient: evaluation.coefficient,
      maxScale: evaluation.max_scale,
      evalDate: evaluation.eval_date,
      description: evaluation.description,
      createdBy: evaluation.created_by,
      createdAt: evaluation.created_at,
      establishmentId: evaluation.establishment_id
    }));

    res.json({
      success: true,
      data: mappedEvaluations,
    });
  } catch (error) {
    console.error('Erreur récupération évaluations:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des évaluations',
    });
  }
}

/**
 * GET /api/grades/evaluations/:id
 * Détails d'une évaluation avec toutes les notes
 */
export async function getEvaluationDetailsHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { id } = req.params;

    // Récupérer l'évaluation
    const evaluation = await findEvaluationById(id, req.user.establishmentId);
    
    if (!evaluation) {
      res.status(404).json({
        success: false,
        error: 'Évaluation non trouvée',
      });
      return;
    }

    // Vérifier les permissions
    if (req.user.role === 'teacher') {
      const canModify = await canTeacherModifyEvaluation(id, req.user.userId, req.user.establishmentId);
      if (!canModify) {
        res.status(403).json({
          success: false,
          error: 'Vous ne pouvez consulter que vos propres évaluations',
        });
        return;
      }
    }

    // Récupérer les notes de cette évaluation
    const grades = await findEvaluationGrades(id);

    // Récupérer les statistiques
    const stats = await getEvaluationStats(id, req.user.establishmentId);

    res.json({
      success: true,
      data: {
        evaluation,
        grades,
        stats,
      },
    });
  } catch (error) {
    console.error('Erreur récupération détails évaluation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'évaluation',
    });
  }
}

/**
 * PUT /api/grades/evaluations/:id
 * Modifie une évaluation
 */
export async function updateEvaluationHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { id } = req.params;

    // Vérifier les permissions
    if (req.user.role === 'teacher') {
      const canModify = await canTeacherModifyEvaluation(id, req.user.userId, req.user.establishmentId);
      if (!canModify) {
        res.status(403).json({
          success: false,
          error: 'Vous ne pouvez modifier que vos propres évaluations',
        });
        return;
      }
    }

    const updatedEvaluation = await updateEvaluation(
      id,
      req.body,
      req.user.establishmentId
    );

    if (!updatedEvaluation) {
      res.status(404).json({
        success: false,
        error: 'Évaluation non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Évaluation modifiée avec succès',
      data: updatedEvaluation,
    });
  } catch (error) {
    console.error('Erreur modification évaluation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification de l\'évaluation',
    });
  }
}

/**
 * DELETE /api/grades/evaluations/:id
 * Supprime une évaluation
 */
export async function deleteEvaluationHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { id } = req.params;

    // Vérifier les permissions
    if (req.user.role === 'teacher') {
      const canModify = await canTeacherModifyEvaluation(id, req.user.userId, req.user.establishmentId);
      if (!canModify) {
        res.status(403).json({
          success: false,
          error: 'Vous ne pouvez supprimer que vos propres évaluations',
        });
        return;
      }
    }

    const deleted = await deleteEvaluation(id, req.user.establishmentId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Évaluation non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Évaluation supprimée avec succès',
    });
  } catch (error) {
    console.error('Erreur suppression évaluation:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'évaluation',
    });
  }
}

// =========================
// NOTES - Saisie et Modification
// =========================

/**
 * POST /api/grades
 * Crée ou met à jour des notes en batch
 */
export async function createOrUpdateGradesHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { evaluationId, grades } = req.body;

    if (!evaluationId || !Array.isArray(grades) || grades.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Données manquantes ou invalides',
      });
      return;
    }

    // Vérifier que l'évaluation existe et que le prof y a accès
    if (req.user.role === 'teacher') {
      const canModify = await canTeacherModifyEvaluation(
        evaluationId,
        req.user.userId,
        req.user.establishmentId
      );
      
      if (!canModify) {
        res.status(403).json({
          success: false,
          error: 'Vous ne pouvez saisir des notes que pour vos propres évaluations',
        });
        return;
      }
    }

    // Préparer les données de notes
    const gradeData = grades.map(g => ({
      evaluationId,
      studentId: g.studentId,
      value: g.value,
      absent: g.absent || false,
      comment: g.comment,
      createdBy: req.user!.userId,
    }));

    // Créer ou mettre à jour les notes
    const createdGrades = await createGrades(gradeData);

    res.status(201).json({
      success: true,
      message: `${createdGrades.length} note(s) enregistrée(s)`,
      data: createdGrades,
    });
  } catch (error) {
    console.error('Erreur création notes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la saisie des notes',
    });
  }
}

/**
 * PUT /api/grades/:id
 * Modifie une note individuelle
 */
export async function updateGradeHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { id } = req.params;
    const { value, absent, comment } = req.body;

    // Récupérer la note pour vérifier les permissions
    const grade = await findGradeById(id);
    
    if (!grade) {
      res.status(404).json({
        success: false,
        error: 'Note non trouvée',
      });
      return;
    }

    // Vérifier les permissions
    if (req.user.role === 'teacher') {
      const canModify = await canTeacherModifyEvaluation(
        grade.evaluation_id,
        req.user.userId,
        req.user.establishmentId
      );
      
      if (!canModify) {
        res.status(403).json({
          success: false,
          error: 'Vous ne pouvez modifier que vos propres notes',
        });
        return;
      }
    }

    // Mettre à jour la note
    const updatedGrade = await updateGrade(
      id,
      { value, absent, comment },
      req.user.userId,
      req.user.role as UserRole
    );

    if (!updatedGrade) {
      res.status(404).json({
        success: false,
        error: 'Note non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Note modifiée avec succès',
      data: updatedGrade,
    });
  } catch (error) {
    console.error('Erreur modification note:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la modification de la note',
    });
  }
}

/**
 * DELETE /api/grades/:id
 * Supprime une note
 */
export async function deleteGradeHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { id } = req.params;

    // Récupérer la note pour vérifier les permissions
    const grade = await findGradeById(id);
    
    if (!grade) {
      res.status(404).json({
        success: false,
        error: 'Note non trouvée',
      });
      return;
    }

    // Vérifier les permissions
    if (req.user.role === 'teacher') {
      const canModify = await canTeacherModifyEvaluation(
        grade.evaluation_id,
        req.user.userId,
        req.user.establishmentId
      );
      
      if (!canModify) {
        res.status(403).json({
          success: false,
          error: 'Vous ne pouvez supprimer que vos propres notes',
        });
        return;
      }
    }

    const deleted = await deleteGrade(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Note non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Note supprimée avec succès',
    });
  } catch (error) {
    console.error('Erreur suppression note:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la note',
    });
  }
}

/**
 * GET /api/grades/:id
 * Récupère les détails complets d'une note
 */
export async function getGradeByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { id } = req.params;

    const grade = await findGradeById(id);

    if (!grade) {
      res.status(404).json({
        success: false,
        error: 'Note non trouvée',
      });
      return;
    }

    res.json({
      success: true,
      data: grade,
    });
  } catch (error) {
    console.error('Erreur récupération note:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la note',
    });
  }
}

/**
 * GET /api/grades/:id/history
 * Récupère l'historique d'une note
 */
export async function getGradeHistoryHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { id } = req.params;

    const history = await getGradeHistory(id);

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Erreur récupération historique:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
    });
  }
}

// =========================
// NOTES - Consultation Élève
// =========================

/**
 * ✅ FONCTION CORRIGÉE - GET /api/grades/student/:studentId
 * Récupère les notes d'un élève avec MAPPING COMPLET en camelCase
 */
export async function getStudentGradesHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { studentId } = req.params;
    const { termId, courseId } = req.query;

    console.log('[API] getStudentGradesHandler called');
    console.log('[API] studentId:', studentId);
    console.log('[API] req.user:', req.user);

    // Vérifier les permissions
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      res.status(403).json({
        success: false,
        error: 'Vous ne pouvez consulter que vos propres notes',
      });
      return;
    }

    // Pour les responsables, vérifier que c'est bien leur enfant
    if (req.user.role === 'responsable') {
      const childrenGrades = await getChildrenGrades(req.user.userId);
      const isParent = childrenGrades.some(g => g.student_id === studentId);
      
      if (!isParent) {
        res.status(403).json({
          success: false,
          error: 'Vous ne pouvez consulter que les notes de vos enfants',
        });
        return;
      }
    }

    const filters = {
      studentId,
      termId: termId as string,
      courseId: courseId as string,
      establishmentId: req.user.establishmentId,
    };

    // ✅ Récupérer les notes avec toutes les infos
    const grades = await findStudentGrades(studentId, filters);

    console.log('[API] Grades found:', grades.length);
    console.log('[API] First grade sample:', grades[0]);

    // ✅ MAPPER les données snake_case vers camelCase pour le frontend
    const mappedGrades = grades.map(grade => ({
      // Identifiants
      id: grade.id,
      evaluationId: grade.evaluation_id,
      studentId: grade.student_id,
      
      // Informations de l'évaluation
      evaluationTitle: grade.evaluation_title,
      evaluationType: grade.evaluation_type,
      
      // Informations de la matière
      subjectName: grade.subject_name,
      subjectCode: grade.subject_code,
      
      // Note de l'élève
      value: grade.value,
      absent: grade.absent,
      coefficient: grade.coefficient,
      maxScale: grade.max_scale,
      normalizedValue: grade.normalized_value,
      evalDate: grade.eval_date,
      comment: grade.comment,
      
      // Statistiques de classe
      classAverage: grade.class_average ? parseFloat(grade.class_average) : undefined,
      classMin: grade.class_min ? parseFloat(grade.class_min) : undefined,
      classMax: grade.class_max ? parseFloat(grade.class_max) : undefined,
      
      // Dates
      createdAt: grade.created_at,
      updatedAt: grade.updated_at,
    }));

    console.log('[API] Mapped grades sample:', mappedGrades[0]);

    res.json({
      success: true,
      data: {
        student: {
          id: studentId,
          fullName: grades[0]?.student_name || 'Étudiant',
        },
        grades: mappedGrades,
      },
    });
  } catch (error) {
    console.error('[API] Erreur récupération notes élève:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des notes',
    });
  }
}

/**
 * GET /api/grades/student/:studentId/averages
 * Récupère les moyennes d'un élève
 */
export async function getStudentAveragesHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { studentId } = req.params;
    const { termId } = req.query;

    // Vérifier les permissions (même logique que getStudentGrades)
    if (req.user.role === 'student' && req.user.userId !== studentId) {
      res.status(403).json({
        success: false,
        error: 'Vous ne pouvez consulter que vos propres moyennes',
      });
      return;
    }

    const averages = await getStudentAverages(
      studentId,
      termId as string,
      req.user.establishmentId
    );

    const overallAverage = await getStudentOverallAverage(
      studentId,
      termId as string,
      req.user.establishmentId
    );

    res.json({
      success: true,
      data: {
        averages: {
          general: overallAverage,
          bySubject: averages.reduce((acc, avg) => {
            if (avg.subject_name) {
              acc[avg.subject_name] = avg.weighted_average;
            }
          return acc;
        }, {} as Record<string, number>),
        },
        details: averages,
      },
    });
  } catch (error) {
    console.error('Erreur calcul moyennes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul des moyennes',
    });
  }
}

// =========================
// NOTES - Pour responsables
// =========================

/**
 * GET /api/grades/children
 * Récupère les notes des enfants d'un responsable
 */
export async function getChildrenGradesHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    if (req.user.role !== 'responsable') {
      res.status(403).json({
        success: false,
        error: 'Cette fonctionnalité est réservée aux responsables',
      });
      return;
    }

    const { termId, studentId } = req.query;

    const filters = {
      termId: termId as string,
      studentId: studentId as string,
      establishmentId: req.user.establishmentId,
    };

    const grades = await getChildrenGrades(req.user.userId, filters);

    // Grouper les notes par enfant
    const gradesByStudent = grades.reduce((acc, grade) => {
      if (!acc[grade.student_id]) {
        acc[grade.student_id] = {
          student: {
            id: grade.student_id,
            name: grade.student_name,
          },
          grades: [],
        };
      }
      acc[grade.student_id].grades.push(grade);
      return acc;
    }, {} as Record<string, any>);

    res.json({
      success: true,
      data: Object.values(gradesByStudent),
    });
  } catch (error) {
    console.error('Erreur récupération notes enfants:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des notes',
    });
  }
}

// =========================
// NOTES - Pour un cours
// =========================

/**
 * GET /api/grades/course/:courseId
 * Récupère toutes les notes d'un cours
 */
export async function getCourseGradesHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { courseId } = req.params;
    const { evaluationId } = req.query;

    const filters = {
      courseId,
      evaluationId: evaluationId as string,
      establishmentId: req.user.establishmentId,
    };

    const grades = await findGrades(filters);

    res.json({
      success: true,
      data: grades,
    });
  } catch (error) {
    console.error('Erreur récupération notes cours:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des notes du cours',
    });
  }
}

/**
 * GET /api/grades/course/:courseId/students
 * Récupère tous les élèves d'un cours avec leurs notes pour une évaluation
 */
export async function getCourseStudentsWithGrades(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { courseId } = req.params;
    const { evaluationId } = req.query;

    // Récupérer tous les élèves inscrits dans la classe du cours
    const query = `
      SELECT 
        u.id as student_id,
        u.full_name as student_name,
        sp.student_no,
        g.id as grade_id,
        g.value,
        g.absent,
        g.comment
      FROM courses c
      INNER JOIN classes cl ON cl.id = c.class_id
      INNER JOIN enrollments enr ON enr.class_id = cl.id AND enr.end_date IS NULL
      INNER JOIN users u ON u.id = enr.student_id AND u.role = 'student' AND u.active = TRUE
      INNER JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN grades g ON g.student_id = u.id AND g.evaluation_id = $2
      WHERE c.id = $1
      ORDER BY u.full_name ASC
    `;

    const result = await pool.query(query, [courseId, evaluationId || null]);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur récupération élèves:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des élèves',
    });
  }
}

// =========================
// STATISTIQUES - Moyennes de classe
// =========================

/**
 * GET /api/grades/class/:classId/averages
 * Récupère les moyennes d'une classe
 */
export async function getClassAveragesHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Non authentifié' });
      return;
    }

    const { classId } = req.params;
    const { termId } = req.query;

    const averages = await getClassAverages(
      classId,
      termId as string,
      req.user.establishmentId
    );

    res.json({
      success: true,
      data: averages,
    });
  } catch (error) {
    console.error('Erreur calcul moyennes classe:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du calcul des moyennes de classe',
    });
  }
}