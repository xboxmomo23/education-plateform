import { Request, Response } from "express";
import pool from "../config/database";
import { getEstablishmentSettings } from "../models/establishmentSettings.model";
import { processStudentImport } from "../services/studentImport.service";

async function getAdminEstablishmentId(adminUserId: string): Promise<string | null> {
  const result = await pool.query(
    `
      SELECT e.id
      FROM establishments e
      JOIN users u ON u.establishment_id = e.id
      WHERE u.id = $1
        AND e.deleted_at IS NULL
    `,
    [adminUserId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  return result.rows[0].id as string;
}

async function getEstablishmentName(establishmentId: string): Promise<string | null> {
  const settings = await getEstablishmentSettings(establishmentId);
  return settings.displayName || null;
}

async function resolveAdminContext(req: Request) {
  const userId = req.user!.userId;
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

export async function previewStudentImportHandler(req: Request, res: Response) {
  try {
    const context = await resolveAdminContext(req);
    const { csvData, defaultClassId } = req.body as {
      csvData: string;
      defaultClassId?: string | null;
    };

    const result = await processStudentImport({
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
  } catch (error: any) {
    console.error("previewStudentImportHandler error:", error);
    const status =
      error?.message === "Établissement introuvable pour cet administrateur"
        ? 404
        : 400;
    return res.status(status).json({
      success: false,
      error: error?.message || "Erreur lors de l'analyse du CSV",
    });
  }
}

export async function commitStudentImportHandler(req: Request, res: Response) {
  try {
    const context = await resolveAdminContext(req);
    const { csvData, defaultClassId, sendInvites } = req.body as {
      csvData: string;
      defaultClassId?: string | null;
      sendInvites?: boolean;
    };

    const result = await processStudentImport({
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
  } catch (error: any) {
    console.error("commitStudentImportHandler error:", error);
    const status =
      error?.message === "Établissement introuvable pour cet administrateur"
        ? 404
        : 400;
    return res.status(status).json({
      success: false,
      error: error?.message || "Erreur lors de l'import du CSV",
    });
  }
}
