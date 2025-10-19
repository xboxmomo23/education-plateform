"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvaluationHandler = createEvaluationHandler;
exports.getTeacherEvaluationsHandler = getTeacherEvaluationsHandler;
exports.getEvaluationDetailsHandler = getEvaluationDetailsHandler;
exports.updateEvaluationHandler = updateEvaluationHandler;
exports.deleteEvaluationHandler = deleteEvaluationHandler;
exports.createOrUpdateGradesHandler = createOrUpdateGradesHandler;
exports.updateGradeHandler = updateGradeHandler;
exports.deleteGradeHandler = deleteGradeHandler;
exports.getGradeByIdHandler = getGradeByIdHandler;
exports.getGradeHistoryHandler = getGradeHistoryHandler;
exports.getStudentGradesHandler = getStudentGradesHandler;
exports.getStudentAveragesHandler = getStudentAveragesHandler;
exports.getChildrenGradesHandler = getChildrenGradesHandler;
exports.getCourseGradesHandler = getCourseGradesHandler;
exports.getClassAveragesHandler = getClassAveragesHandler;
const database_1 = require("../config/database"); // ✅ Ajoute cet import
const evaluation_model_1 = require("../models/evaluation.model");
const grade_model_1 = require("../models/grade.model");
// =========================
// EVALUATIONS - Pour Professeurs
// =========================
/**
 * POST /api/grades/evaluations
 * Crée une nouvelle évaluation
 */
async function createEvaluationHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { courseId, termId, title, type, coefficient, maxScale, evalDate, description, } = req.body;
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
        const evaluation = await (0, evaluation_model_1.createEvaluation)({
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
    }
    catch (error) {
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
async function getTeacherEvaluationsHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { courseId, termId, type, startDate, endDate } = req.query;
        const filters = {
            courseId: courseId,
            termId: termId,
            type: type,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            establishmentId: req.user.establishmentId,
        };
        let evaluations;
        if (req.user.role === 'teacher') {
            evaluations = await (0, evaluation_model_1.findTeacherEvaluations)(req.user.userId, filters);
        }
        else if (req.user.role === 'admin' || req.user.role === 'responsable') {
            evaluations = await (0, evaluation_model_1.findEvaluations)(filters);
        }
        else {
            res.status(403).json({ success: false, error: 'Accès refusé' });
            return;
        }
        res.json({
            success: true,
            data: evaluations,
        });
    }
    catch (error) {
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
async function getEvaluationDetailsHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { id } = req.params;
        // Récupérer l'évaluation
        const evaluation = await (0, evaluation_model_1.findEvaluationById)(id, req.user.establishmentId);
        if (!evaluation) {
            res.status(404).json({
                success: false,
                error: 'Évaluation non trouvée',
            });
            return;
        }
        // Vérifier les permissions
        if (req.user.role === 'teacher') {
            const canModify = await (0, evaluation_model_1.canTeacherModifyEvaluation)(id, req.user.userId, req.user.establishmentId);
            if (!canModify) {
                res.status(403).json({
                    success: false,
                    error: 'Vous ne pouvez consulter que vos propres évaluations',
                });
                return;
            }
        }
        // Récupérer les notes de cette évaluation
        const grades = await (0, grade_model_1.findEvaluationGrades)(id);
        // Récupérer les statistiques
        const stats = await (0, evaluation_model_1.getEvaluationStats)(id, req.user.establishmentId);
        res.json({
            success: true,
            data: {
                evaluation,
                grades,
                stats,
            },
        });
    }
    catch (error) {
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
async function updateEvaluationHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { id } = req.params;
        // Vérifier les permissions
        if (req.user.role === 'teacher') {
            const canModify = await (0, evaluation_model_1.canTeacherModifyEvaluation)(id, req.user.userId, req.user.establishmentId);
            if (!canModify) {
                res.status(403).json({
                    success: false,
                    error: 'Vous ne pouvez modifier que vos propres évaluations',
                });
                return;
            }
        }
        const updatedEvaluation = await (0, evaluation_model_1.updateEvaluation)(id, req.body, req.user.establishmentId);
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
    }
    catch (error) {
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
async function deleteEvaluationHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { id } = req.params;
        // Vérifier les permissions
        if (req.user.role === 'teacher') {
            const canModify = await (0, evaluation_model_1.canTeacherModifyEvaluation)(id, req.user.userId, req.user.establishmentId);
            if (!canModify) {
                res.status(403).json({
                    success: false,
                    error: 'Vous ne pouvez supprimer que vos propres évaluations',
                });
                return;
            }
        }
        const deleted = await (0, evaluation_model_1.deleteEvaluation)(id, req.user.establishmentId);
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
    }
    catch (error) {
        console.error('Erreur suppression évaluation:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de l\'évaluation',
        });
    }
}
// =========================
// NOTES - Saisie et modification
// =========================
/**
 * POST /api/grades
 * Saisie/modification de notes en batch
 */
