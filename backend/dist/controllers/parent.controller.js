"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParentChildrenHandler = getParentChildrenHandler;
exports.checkParentChildAccessHandler = checkParentChildAccessHandler;
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
        const children = await (0, parent_model_1.getChildrenForParent)(req.user.userId);
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
//# sourceMappingURL=parent.controller.js.map