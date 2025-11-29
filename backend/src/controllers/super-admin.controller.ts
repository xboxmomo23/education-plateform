import { Request, Response } from 'express';
import pool from '../config/database';
import { createUser } from '../models/user.model';

// ===============================
// GET /api/super-admin/establishments
// Liste des établissements + nb d'admins
// ===============================
export async function getEstablishmentsForSuperAdminHandler(req: Request, res: Response) {
  try {
    const query = `
      SELECT
        e.id,
        e.name,
        e.code,
        e.type,
        e.address,
        e.city,
        e.postal_code,
        e.email,
        e.phone,
        e.logo_url,
        e.timezone,
        e.subscription_plan,
        e.subscription_start,
        e.subscription_end,
        e.max_students,
        e.active,
        e.verified,
        e.created_at,
        e.updated_at,
        COUNT(DISTINCT u.id) AS admins_count
      FROM establishments e
      LEFT JOIN users u
        ON u.establishment_id = e.id
       AND u.role = 'admin'
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;

    const result = await pool.query(query);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur getEstablishmentsForSuperAdminHandler:', error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des établissements",
    });
  }
}

// ===============================
// POST /api/super-admin/establishments
// Créer un établissement + son admin d'école
// ===============================
export async function createEstablishmentWithAdminHandler(req: Request, res: Response) {
  const {
    // établissement
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

    // admin d'école
    admin_email,
    admin_full_name,
    admin_password,
  } = req.body;

  if (!name || !code || !email) {
    return res.status(400).json({
      success: false,
      error: "Nom, code et email de l'établissement sont obligatoires",
    });
  }

  if (!admin_email || !admin_full_name) {
    return res.status(400).json({
      success: false,
      error: "Email et nom complet de l'admin d'école sont obligatoires",
    });
  }

  // Mot de passe admin : soit celui fourni, soit un défaut pour le dev
  const finalAdminPassword = admin_password || 'admin123';

  try {
    // 1) Créer l'établissement
    const insertEstQuery = `
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
      RETURNING
        id,
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
        created_at
    `;

    const estValues = [
      name,
      code,
      type ?? null,
      address ?? null,
      city ?? null,
      postal_code ?? null,
      email,
      phone ?? null,
      max_students ?? 100,
      timezone ?? 'Europe/Paris',
      subscription_plan ?? 'trial',
    ];

    const estResult = await pool.query(insertEstQuery, estValues);
    const establishment = estResult.rows[0];

    // 2) Créer l'utilisateur admin pour cet établissement
    const adminUser = await createUser({
      email: admin_email,
      password: finalAdminPassword,
      role: 'admin', // ⚠️ rôle admin d'établissement
      full_name: admin_full_name,
      establishmentId: establishment.id,
    });

    return res.status(201).json({
      success: true,
      message: "Établissement et admin d'école créés",
      data: {
        establishment,
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.full_name,
        },
        // Utile en dev pour se connecter directement
        admin_initial_password: finalAdminPassword,
      },
    });
  } catch (error: any) {
    console.error('Erreur createEstablishmentWithAdminHandler:', error);

    // Gestion simple des doublons (code/ email)
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        error: "Conflit : code d'établissement ou email déjà utilisé",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Erreur lors de la création de l'établissement",
    });
  }
}

// ===============================
// GET /api/super-admin/school-admins
// Liste des admins d'école
// ===============================
export async function getSchoolAdminsHandler(req: Request, res: Response) {
  try {
    const query = `
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.role,
        u.active,
        u.created_at,
        e.id AS establishment_id,
        e.name AS establishment_name,
        e.code AS establishment_code
      FROM users u
      JOIN establishments e
        ON e.id = u.establishment_id
      WHERE u.role = 'admin'
      ORDER BY e.name ASC, u.full_name ASC
    `;

    const result = await pool.query(query);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur getSchoolAdminsHandler:', error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des admins d'école",
    });
  }
}
