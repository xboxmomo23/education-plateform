import { Request, Response } from 'express';
import pool from '../config/database';
import { createUser } from '../models/user.model';

// ===============================
// GET /api/super-admin/establishments
// Liste des établissements + nb d'admins
// ===============================
export async function getEstablishmentsForSuperAdminHandler(
  req: Request,
  res: Response
) {
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
        e.deleted_at,
        COUNT(DISTINCT u.id) AS admins_count
      FROM establishments e
      LEFT JOIN users u
        ON u.establishment_id = e.id
       AND u.role = 'admin'
      WHERE e.deleted_at IS NULL                -- ⬅️ on ne remonte pas les écoles supprimées
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `;

    const result = await pool.query(query);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Erreur getEstablishmentsForSuperAdminHandler:", error);
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
        u.establishment_id,
        e.name AS establishment_name,
        e.code AS establishment_code
      FROM users u
      LEFT JOIN establishments e
        ON e.id = u.establishment_id
      WHERE u.role = 'admin'
      ORDER BY
        e.name ASC NULLS LAST,
        u.full_name ASC
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



// ===============================
// POST /api/super-admin/school-admins
// Créer un admin d'école supplémentaire pour un établissement existant
// ===============================
export async function createSchoolAdminHandler(req: Request, res: Response) {
  const { establishment_id, admin_email, admin_full_name, admin_password } =
    req.body;

  if (!establishment_id || !admin_email || !admin_full_name) {
    return res.status(400).json({
      success: false,
      error:
        "establishment_id, admin_email et admin_full_name sont obligatoires",
    });
  }

  const finalPassword = admin_password || "admin123";

  try {
    // Vérifier que l'établissement existe
    const estResult = await pool.query(
      `
      SELECT id, name, code
      FROM establishments
      WHERE id = $1
    `,
      [establishment_id]
    );

    if (estResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Établissement introuvable",
      });
    }

    const establishment = estResult.rows[0];

    // Créer l'utilisateur admin
    const adminUser = await createUser({
      email: admin_email,
      password: finalPassword,
      role: "admin",
      full_name: admin_full_name,
      establishmentId: establishment_id,
    });

    return res.status(201).json({
      success: true,
      message: "Admin d'école créé avec succès",
      data: {
        admin: {
          id: adminUser.id,
          email: adminUser.email,
          full_name: adminUser.full_name,
          role: adminUser.role,
          active: adminUser.active,
          created_at: adminUser.created_at,
          establishment_id: establishment.id,
          establishment_name: establishment.name,
          establishment_code: establishment.code,
        },
        admin_initial_password: finalPassword,
      },
    });
  } catch (error: any) {
    console.error("Erreur createSchoolAdminHandler:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "Un utilisateur avec cet email existe déjà",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Erreur lors de la création de l'admin d'école",
    });
  }
}



// ===============================
// PATCH /api/super-admin/establishments/:id/status
// active = true/false  -> met à jour l'établissement + tous ses users
// ===============================
export async function updateEstablishmentStatusHandler(
  req: Request,
  res: Response
) {
  const { id } = req.params;
  const { active } = req.body as { active: boolean };

  if (typeof active !== "boolean") {
    return res.status(400).json({
      success: false,
      error: "Le champ 'active' (booléen) est obligatoire",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Mettre à jour l'établissement
    const estResult = await client.query(
      `
      UPDATE establishments
      SET active = $2,
          updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id, name, code, active
    `,
      [id, active]
    );

    if (estResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        error: "Établissement introuvable ou déjà supprimé",
      });
    }

    // 2) Mettre à jour tous les utilisateurs liés
    await client.query(
      `
      UPDATE users
      SET active = $2
      WHERE establishment_id = $1
    `,
      [id, active]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: active
        ? "Établissement réactivé et comptes réactivés"
        : "Établissement désactivé et comptes désactivés",
      data: estResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur updateEstablishmentStatusHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour du statut de l'établissement",
    });
  } finally {
    client.release();
  }
}


// ===============================
// DELETE /api/super-admin/establishments/:id
// Soft delete : marque deleted_at + désactive tout le monde
// ===============================
export async function softDeleteEstablishmentHandler(
  req: Request,
  res: Response
) {
  const { id } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1) Marquer l'établissement comme supprimé + inactif
    const estResult = await client.query(
      `
      UPDATE establishments
      SET active = false,
          deleted_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND deleted_at IS NULL
      RETURNING id, name, code, deleted_at
    `,
      [id]
    );

    if (estResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        error: "Établissement introuvable ou déjà supprimé",
      });
    }

    // 2) Désactiver tous les utilisateurs liés
    await client.query(
      `
      UPDATE users
      SET active = false
      WHERE establishment_id = $1
    `,
      [id]
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message:
        "Établissement marqué comme supprimé et tous les comptes désactivés.",
      data: estResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erreur softDeleteEstablishmentHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la suppression de l'établissement",
    });
  } finally {
    client.release();
  }
}


// ===============================
// PATCH /api/super-admin/school-admins/:id/status
// Activer / désactiver un admin d'école (user.role = 'admin')
// ===============================
export async function updateSchoolAdminStatusHandler(
  req: Request,
  res: Response
) {
  const { id } = req.params;
  const { active } = req.body as { active: boolean };

  if (typeof active !== "boolean") {
    return res.status(400).json({
      success: false,
      error: "Le champ 'active' (booléen) est obligatoire",
    });
  }

  try {
    // Vérifier que c'est bien un admin d'école
    const result = await pool.query(
      `
      UPDATE users
      SET active = $2
      WHERE id = $1
        AND role = 'admin'
      RETURNING id, email, full_name, role, active, establishment_id, created_at
    `,
      [id, active]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Admin d'école introuvable",
      });
    }

    return res.json({
      success: true,
      message: active
        ? "Admin d'école réactivé"
        : "Admin d'école désactivé",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur updateSchoolAdminStatusHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour du statut de l'admin d'école",
    });
  }
}
