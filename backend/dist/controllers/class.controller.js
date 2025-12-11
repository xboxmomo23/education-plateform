"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllClasses = getAllClasses;
const database_1 = require("../config/database");
// GET /api/classes
// Liste toutes les classes de l'établissement
async function getAllClasses(req, res) {
    try {
        const establishmentId = req.user?.establishmentId;
        if (!establishmentId) {
            res.status(403).json({
                success: false,
                error: 'Aucun établissement associé à ce compte',
            });
            return;
        }
        const result = await database_1.pool.query(`SELECT 
        id,
        label,
        level,
        academic_year
      FROM classes
      WHERE establishment_id = $1
      ORDER BY level, label`, [establishmentId]);
        res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error('Erreur récupération classes:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des classes',
        });
    }
}
//# sourceMappingURL=class.controller.js.map