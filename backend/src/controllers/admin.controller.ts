import { Request, Response } from "express";
import pool from "../config/database";
import { createUser } from "../models/user.model";

/**
 * Helper : récupère l'établissement de l'admin connecté
 */
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

/**
 * GET /api/admin/dashboard
 */
export async function getAdminDashboardHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;

    const estResult = await pool.query(
      `
      SELECT
        e.id,
        e.name,
        e.code,
        e.city,
        e.type,
        e.active,
        e.subscription_plan,
        e.subscription_start,
        e.subscription_end,
        e.created_at
      FROM establishments e
      JOIN users u ON u.establishment_id = e.id
      WHERE u.id = $1
        AND e.deleted_at IS NULL
    `,
      [userId]
    );

    if (estResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Établissement non trouvé pour cet admin",
      });
    }

    const establishment = estResult.rows[0];
    const estId = establishment.id;

    const [classesResult, studentsResult, teachersResult, staffResult] =
      await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS total_classes
           FROM classes
           WHERE establishment_id = $1`,
          [estId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total_students
           FROM students s
           JOIN classes c ON s.class_id = c.id
           WHERE c.establishment_id = $1`,
          [estId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total_teachers
           FROM users
           WHERE role = 'teacher'
             AND establishment_id = $1`,
          [estId]
        ),
        pool.query(
          `SELECT COUNT(*)::int AS total_staff
           FROM users
           WHERE role = 'staff'
             AND establishment_id = $1`,
          [estId]
        ),
      ]);

    const stats = {
      total_classes: classesResult.rows[0]?.total_classes ?? 0,
      total_students: studentsResult.rows[0]?.total_students ?? 0,
      total_teachers: teachersResult.rows[0]?.total_teachers ?? 0,
      total_staff: staffResult.rows[0]?.total_staff ?? 0,
    };

    return res.json({
      success: true,
      data: {
        establishment,
        stats,
      },
    });
  } catch (error) {
    console.error("Erreur getAdminDashboardHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors du chargement du tableau de bord admin",
    });
  }
}

/**
 * GET /api/admin/classes
 */
export async function getAdminClassesHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;

    const estId = await getAdminEstablishmentId(userId);
    if (!estId) {
      return res.status(404).json({
        success: false,
        error: "Établissement non trouvé pour cet admin",
      });
    }

    const classesResult = await pool.query(
      `
      SELECT
        id,
        code,
        label,
        academic_year,
        level,
        capacity,
        current_size,
        room,
        archived,
        created_at
      FROM classes
      WHERE establishment_id = $1
      ORDER BY academic_year DESC, label ASC
    `,
      [estId]
    );

    return res.json({
      success: true,
      data: classesResult.rows,
    });
  } catch (error) {
    console.error("Erreur getAdminClassesHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors du chargement des classes",
    });
  }
}

/**
 * POST /api/admin/classes
 */
export async function createClassForAdminHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { code, label, academic_year, level, capacity, room } = req.body;

    if (!code || !label || !academic_year) {
      return res.status(400).json({
        success: false,
        error: "Les champs code, label et academic_year sont obligatoires",
      });
    }

    const academicYearNum = Number(academic_year);
    const capacityNum = capacity ? Number(capacity) : null;

    if (Number.isNaN(academicYearNum)) {
      return res.status(400).json({
        success: false,
        error: "academic_year doit être un nombre",
      });
    }

    const estId = await getAdminEstablishmentId(userId);
    if (!estId) {
      return res.status(404).json({
        success: false,
        error: "Établissement non trouvé pour cet admin",
      });
    }

    const insertResult = await pool.query(
      `
      INSERT INTO classes (
        code,
        label,
        academic_year,
        level,
        capacity,
        room,
        establishment_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        code,
        label,
        academic_year,
        level,
        capacity,
        current_size,
        room,
        archived,
        created_at
    `,
      [code, label, academicYearNum, level || null, capacityNum, room || null, estId]
    );

    const newClass = insertResult.rows[0];

    return res.status(201).json({
      success: true,
      message: "Classe créée avec succès",
      data: newClass,
    });
  } catch (error: any) {
    console.error("Erreur createClassForAdminHandler:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error:
          "Une classe avec ce code existe déjà pour cette année scolaire",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Erreur lors de la création de la classe",
    });
  }
}

/**
 * PATCH /api/admin/classes/:id
 * (modifier label/capacity/room/archived)
 */
export async function updateClassForAdminHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const classId = req.params.id;
    const { label, capacity, room, archived } = req.body;

    const estId = await getAdminEstablishmentId(userId);
    if (!estId) {
      return res.status(404).json({
        success: false,
        error: "Établissement non trouvé pour cet admin",
      });
    }

    const result = await pool.query(
      `
      UPDATE classes
      SET
        label = COALESCE($1, label),
        capacity = COALESCE($2, capacity),
        room = COALESCE($3, room),
        archived = COALESCE($4, archived)
      WHERE id = $5
        AND establishment_id = $6
      RETURNING
        id,
        code,
        label,
        academic_year,
        level,
        capacity,
        current_size,
        room,
        archived,
        created_at
    `,
      [
        label ?? null,
        capacity ?? null,
        room ?? null,
        archived ?? null,
        classId,
        estId,
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Classe introuvable pour cet établissement",
      });
    }

    return res.json({
      success: true,
      message: "Classe mise à jour",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur updateClassForAdminHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour de la classe",
    });
  }
}

/**
 * GET /api/admin/students
 */
export async function getAdminStudentsHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;

    const estId = await getAdminEstablishmentId(userId);
    if (!estId) {
      return res.status(404).json({
        success: false,
        error: "Établissement non trouvé pour cet admin",
      });
    }

    const studentsResult = await pool.query(
      `
      SELECT
        s.id AS student_id,
        u.id AS user_id,
        u.full_name,
        u.email,
        u.active,
        s.student_number,
        s.date_of_birth,
        c.id AS class_id,
        c.label AS class_label,
        c.code AS class_code,
        c.level,
        c.academic_year
      FROM students s
      JOIN users u ON u.id = s.user_id
      JOIN classes c ON c.id = s.class_id
      WHERE c.establishment_id = $1
      ORDER BY c.academic_year DESC, c.label ASC, u.full_name ASC
    `,
      [estId]
    );

    return res.json({
      success: true,
      data: studentsResult.rows,
    });
  } catch (error) {
    console.error("Erreur getAdminStudentsHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors du chargement des élèves",
    });
  }
}

/**
 * POST /api/admin/students
 */
export async function createStudentForAdminHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const {
      full_name,
      email,
      password,
      class_id,
      student_number,
      date_of_birth,
    } = req.body;

    if (!full_name || !email || !class_id) {
      return res.status(400).json({
        success: false,
        error:
          "Les champs full_name, email et class_id sont obligatoires pour créer un élève",
      });
    }

    const initialPassword: string = password || "eleve123";

    const estId = await getAdminEstablishmentId(userId);
    if (!estId) {
      return res.status(404).json({
        success: false,
        error: "Établissement non trouvé pour cet admin",
      });
    }

    const classResult = await pool.query(
      `
      SELECT id, code, label
      FROM classes
      WHERE id = $1
        AND establishment_id = $2
    `,
      [class_id, estId]
    );

    if (classResult.rowCount === 0) {
      return res.status(400).json({
        success: false,
        error:
          "La classe choisie n'appartient pas à votre établissement ou n'existe pas",
      });
    }

    const user = await createUser({
      email,
      password: initialPassword,
      role: "student",
      full_name,
      establishmentId: estId,
    });

    const studentInsert = await pool.query(
      `
      INSERT INTO students (
        user_id,
        class_id,
        student_number,
        date_of_birth
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, class_id, student_number, date_of_birth, created_at
    `,
      [
        user.id,
        class_id,
        student_number || null,
        date_of_birth ? new Date(date_of_birth) : null,
      ]
    );

    const student = studentInsert.rows[0];

    return res.status(201).json({
      success: true,
      message: "Élève créé avec succès",
      data: {
        student,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          active: user.active,
        },
        initial_password: initialPassword,
      },
    });
  } catch (error: any) {
    console.error("Erreur createStudentForAdminHandler:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "Un utilisateur avec cet email existe déjà",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Erreur lors de la création de l'élève",
    });
  }
}

/**
 * PATCH /api/admin/students/:userId/status
 * (activer/désactiver un élève via users.active)
 */
export async function updateStudentStatusHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const targetUserId = req.params.userId;
    const { active } = req.body as { active: boolean };

    const estId = await getAdminEstablishmentId(userId);
    if (!estId) {
      return res.status(404).json({
        success: false,
        error: "Établissement non trouvé pour cet admin",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET active = $1
      WHERE id = $2
        AND role = 'student'
        AND establishment_id = $3
    `,
      [active, targetUserId, estId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Élève introuvable pour cet établissement",
      });
    }

    return res.json({
      success: true,
      message: "Statut de l'élève mis à jour",
    });
  } catch (error) {
    console.error("Erreur updateStudentStatusHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour du statut de l'élève",
    });
  }
}