async function createOrUpdateGradesHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { evaluationId, grades } = req.body;
        if (!evaluationId || !grades || !Array.isArray(grades)) {
            res.status(400).json({
                success: false,
                error: 'Données invalides',
                required: ['evaluationId', 'grades'],
            });
            return;
        }
        // Vérifier que l'évaluation existe et que le prof y a accès
        if (req.user.role === 'teacher') {
            const canModify = await (0, evaluation_model_1.canTeacherModifyEvaluation)(evaluationId, req.user.userId, req.user.establishmentId);
            if (!canModify) {
                res.status(403).json({
                    success: false,
                    error: 'Vous ne pouvez saisir des notes que pour vos propres évaluations',
                });
                return;
            }
        }
        // Préparer les données des notes
        const gradesData = grades.map((g) => ({
            evaluationId,
            studentId: g.studentId,
            value: g.value,
            absent: g.absent || false,
            comment: g.comment,
            createdBy: req.user.userId,
        }));
        // Créer/mettre à jour les notes
        const createdGrades = await (0, grade_model_1.createGrades)(gradesData);
        res.json({
            success: true,
            message: `${createdGrades.length} note(s) enregistrée(s)`,
            data: createdGrades,
        });
    }
    catch (error) {
        console.error('Erreur saisie notes:', error);
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
async function updateGradeHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { id } = req.params;
        const { value, absent, comment } = req.body;
        // Récupérer la note pour vérifier les permissions
        const grade = await (0, grade_model_1.findGradeById)(id);
        if (!grade) {
            res.status(404).json({
                success: false,
                error: 'Note non trouvée',
            });
            return;
        }
        // Vérifier les délais de modification selon le rôle
        const createdAt = new Date(grade.created_at);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        const daysSinceCreation = hoursSinceCreation / 24;
        if (req.user.role === 'teacher') {
            if (hoursSinceCreation > 48) {
                res.status(403).json({
                    success: false,
                    error: `Délai de modification dépassé (${Math.floor(hoursSinceCreation)}h écoulées, limite 48h)`,
                    canEdit: false,
                });
                return;
            }
        }
        else if (req.user.role === 'responsable') {
            if (daysSinceCreation > 30) {
                res.status(403).json({
                    success: false,
                    error: `Délai de modification dépassé (${Math.floor(daysSinceCreation)} jours écoulés, limite 30 jours)`,
                    canEdit: false,
                });
                return;
            }
        }
        // Mettre à jour la note
        const updatedGrade = await (0, grade_model_1.updateGrade)(id, { value, absent, comment }, req.user.userId, req.user.role);
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
    }
    catch (error) {
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
async function deleteGradeHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { id } = req.params;
        // Récupérer la note pour vérifier les permissions
        const grade = await (0, grade_model_1.findGradeById)(id);
        if (!grade) {
            res.status(404).json({
                success: false,
                error: 'Note non trouvée',
            });
            return;
        }
        // Mêmes règles de délai que pour la modification
        const createdAt = new Date(grade.created_at);
        const now = new Date();
        const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
        if (req.user.role === 'teacher' && hoursSinceCreation > 48) {
            res.status(403).json({
                success: false,
                error: 'Délai de suppression dépassé (48h maximum)',
            });
            return;
        }
        const deleted = await (0, grade_model_1.deleteGrade)(id);
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
    }
    catch (error) {
        console.error('Erreur suppression note:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression de la note',
        });
    }
}
// ============================================
// À AJOUTER dans src/backend/controllers/grade.controller.ts
// APRÈS les autres handlers (vers la ligne 500-600)
// ============================================
const grade_model_2 = require("../models/grade.model"); // ✅ Ajouter cet import en haut
/**
 * GET /api/grades/:id
 * Récupère les détails complets d'une note pour l'édition
 */
