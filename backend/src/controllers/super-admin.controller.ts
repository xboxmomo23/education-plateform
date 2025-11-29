import { Request, Response } from "express";
import pool from "../config/database";

/**
 * Vérifie que l'utilisateur est bien le Super Admin plateforme
 * (role = 'admin' ET pas d'establishment_id).
 */
function ensureSuperAdmin(req: Request, res: Response): { userId: string } | null {
  const user = req.user as any;

  if (!user || user.role !== "admin" || user.establishmentId) {
    res.status(403).json({
      success: false,
      error: "Accès réservé au Super Admin",
    });
    return null;
  }

  return { userId: user.userId };
}

/**
 * GET /api/super-admin/establishments
 * Liste tous les établissements
 */
export async function getEstablishmentsHandler(req: Request, res: Response) {
  const ctx = ensureSuperAdmin(req, res);
  if (!ctx) return;

  try {
    const result = await pool.query(
      `
      SELECT 
        id,
        name,
        code,
        type,
        city,
        email,
        phone,
        active,
        verified,
        subscription_plan,
        subscription_start,
        subscription_end,
        max_students,
        created_at,
        updated_at
      FROM establishments
      ORDER BY created_at DESC
      `
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Erreur getEstablishmentsHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des établissements",
    });
  }
}

/**
 * POST /api/super-admin/establishments
 * Créer un nouvel établissement
 */
export async function createEstablishmentHandler(req: Request, res: Response) {
  const ctx = ensureSuperAdmin(req, res);
  if (!ctx) return;

  const {
    name,
    code,
    type,
    address,
    city,
    postal_code,
    email,
    phone,
    max_students,
    timezone,
    subscription_plan,
  } = req.body;

  try {
    const query = `
      INSERT INTO establishments (
        name,
        code,
        type,
        address,
        city,
        postal_code,
        email,
        phone,
        max_students,
        timezone,
        subscription_plan
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
    `;

    const values = [
      name,
      code,
      type ?? null,
      address ?? null,
      city ?? null,
      postal_code ?? null,
      email,
      phone ?? null,
      max_students ?? 100,
      timezone ?? "Europe/Paris",
      subscription_plan ?? "trial",
    ];

    const result = await pool.query(query, values);

    return res.status(201).json({
      success: true,
      message: "Établissement créé",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur createEstablishmentHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la création de l'établissement",
    });
  }
}

/**
 * PUT /api/super-admin/establishments/:id
 * Mettre à jour les infos d'un établissement
 */
export async function updateEstablishmentHandler(req: Request, res: Response) {
  const ctx = ensureSuperAdmin(req, res);
  if (!ctx) return;

  const { id } = req.params;
  const {
    name,
    code,
    type,
    address,
    city,
    postal_code,
    email,
    phone,
    max_students,
    timezone,
    subscription_plan,
    active,
    verified,
  } = req.body;

  try {
    const query = `
      UPDATE establishments
      SET
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        type = COALESCE($3, type),
        address = COALESCE($4, address),
        city = COALESCE($5, city),
        postal_code = COALESCE($6, postal_code),
        email = COALESCE($7, email),
        phone = COALESCE($8, phone),
        max_students = COALESCE($9, max_students),
        timezone = COALESCE($10, timezone),
        subscription_plan = COALESCE($11, subscription_plan),
        active = COALESCE($12, active),
        verified = COALESCE($13, verified),
        updated_at = now()
      WHERE id = $14
      RETURNING *
    `;

    const values = [
      name ?? null,
      code ?? null,
      type ?? null,
      address ?? null,
      city ?? null,
      postal_code ?? null,
      email ?? null,
      phone ?? null,
      max_students ?? null,
      timezone ?? null,
      subscription_plan ?? null,
      typeof active === "boolean" ? active : null,
      typeof verified === "boolean" ? verified : null,
      id,
    ];

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Établissement introuvable",
      });
    }

    return res.json({
      success: true,
      message: "Établissement mis à jour",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur updateEstablishmentHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour de l'établissement",
    });
  }
}

/**
 * PATCH /api/super-admin/establishments/:id/toggle-active
 * Activer / désactiver rapidement un établissement
 */
export async function toggleEstablishmentActiveHandler(req: Request, res: Response) {
  const ctx = ensureSuperAdmin(req, res);
  if (!ctx) return;

  const { id } = req.params;

  try {
    const result = await pool.query(
      `
      UPDATE establishments
      SET active = NOT active, updated_at = now()
      WHERE id = $1
      RETURNING id, name, active
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Établissement introuvable",
      });
    }

    return res.json({
      success: true,
      message: result.rows[0].active
        ? "Établissement activé"
        : "Établissement désactivé",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur toggleEstablishmentActiveHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors du changement de statut de l'établissement",
    });
  }
}
