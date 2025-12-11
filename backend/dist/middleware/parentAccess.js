"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireParentAccessToStudent = requireParentAccessToStudent;
const parent_model_1 = require("../models/parent.model");
function requireParentAccessToStudent(options) {
    return async (req, res, next) => {
        try {
            if (!req.user || req.user.role !== 'parent') {
                res.status(403).json({
                    success: false,
                    error: 'Accès réservé aux parents',
                });
                return;
            }
            const studentId = req.params.studentId || req.query.studentId;
            if (!studentId) {
                res.status(400).json({
                    success: false,
                    error: 'studentId is required',
                });
                return;
            }
            await (0, parent_model_1.assertParentCanAccessStudent)(req.user.userId, studentId, options);
            next();
        }
        catch (error) {
            console.error('[ParentAccess] Forbidden', {
                parentId: req.user?.userId,
                requestedStudent: req.params.studentId || req.query.studentId,
                message: error instanceof Error ? error.message : error,
            });
            res.status(403).json({
                success: false,
                error: 'Forbidden: parent cannot access this student.',
            });
        }
    };
}
//# sourceMappingURL=parentAccess.js.map