async function getGradeByIdHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { id } = req.params;
        console.log(`[API] Fetching grade ${id} for user ${req.user.email}`);
        // Récupérer la note avec tous les détails
        const grade = await (0, grade_model_2.findGradeByIdWithDetails)(id, req.user.establishmentId);
        if (!grade) {
            res.status(404).json({
                success: false,
                error: 'Note non trouvée',
            });
            return;
        }
        // Vérifier les permissions selon le rôle
        const hasPermission = await checkGradeAccessPermission(grade, req.user.userId, req.user.role);
        if (!hasPermission) {
            res.status(403).json({
                success: false,
                error: 'Vous n\'avez pas accès à cette note',
            });
            return;
        }
        // Récupérer l'historique des modifications
        const history = await (0, grade_model_1.getGradeHistory)(id);
        // Calculer les statistiques de la classe pour cette évaluation
        const stats = await (0, evaluation_model_1.getEvaluationStats)(grade.evaluation_id, req.user.establishmentId);
        // Retourner toutes les données nécessaires
        res.json({
            success: true,
            data: {
                grade: {
                    id: grade.id,
                    evaluationId: grade.evaluation_id,
                    studentId: grade.student_id,
                    studentName: grade.student_name,
                    studentEmail: grade.student_email,
                    studentNo: grade.student_no,
                    value: grade.value,
                    absent: grade.absent,
                    normalizedValue: grade.normalized_value,
                    comment: grade.comment,
                    createdAt: grade.created_at,
                    updatedAt: grade.updated_at,
                    createdBy: grade.created_by_name,
                    createdByRole: grade.created_by_role,
                    evaluation: {
                        id: grade.evaluation_id,
                        title: grade.evaluation_title,
                        type: grade.evaluation_type,
                        coefficient: grade.evaluation_coefficient,
                        maxScale: grade.evaluation_max_scale,
                        date: grade.evaluation_date,
                        description: grade.evaluation_description,
                    },
                    /* The above code is defining a TypeScript object with properties related to a course. It is
                    extracting information from a `grade` object and assigning it to the corresponding
                    properties in the `course` object. The properties being extracted include `id`,
                    `subjectName`, `subjectCode`, `className`, and `classCode`. */
                    course: {
                        id: grade.course_id,
                        subjectName: grade.subject_name,
                        subjectCode: grade.subject_code,
                        className: grade.class_label,
                        classCode: grade.class_code,
                    },
                },
                history,
                stats: {
                    classAverage: stats?.average || 0,
                    classMin: stats?.min || 0,
                    classMax: stats?.max || 0,
                    totalStudents: stats?.total || 0,
                    completedGrades: stats?.completed || 0,
                },
            },
        });
        console.log(`[API] Grade ${id} fetched successfully`);
    }
    catch (error) {
        console.error('[API] Error fetching grade:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la note',
        });
    }
}
/**
 * Vérifie si l'utilisateur a accès à cette note
 * Fonction helper pour getGradeByIdHandler
 */
