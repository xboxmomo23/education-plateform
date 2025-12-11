"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportCardStatus = getReportCardStatus;
exports.validateReportCardHandler = validateReportCardHandler;
exports.unvalidateReportCardHandler = unvalidateReportCardHandler;
exports.validateClassReportCards = validateClassReportCards;
exports.setCouncilAppreciationHandler = setCouncilAppreciationHandler;
exports.getClassReportCardsHandler = getClassReportCardsHandler;
exports.setSubjectAppreciationHandler = setSubjectAppreciationHandler;
exports.getStudentAppreciationsHandler = getStudentAppreciationsHandler;
const reportCard_model_1 = require("../models/reportCard.model");
const database_1 = require("../config/database");
const parent_model_1 = require("../models/parent.model");
// =========================
// GET /api/report-cards/status/:studentId/:termId
// Statut du bulletin (validé ou non)
// =========================
async function getReportCardStatus(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { studentId, termId } = req.params;
        // Vérifier les permissions
        const canAccess = req.user.role === 'admin' ||
            req.user.role === 'staff' ||
            req.user.role === 'teacher' ||
            (req.user.role === 'student' && req.user.userId === studentId) ||
            req.user.role === 'parent';
        if (!canAccess) {
            res.status(403).json({ success: false, error: 'Accès refusé' });
            return;
        }
        if (req.user.role === 'parent') {
            try {
                await (0, parent_model_1.assertParentCanAccessStudent)(req.user.userId, studentId, {
                    requireCanViewGrades: true,
                });
            }
            catch (error) {
                res.status(403).json({ success: false, error: 'Accès refusé' });
                return;
            }
        }
        if (req.user.role === 'parent') {
            try {
                await (0, parent_model_1.assertParentCanAccessStudent)(req.user.userId, studentId, {
                    requireCanViewGrades: true,
                });
            }
            catch (error) {
                res.status(403).json({ success: false, error: 'Accès refusé' });
                return;
            }
        }
        const studentResult = await database_1.pool.query(`SELECT establishment_id FROM users WHERE id = $1 AND role = 'student'`, [studentId]);
        if (studentResult.rowCount === 0) {
            res.status(404).json({ success: false, error: 'Élève introuvable' });
            return;
        }
        const studentEstablishmentId = studentResult.rows[0].establishment_id;
        if (!studentEstablishmentId) {
            res.status(403).json({
                success: false,
                error: 'Établissement élève non défini',
            });
            return;
        }
        const rolesRequiringMatch = ['admin', 'staff', 'teacher'];
        if (rolesRequiringMatch.includes(req.user.role)) {
            if (!req.user.establishmentId || req.user.establishmentId !== studentEstablishmentId) {
                res.status(403).json({
                    success: false,
                    error: 'Accès refusé pour cet établissement',
                });
                return;
            }
        }
        if (req.user.role === 'student' && req.user.userId !== studentId) {
            res.status(403).json({ success: false, error: 'Accès refusé' });
            return;
        }
        const reportCard = await (0, reportCard_model_1.findReportCard)(studentId, termId, studentEstablishmentId);
        res.json({
            success: true,
            data: {
                exists: !!reportCard,
                validated: !!reportCard?.validatedAt,
                validatedAt: reportCard?.validatedAt || null,
                validatedBy: reportCard?.validatedBy || null,
                councilAppreciation: reportCard?.councilAppreciation || null,
            },
        });
    }
    catch (error) {
        console.error('Erreur récupération statut bulletin:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du statut',
        });
    }
}
// =========================
// POST /api/report-cards/validate
// Valider un bulletin individuel
// =========================
async function validateReportCardHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        // Seuls staff et admin peuvent valider
        if (!['admin', 'staff'].includes(req.user.role)) {
            res.status(403).json({ success: false, error: 'Seuls les staff peuvent valider les bulletins' });
            return;
        }
        const { studentId, termId } = req.body;
        if (!studentId || !termId) {
            res.status(400).json({ success: false, error: 'studentId et termId sont requis' });
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
        // Vérifier qu'il y a des notes pour cet élève dans cette période
        // Récupérer les dates de la période
        const termResult = await database_1.pool.query(`SELECT start_date, end_date FROM terms WHERE id = $1`, [termId]);
        if (termResult.rows.length === 0) {
            res.status(404).json({ success: false, error: 'Période non trouvée' });
            return;
        }
        const term = termResult.rows[0];
        // Vérifier qu'il y a des notes pour cet élève dans cette période
        // Inclut les évaluations avec term_id OU celles dans la plage de dates
        const gradesCheck = await database_1.pool.query(`SELECT COUNT(*) as count
      FROM grades g
      INNER JOIN evaluations e ON e.id = g.evaluation_id
      WHERE g.student_id = $1 
      AND (
        e.term_id = $2
        OR (e.term_id IS NULL AND e.eval_date >= $3 AND e.eval_date <= $4)
      )`, [studentId, termId, term.start_date, term.end_date]);
        if (parseInt(gradesCheck.rows[0].count) === 0) {
            res.status(400).json({
                success: false,
                error: 'Impossible de valider un bulletin sans notes',
            });
            return;
        }
        if (parseInt(gradesCheck.rows[0].count) === 0) {
            res.status(400).json({
                success: false,
                error: 'Impossible de valider un bulletin sans notes',
            });
            return;
        }
        const reportCard = await (0, reportCard_model_1.validateReportCard)(studentId, termId, req.user.userId, establishmentId);
        res.json({
            success: true,
            message: 'Bulletin validé avec succès',
            data: reportCard,
        });
    }
    catch (error) {
        console.error('Erreur validation bulletin:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la validation du bulletin',
        });
    }
}
// =========================
// POST /api/report-cards/unvalidate
// Annuler la validation (admin uniquement)
// =========================
async function unvalidateReportCardHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        // Seul admin peut annuler une validation
        if (req.user.role !== 'admin') {
            res.status(403).json({ success: false, error: 'Seul l\'admin peut annuler une validation' });
            return;
        }
        const { studentId, termId } = req.body;
        if (!studentId || !termId) {
            res.status(400).json({ success: false, error: 'studentId et termId sont requis' });
            return;
        }
        const reportCard = await (0, reportCard_model_1.unvalidateReportCard)(studentId, termId);
        if (!reportCard) {
            res.status(404).json({ success: false, error: 'Bulletin non trouvé' });
            return;
        }
        res.json({
            success: true,
            message: 'Validation annulée',
            data: reportCard,
        });
    }
    catch (error) {
        console.error('Erreur annulation validation:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'annulation',
        });
    }
}
// =========================
// POST /api/report-cards/validate-class
// Valider tous les bulletins d'une classe
// =========================
async function validateClassReportCards(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        if (!['admin', 'staff'].includes(req.user.role)) {
            res.status(403).json({ success: false, error: 'Accès refusé' });
            return;
        }
        const { classId, termId } = req.body;
        if (!classId || !termId) {
            res.status(400).json({ success: false, error: 'classId et termId sont requis' });
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
        // Récupérer tous les élèves de la classe qui ont des notes
        const studentsResult = await database_1.pool.query(`SELECT DISTINCT g.student_id
      FROM grades g
      INNER JOIN evaluations e ON e.id = g.evaluation_id
      INNER JOIN enrollments en ON en.student_id = g.student_id AND en.end_date IS NULL
      WHERE en.class_id = $1 AND e.term_id = $2`, [classId, termId]);
        const studentIds = studentsResult.rows.map((r) => r.student_id);
        if (studentIds.length === 0) {
            res.status(400).json({
                success: false,
                error: 'Aucun élève avec des notes dans cette classe pour cette période',
            });
            return;
        }
        // Valider tous les bulletins
        let validatedCount = 0;
        for (const studentId of studentIds) {
            await (0, reportCard_model_1.validateReportCard)(studentId, termId, req.user.userId, establishmentId);
            validatedCount++;
        }
        res.json({
            success: true,
            message: `${validatedCount} bulletins validés`,
            data: { validatedCount },
        });
    }
    catch (error) {
        console.error('Erreur validation classe:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la validation de la classe',
        });
    }
}
// =========================
// PUT /api/report-cards/council-appreciation
// Ajouter/modifier l'appréciation du conseil
// =========================
async function setCouncilAppreciationHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        if (!['admin', 'staff', 'teacher'].includes(req.user.role)) {
            res.status(403).json({ success: false, error: 'Accès refusé' });
            return;
        }
        const { studentId, termId, appreciation } = req.body;
        if (!studentId || !termId) {
            res.status(400).json({ success: false, error: 'studentId et termId sont requis' });
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
        // Vérifier que le bulletin n'est pas déjà validé
        const existingCard = await (0, reportCard_model_1.findReportCard)(studentId, termId, establishmentId);
        if (existingCard?.validatedAt) {
            res.status(400).json({
                success: false,
                error: 'Impossible de modifier un bulletin déjà validé',
            });
            return;
        }
        const reportCard = await (0, reportCard_model_1.setCouncilAppreciation)(studentId, termId, appreciation || '', req.user.userId, establishmentId);
        res.json({
            success: true,
            message: 'Appréciation du conseil enregistrée',
            data: reportCard,
        });
    }
    catch (error) {
        console.error('Erreur appréciation conseil:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'enregistrement de l\'appréciation',
        });
    }
}
// =========================
// GET /api/report-cards/class/:classId/:termId
// Liste des bulletins d'une classe avec statut
// =========================
async function getClassReportCardsHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        if (!['admin', 'staff', 'teacher'].includes(req.user.role)) {
            res.status(403).json({ success: false, error: 'Accès refusé' });
            return;
        }
        const { classId, termId } = req.params;
        const establishmentId = req.user.establishmentId;
        if (!establishmentId) {
            res.status(403).json({
                success: false,
                error: 'Aucun établissement associé à votre compte',
            });
            return;
        }
        const reportCards = await (0, reportCard_model_1.getClassReportCards)(classId, termId, establishmentId);
        res.json({
            success: true,
            data: reportCards,
        });
    }
    catch (error) {
        console.error('Erreur récupération bulletins classe:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des bulletins',
        });
    }
}
// =========================
// POST /api/appreciations/subject
// Ajouter/modifier une appréciation par matière
// =========================
async function setSubjectAppreciationHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        if (!['admin', 'staff', 'teacher'].includes(req.user.role)) {
            res.status(403).json({ success: false, error: 'Accès refusé' });
            return;
        }
        const { studentId, termId, courseId, appreciation } = req.body;
        if (!studentId || !termId || !courseId) {
            res.status(400).json({
                success: false,
                error: 'studentId, termId et courseId sont requis',
            });
            return;
        }
        const establishmentId = req.user.establishmentId;
        if (!establishmentId) {
            res.status(403).json({
                success: false,
                error: 'Aucun établissement associé à votre compte',
            });
            return;
        }
        // Vérifier que le bulletin n'est pas déjà validé
        const existingCard = await (0, reportCard_model_1.findReportCard)(studentId, termId, establishmentId);
        if (existingCard?.validatedAt) {
            res.status(400).json({
                success: false,
                error: 'Impossible de modifier un bulletin déjà validé',
            });
            return;
        }
        // Si appréciation vide, supprimer
        if (!appreciation || appreciation.trim() === '') {
            await (0, reportCard_model_1.deleteSubjectAppreciation)(studentId, termId, courseId);
            res.json({
                success: true,
                message: 'Appréciation supprimée',
            });
            return;
        }
        const result = await (0, reportCard_model_1.setSubjectAppreciation)(studentId, termId, courseId, req.user.userId, appreciation);
        res.json({
            success: true,
            message: 'Appréciation enregistrée',
            data: result,
        });
    }
    catch (error) {
        console.error('Erreur appréciation matière:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'enregistrement de l\'appréciation',
        });
    }
}
// =========================
// GET /api/appreciations/student/:studentId/:termId
// Récupérer toutes les appréciations d'un élève
// =========================
async function getStudentAppreciationsHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { studentId, termId } = req.params;
        // Vérifier les permissions
        const canAccess = req.user.role === 'admin' ||
            req.user.role === 'staff' ||
            req.user.role === 'teacher' ||
            (req.user.role === 'student' && req.user.userId === studentId) ||
            req.user.role === 'parent';
        if (!canAccess) {
            res.status(403).json({ success: false, error: 'Accès refusé' });
            return;
        }
        const establishmentId = req.user.establishmentId;
        const appreciations = await (0, reportCard_model_1.getStudentAppreciations)(studentId, termId);
        const reportCard = await (0, reportCard_model_1.findReportCard)(studentId, termId, establishmentId || undefined);
        res.json({
            success: true,
            data: {
                subjectAppreciations: appreciations,
                councilAppreciation: reportCard?.councilAppreciation || null,
                validated: !!reportCard?.validatedAt,
            },
        });
    }
    catch (error) {
        console.error('Erreur récupération appréciations:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des appréciations',
        });
    }
}
//# sourceMappingURL=reportCard.controller.js.map