"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTeacherClassesSummaryHandler = getTeacherClassesSummaryHandler;
const teacher_model_1 = require("../models/teacher.model");
async function getTeacherClassesSummaryHandler(req, res) {
    try {
        if (!req.user || req.user.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé aux professeurs',
            });
        }
        const teacherId = req.user.userId;
        const establishmentId = req.user.establishmentId;
        const summaries = await teacher_model_1.TeacherModel.getClassesSummary(teacherId, establishmentId);
        return res.json({
            success: true,
            data: summaries,
        });
    }
    catch (error) {
        console.error('[Teacher] getClassesSummary error:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors du chargement des classes du professeur',
        });
    }
}
//# sourceMappingURL=teacher.controller.js.map