async function checkGradeAccessPermission(grade, userId, userRole) {
    // Admin : accès complet
    if (userRole === 'admin') {
        return true;
    }
    // Professeur : doit être le prof du cours
    if (userRole === 'teacher') {
        const query = `
      SELECT COUNT(*) as count
      FROM grades g
      INNER JOIN evaluations e ON e.id = g.evaluation_id
      INNER JOIN courses c ON c.id = e.course_id
      WHERE g.id = $1 AND c.teacher_id = $2
    `;
        const result = await database_1.pool.query(query, [grade.id, userId]);
        return parseInt(result.rows[0].count) > 0;
    }
    // Responsable : doit être le parent de l'élève
    if (userRole === 'responsable') {
        const query = `
      SELECT COUNT(*) as count
      FROM grades g
      INNER JOIN student_responsables sr ON sr.student_id = g.student_id
      WHERE g.id = $1 AND sr.responsable_id = $2
    `;
        const result = await database_1.pool.query(query, [grade.id, userId]);
        return result.rows.length > 0 && parseInt(result.rows[0].count) > 0;
    }
    // Élève : doit être sa propre note
    if (userRole === 'student') {
        return grade.student_id === userId;
    }
    return false;
}
/**
 * GET /api/grades/:id/history
 * Récupère l'historique d'une note
 */
async function getGradeHistoryHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { id } = req.params;
        const history = await (0, grade_model_1.getGradeHistory)(id);
        res.json({
            success: true,
            data: history,
        });
    }
    catch (error) {
        console.error('Erreur récupération historique:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'historique',
        });
    }
}
// =========================
// NOTES - Consultation pour élèves
// =========================
/**
 * GET /api/grades/student/:studentId
 * Récupère toutes les notes d'un élève
 */
async function getStudentGradesHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { studentId } = req.params;
        const { termId, courseId } = req.query;
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
            const childrenGrades = await (0, grade_model_1.getChildrenGrades)(req.user.userId);
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
            termId: termId,
            courseId: courseId,
            establishmentId: req.user.establishmentId,
        };
        const grades = await (0, grade_model_1.findStudentGrades)(studentId, filters);
        res.json({
            success: true,
            data: {
                student: {
                    id: studentId,
                    fullName: grades[0]?.student_name || 'Étudiant',
                },
                grades,
            },
        });
    }
    catch (error) {
        console.error('Erreur récupération notes élève:', error);
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
async function getStudentAveragesHandler(req, res) {
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
        const averages = await (0, grade_model_1.getStudentAverages)(studentId, termId, req.user.establishmentId);
        const overallAverage = await (0, grade_model_1.getStudentOverallAverage)(studentId, termId, req.user.establishmentId);
        res.json({
            success: true,
            data: {
                averages: {
                    general: overallAverage,
                    bySubject: averages.reduce((acc, avg) => {
                        acc[avg.subject_name] = avg.weighted_average;
                        return acc;
                    }, {}),
                },
                details: averages,
            },
        });
    }
    catch (error) {
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
async function getChildrenGradesHandler(req, res) {
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
            termId: termId,
            studentId: studentId,
            establishmentId: req.user.establishmentId,
        };
        const grades = await (0, grade_model_1.getChildrenGrades)(req.user.userId, filters);
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
        }, {});
        res.json({
            success: true,
            data: Object.values(gradesByStudent),
        });
    }
    catch (error) {
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
async function getCourseGradesHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { courseId } = req.params;
        const { evaluationId } = req.query;
        const filters = {
            courseId,
            evaluationId: evaluationId,
            establishmentId: req.user.establishmentId,
        };
        const grades = await (0, grade_model_1.findGrades)(filters);
        res.json({
            success: true,
            data: grades,
        });
    }
    catch (error) {
        console.error('Erreur récupération notes cours:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des notes du cours',
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
async function getClassAveragesHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { classId } = req.params;
        const { termId } = req.query;
        const averages = await (0, grade_model_1.getClassAverages)(classId, termId, req.user.establishmentId);
        res.json({
            success: true,
            data: averages,
        });
    }
    catch (error) {
        console.error('Erreur calcul moyennes classe:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du calcul des moyennes de classe',
        });
    }
}
//# sourceMappingURL=grade.controller.js.map