/**
 * GET /api/admin/teachers
 * Liste des professeurs de l'établissement de l'admin
 */
export async function getAdminTeachersHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;

    const estId = await getAdminEstablishmentId(userId);
    if (!estId) {
      return res.status(404).json({
        success: false,
        error: "Établissement non trouvé pour cet admin",
      });
    }

    const result = await pool.query(
      `
      SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        u.active,
        tp.employee_no,
        tp.hire_date,
        tp.specialization,
        tp.phone,
        tp.office_room
      FROM users u
      LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
      WHERE u.role = 'teacher'
        AND u.establishment_id = $1
      ORDER BY u.full_name ASC
    `,
      [estId]
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Erreur getAdminTeachersHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors du chargement des professeurs",
    });
  }
}

/**
 * POST /api/admin/teachers
 * Création d'un professeur (user + teacher_profile)
 */
export async function createTeacherForAdminHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const {
      full_name,
      email,
      password,
      employee_no,
      hire_date,
      specialization,
      phone,
      office_room,
    } = req.body;

    if (!full_name || !email) {
      return res.status(400).json({
        success: false,
        error: "Les champs 'full_name' et 'email' sont obligatoires",
      });
    }

    const initialPassword: string = password || "prof123";

    const estId = await getAdminEstablishmentId(userId);
    if (!estId) {
      return res.status(404).json({
        success: false,
        error: "Établissement non trouvé pour cet admin",
      });
    }

    // Création du user
    const user = await createUser({
      email,
      password: initialPassword,
      role: "teacher",
      full_name,
      establishmentId: estId,
    });

    // Création du profil professeur
    const profileInsert = await pool.query(
      `
      INSERT INTO teacher_profiles (
        user_id,
        employee_no,
        hire_date,
        specialization,
        phone,
        office_room
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, employee_no, hire_date, specialization, phone, office_room
    `,
      [
        user.id,
        employee_no || null,
        hire_date ? new Date(hire_date) : null,
        specialization || null,
        phone || null,
        office_room || null,
      ]
    );

    const profile = profileInsert.rows[0];

    return res.status(201).json({
      success: true,
      message: "Professeur créé avec succès",
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          active: user.active,
        },
        profile,
        initial_password: initialPassword,
      },
    });
  } catch (error: any) {
    console.error("Erreur createTeacherForAdminHandler:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "Un utilisateur avec cet email existe déjà",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Erreur lors de la création du professeur",
    });
  }
}

