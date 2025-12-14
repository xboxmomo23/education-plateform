"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentStudentAttendanceHandler = getParentStudentAttendanceHandler;
const attendance_model_1 = require("../models/attendance.model");
/**
 * GET /api/parent/students/:studentId/attendance
 * Retourne l'historique d'assiduité + stats pour un élève donné
 * (utilise la même logique que le flux élève)
 */
async function getParentStudentAttendanceHandler(req, res) {
    try {
        const { studentId } = req.params;
        const { startDate, endDate, limit } = req.query;
        const history = await attendance_model_1.AttendanceModel.getStudentAttendanceHistory(studentId, {
            startDate: startDate,
            endDate: endDate,
            limit: limit ? parseInt(limit, 10) : 100,
        });
        const stats = await attendance_model_1.AttendanceModel.getStudentAttendanceStats(studentId, {
            startDate: startDate,
            endDate: endDate,
        });
        return res.json({
            success: true,
            data: {
                history,
                stats,
            },
        });
    }
    catch (error) {
        console.error('Erreur getParentStudentAttendanceHandler:', error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la récupération de l'assiduité",
        });
    }
}
//# sourceMappingURL=parent-attendance.controller.js.map