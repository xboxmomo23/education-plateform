"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewStudentImportHandler = previewStudentImportHandler;
exports.commitStudentImportHandler = commitStudentImportHandler;
const database_1 = __importDefault(require("../config/database"));
const establishmentSettings_model_1 = require("../models/establishmentSettings.model");
const studentImport_service_1 = require("../services/studentImport.service");
async function getAdminEstablishmentId(adminUserId) {
    const result = await database_1.default.query(`
      SELECT e.id
      FROM establishments e
      JOIN users u ON u.establishment_id = e.id
      WHERE u.id = $1
        AND e.deleted_at IS NULL
    `, [adminUserId]);
    if (result.rowCount === 0) {
        return null;
    }
    return result.rows[0].id;
}
async function getEstablishmentName(establishmentId) {
    const settings = await (0, establishmentSettings_model_1.getEstablishmentSettings)(establishmentId);
    return settings.displayName || null;
}
async function resolveAdminContext(req) {
    const userId = req.user.userId;
    const establishmentId = await getAdminEstablishmentId(userId);
    if (!establishmentId) {
        throw new Error("Établissement introuvable pour cet administrateur");
    }
    const establishmentName = await getEstablishmentName(establishmentId);
    return {
        userId,
        establishmentId,
        establishmentName,
        actorRole: req.user?.role ?? null,
        actorName: req.user?.full_name ?? null,
    };
}
async function previewStudentImportHandler(req, res) {
    try {
        const context = await resolveAdminContext(req);
        const { csvData, defaultClassId } = req.body;
        const result = await (0, studentImport_service_1.processStudentImport)({
            csvData,
            establishmentId: context.establishmentId,
            establishmentName: context.establishmentName,
            adminUserId: context.userId,
            actorRole: context.actorRole ?? undefined,
            actorName: context.actorName ?? undefined,
            defaultClassId: defaultClassId || null,
            sendInvites: false,
            dryRun: true,
            req,
        });
        return res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error("previewStudentImportHandler error:", error);
        const status = error?.message === "Établissement introuvable pour cet administrateur"
            ? 404
            : 400;
        return res.status(status).json({
            success: false,
            error: error?.message || "Erreur lors de l'analyse du CSV",
        });
    }
}
async function commitStudentImportHandler(req, res) {
    try {
        const context = await resolveAdminContext(req);
        const { csvData, defaultClassId, sendInvites } = req.body;
        const result = await (0, studentImport_service_1.processStudentImport)({
            csvData,
            establishmentId: context.establishmentId,
            establishmentName: context.establishmentName,
            adminUserId: context.userId,
            actorRole: context.actorRole ?? undefined,
            actorName: context.actorName ?? undefined,
            defaultClassId: defaultClassId || null,
            sendInvites: Boolean(sendInvites),
            dryRun: false,
            req,
        });
        return res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        console.error("commitStudentImportHandler error:", error);
        const status = error?.message === "Établissement introuvable pour cet administrateur"
            ? 404
            : 400;
        return res.status(status).json({
            success: false,
            error: error?.message || "Erreur lors de l'import du CSV",
        });
    }
}
//# sourceMappingURL=studentImport.controller.js.map