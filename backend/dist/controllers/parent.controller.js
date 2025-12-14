"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentChildrenHandler = getParentChildrenHandler;
exports.checkParentChildAccessHandler = checkParentChildAccessHandler;
exports.getParentStudentSummaryHandler = getParentStudentSummaryHandler;
const database_1 = __importDefault(require("../config/database"));
const parent_model_1 = require("../models/parent.model");
async function getParentChildrenHandler(req, res) {
    try {
        if (!req.user || req.user.role !== 'parent') {
            res.status(403).json({
                success: false,
                error: 'Accès réservé aux parents',
            });
            return;
        }
        const includeInactive = typeof req.query.includeInactive === 'string' && req.query.includeInactive === 'true';
        const includePendingActivation = typeof req.query.includePendingActivation === 'string' && req.query.includePendingActivation === 'true';
        const children = await (0, parent_model_1.getChildrenForParent)(req.user.userId, {
            includeInactive,
            includePendingActivation,
        });
        res.status(200).json({
            success: true,
            data: children,
        });
    }
    catch (error) {
        console.error('[ParentController] getParentChildrenHandler error:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des enfants',
        });
    }
}
async function checkParentChildAccessHandler(req, res) {
    res.status(200).json({
        success: true,
        data: {
            ok: true,
            studentId: req.params.studentId,
        },
    });
}
async function getParentStudentSummaryHandler(req, res) {
    try {
        if (!req.user || req.user.role !== 'parent') {
            res.status(403).json({
                success: false,
                error: 'Accès réservé aux parents',
            });
            return;
        }
        const studentId = req.params.studentId;
        if (!studentId) {
            res.status(400).json({
                success: false,
                error: 'studentId requis',
            });
            return;
        }
        await (0, parent_model_1.assertParentCanAccessStudent)(req.user.userId, studentId);
        const result = await database_1.default.query(`
        SELECT
          u.id,
          u.full_name,
          u.email,
          s.class_id,
          c.label AS class_label,
          c.code AS class_code,
          c.level AS class_level
        FROM users u
        LEFT JOIN students s ON s.user_id = u.id
        LEFT JOIN classes c ON c.id = s.class_id
        WHERE u.id = $1
          AND u.role = 'student'
        LIMIT 1
      `, [studentId]);
        if (result.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Élève introuvable',
            });
            return;
        }
        const row = result.rows[0];
        res.status(200).json({
            success: true,
            data: {
                id: row.id,
                full_name: row.full_name,
                email: row.email,
                class_id: row.class_id || null,
                class_label: row.class_label || row.class_code || null,
                class_level: row.class_level || null,
            },
        });
    }
    catch (error) {
        console.error('[ParentController] getParentStudentSummaryHandler error:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des informations élève',
        });
    }
}
//# sourceMappingURL=parent.controller.js.map