/**
 * PATCH /api/admin/teachers/:userId
 * Mise à jour du profil + user (nom, email, téléphone, spécialité, etc.)
 */
export async function updateTeacherForAdminHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const targetUserId = req.params.userId;

    const {
      full_name,
      email,
      employee_no,
      hire_date,
      specialization,
      phone,
      office_room,
    } = req.body;

    const estId = await getAdminEstablishmentId(userId);
    if (!estId) {
      return res.status(404).json({
        success: false,
        error: "Établissement non trouvé pour cet admin",
      });
    }

    // Vérifier que le user est bien un prof de cet établissement
    const teacherResult = await pool.query(
      `
      SELECT id, role, establishment_id
      FROM users
      WHERE id = $1
        AND establishment_id = $2
        AND role = 'teacher'
    `,
      [targetUserId, estId]
    );

    if (teacherResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Professeur introuvable pour cet établissement",
      });
    }

    // Mise à jour de la table users (nom / email)
    if (full_name || email) {
      await pool.query(
        `
        UPDATE users
        SET
          full_name = COALESCE($1, full_name),
          email = COALESCE($2, email)
        WHERE id = $3
      `,
        [full_name ?? null, email ?? null, targetUserId]
      );
    }

    // Vérifier si un profil professeur existe déjà
    const profileResult = await pool.query(
      `SELECT user_id FROM teacher_profiles WHERE user_id = $1 LIMIT 1`,
      [targetUserId]
    );

    let profileRow;

    if (profileResult.rowCount === 0) {
      // Pas de profil => INSERT
      const insertProfile = await pool.query(
        `
        INSERT INTO teacher_profiles (
          user_id,
          employee_no,
          hire_date,
          specialization,
          phone,
          office_room
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING user_id, employee_no, hire_date, specialization, phone, office_room
      `,
        [
          targetUserId,
          employee_no || null,
          hire_date ? new Date(hire_date) : null,
          specialization || null,
          phone || null,
          office_room || null,
        ]
      );
      profileRow = insertProfile.rows[0];
    } else {
      // Profil existe => UPDATE
      const updateProfile = await pool.query(
        `
        UPDATE teacher_profiles
        SET
          employee_no = COALESCE($2, employee_no),
          hire_date = COALESCE($3, hire_date),
          specialization = COALESCE($4, specialization),
          phone = COALESCE($5, phone),
          office_room = COALESCE($6, office_room)
        WHERE user_id = $1
        RETURNING user_id, employee_no, hire_date, specialization, phone, office_room
      `,
        [
          targetUserId,
          employee_no || null,
          hire_date ? new Date(hire_date) : null,
          specialization || null,
          phone || null,
          office_room || null,
        ]
      );
      profileRow = updateProfile.rows[0];
    }

    // Retourner les données à jour
    const finalResult = await pool.query(
      `
      SELECT
        u.id AS user_id,
        u.full_name,
        u.email,
        u.active,
        tp.employee_no,
        tp.hire_date,
        tp.specialization,
        tp.phone,
        tp.office_room
      FROM users u
      LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
      WHERE u.id = $1
    `,
      [targetUserId]
    );

    return res.json({
      success: true,
      message: "Professeur mis à jour avec succès",
      data: finalResult.rows[0],
    });
  } catch (error: any) {
    console.error("Erreur updateTeacherForAdminHandler:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        error: "Un utilisateur avec cet email existe déjà",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour du professeur",
    });
  }
}

/**
 * PATCH /api/admin/teachers/:userId/status
 * Activer / désactiver un professeur
 */
export async function updateTeacherStatusHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const targetUserId = req.params.userId;
    const { active } = req.body as { active: boolean };

    const estId = await getAdminEstablishmentId(userId);
    if (!estId) {
      return res.status(404).json({
        success: false,
        error: "Établissement non trouvé pour cet admin",
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET active = $1
      WHERE id = $2
        AND role = 'teacher'
        AND establishment_id = $3
    `,
      [active, targetUserId, estId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Professeur introuvable pour cet établissement",
      });
    }

    return res.json({
      success: true,
      message: "Statut du professeur mis à jour",
    });
  } catch (error) {
    console.error("Erreur updateTeacherStatusHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour du statut du professeur",
    });
  }
}
