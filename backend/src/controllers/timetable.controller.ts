import { Request, Response } from 'express';
import pool from '../config/database';
import { TimetableModel, TimetableInstanceModel } from '../models/timetable.model';

// ============================================
// HANDLERS - INSTANCES (MODE DYNAMIC)
// ============================================

/**
 * Récupérer l'emploi du temps d'une classe pour une semaine spécifique
 * MODE DYNAMIC UNIQUEMENT
 */
export async function getClassTimetableForWeekHandler(req: Request, res: Response) {
  try {
    const { classId, weekStartDate } = req.params;

    console.log('📅 Récupération emploi du temps - Classe:', classId, ', Semaine:', weekStartDate);

    // Récupérer les instances pour cette semaine
    const instances = await TimetableInstanceModel.getInstancesForWeek(classId, weekStartDate);

    console.log(`✅ Mode DYNAMIC - ${instances.length} cours trouvés`);

    const courses = instances.map((instance: any) => ({
      id: instance.id,
      subject_name: instance.subject_name,
      subject_code: instance.subject_code,
      subject_color: instance.subject_color,
      teacher_name: instance.teacher_name,
      teacher_id: instance.teacher_id,
      day_of_week: instance.day_of_week,
      start_time: instance.start_time,
      end_time: instance.end_time,
      room: instance.room,
      notes: instance.notes,
      week_start_date: instance.week_start_date,
    }));

    return res.json({
      success: true,
      data: {
        mode: 'dynamic',
        courses,
      },
    });
  } catch (error) {
    console.error('Erreur getClassTimetableForWeekHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'emploi du temps',
    });
  }
}

/**
 * Récupérer l'emploi du temps d'un professeur pour une semaine spécifique
 * MODE DYNAMIC UNIQUEMENT
 */
export async function getTeacherTimetableForWeekHandler(req: Request, res: Response) {
  try {
    const { teacherId, weekStartDate } = req.params;

    console.log(`📅 Récupération emploi du temps professeur - Teacher: ${teacherId}, Semaine: ${weekStartDate}`);

    // Récupérer les instances pour cette semaine
    const instances = await TimetableInstanceModel.getInstancesForTeacher(teacherId, weekStartDate);

    console.log(`✅ Mode DYNAMIC - ${instances.length} cours trouvés`);

    const courses = instances.map((instance: any) => ({
      id: instance.id,
      subject_name: instance.subject_name,
      subject_code: instance.subject_code,
      subject_color: instance.subject_color,
      class_label: instance.class_label,
      class_id: instance.class_id,
      day_of_week: instance.day_of_week,
      start_time: instance.start_time,
      end_time: instance.end_time,
      room: instance.room,
      notes: instance.notes,
      week_start_date: instance.week_start_date,
    }));

    return res.json({
      success: true,
      data: {
        mode: 'dynamic',
        courses,
      },
    });
  } catch (error) {
    console.error('Erreur getTeacherTimetableForWeekHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'emploi du temps',
    });
  }
}

/**
 * Créer une instance
 */
export async function createInstanceHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const instanceData = {
      ...req.body,
      created_by: userId,
    };

    const instance = await TimetableInstanceModel.createInstance(instanceData);

    return res.status(201).json({
      success: true,
      data: instance,
    });
  } catch (error) {
    console.error('Erreur createInstance:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de l\'instance',
    });
  }
}

/**
 * Créer plusieurs instances en masse (génération depuis template)
 */
export async function bulkCreateInstancesHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { instances } = req.body;

    const instancesData = instances.map((inst: any) => ({
      ...inst,
      created_by: userId,
    }));

    const created = await TimetableInstanceModel.bulkCreateInstances(instancesData);

    return res.status(201).json({
      success: true,
      data: created,
      count: created.length,
    });
  } catch (error) {
    console.error('Erreur bulkCreateInstances:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création des instances',
    });
  }
}

/**
 * Mettre à jour une instance
 */
export async function updateInstanceHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const instance = await TimetableInstanceModel.updateInstance(id, updateData);

    return res.json({
      success: true,
      data: instance,
    });
  } catch (error: any) {
    console.error('Erreur updateInstance:', error);
    
    if (error.message === 'Instance non trouvée') {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de l\'instance',
    });
  }
}

/**
 * Supprimer une instance
 */
export async function deleteInstanceHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const instance = await TimetableInstanceModel.deleteInstance(id);

    return res.json({
      success: true,
      data: instance,
    });
  } catch (error: any) {
    console.error('Erreur deleteInstance:', error);
    
    if (error.message === 'Instance non trouvée') {
      return res.status(404).json({
        success: false,
        error: 'Instance non trouvée',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de l\'instance',
    });
  }
}

/**
 * Copier les instances d'une semaine vers une autre
 */
export async function copyWeekHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { classId, sourceWeekStart, targetWeekStart } = req.body;

    const copied = await TimetableInstanceModel.copyWeekToWeek(
      classId,
      sourceWeekStart,
      targetWeekStart,
      userId
    );

    return res.status(201).json({
      success: true,
      data: copied,
      count: copied.length,
    });
  } catch (error) {
    console.error('Erreur copyWeek:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la copie de la semaine',
    });
  }
}

// ============================================
// HANDLERS - TEMPLATES (Pour génération rapide)
// ============================================

/**
 * Récupérer les templates d'une classe
 */
export async function getTemplatesByClassHandler(req: Request, res: Response) {
  try {
    const { classId } = req.params;

    const result = await pool.query(
      `
      SELECT 
        ct.id,
        ct.course_id,
        ct.default_duration,
        ct.default_room,
        ct.display_order,
        s.name  AS subject_name,
        s.code  AS subject_code,
        s.color AS subject_color,
        u.full_name AS teacher_name,
        cl.label AS class_label,
        cl.id    AS class_id
      FROM course_templates ct
      JOIN courses   c  ON ct.course_id = c.id
      JOIN subjects  s  ON c.subject_id = s.id
      JOIN users     u  ON c.teacher_id = u.id
      JOIN classes   cl ON c.class_id = cl.id
      WHERE c.class_id = $1
      ORDER BY s.name, u.full_name
      `,
      [classId]
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur getTemplatesByClassHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des templates',
    });
  }
}


/**
 * Créer un template
 */
/**
 * Créer un template (course_templates)
 */
export async function createTemplateHandler(req: Request, res: Response) {
  try {
    const { course_id, default_duration, default_room, display_order } = req.body;
    const userId = req.user?.userId ?? null;

    // Empêcher les doublons de template pour un même cours
    const existing = await pool.query(
      'SELECT 1 FROM course_templates WHERE course_id = $1',
      [course_id]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Un template existe déjà pour ce cours',
      });
    }

    // Création du template dans course_templates
    const insertResult = await pool.query(
      `
      INSERT INTO course_templates (
        course_id,
        default_duration,
        default_room,
        display_order,
        created_by
      ) VALUES (
        $1,
        COALESCE($2, 90),
        $3,
        COALESCE($4, 0),
        $5
      )
      RETURNING id
      `,
      [
        course_id,
        default_duration ?? null,
        default_room ?? null,
        display_order ?? 0,
        userId,
      ]
    );

    const newId = insertResult.rows[0].id;

    // Recharger le template avec toutes les infos utiles pour le front
    const result = await pool.query(
      `
      SELECT 
        ct.id,
        ct.course_id,
        ct.default_duration,
        ct.default_room,
        ct.display_order,
        s.name  AS subject_name,
        s.code  AS subject_code,
        s.color AS subject_color,
        u.full_name AS teacher_name,
        cl.label AS class_label,
        cl.id    AS class_id
      FROM course_templates ct
      JOIN courses   c  ON ct.course_id = c.id
      JOIN subjects  s  ON c.subject_id = s.id
      JOIN users     u  ON c.teacher_id = u.id
      JOIN classes   cl ON c.class_id   = cl.id
      WHERE ct.id = $1
      `,
      [newId]
    );

    return res.status(201).json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erreur createTemplate:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du template',
    });
  }
}

/**
 * Mettre à jour un template
 */

/**
 * Mettre à jour un template
 */
export async function updateTemplateHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { default_duration, default_room } = req.body;

    console.log('📝 Mise à jour template:', { id, default_duration, default_room });

    if (default_duration === undefined && default_room === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Aucune donnée à mettre à jour',
      });
    }

    // Mise à jour
    const updateResult = await pool.query(
      `
      UPDATE course_templates 
      SET 
        default_duration = COALESCE($1, default_duration),
        default_room     = COALESCE($2, default_room),
        updated_at       = NOW()
      WHERE id = $3
      RETURNING id
      `,
      [default_duration ?? null, default_room ?? null, id]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template non trouvé',
      });
    }

    // Rechargement avec données enrichies
    const result = await pool.query(
      `
      SELECT 
        ct.id,
        ct.course_id,
        ct.default_duration,
        ct.default_room,
        ct.display_order,
        s.name  AS subject_name,
        s.code  AS subject_code,
        s.color AS subject_color,
        u.full_name AS teacher_name,
        cl.label AS class_label,
        cl.id    AS class_id
      FROM course_templates ct
      JOIN courses   c  ON ct.course_id = c.id
      JOIN subjects  s  ON c.subject_id = s.id
      JOIN users     u  ON c.teacher_id = u.id
      JOIN classes   cl ON c.class_id = cl.id       -- ✅ ICI on joint sur courses
      WHERE ct.id = $1
      `,
      [id]
    );

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Erreur updateTemplate:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du template',
    });
  }
}


/**
 * Supprimer un template
 */
export async function deleteTemplateHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM course_templates WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template non trouvé',
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Erreur deleteTemplate:', error);

    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du template',
    });
  }
}


/**
 * Générer des instances depuis les templates pour une période
 */
export async function generateFromTemplatesHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { classId, startDate, endDate } = req.body;

    // Récupérer les templates de la classe
    const templates = await TimetableModel.getEntriesByClass(classId);

    if (templates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun template trouvé pour cette classe',
      });
    }

    // Générer toutes les dates de début de semaine entre startDate et endDate
    const weekStarts: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Trouver le premier dimanche (jour 0)
    while (start.getDay() !== 0) {
      start.setDate(start.getDate() + 1);
    }

    while (start <= end) {
      weekStarts.push(start.toISOString().split('T')[0]);
      start.setDate(start.getDate() + 7);
    }

    // Créer les instances pour chaque semaine
    const instancesToCreate = [];

    for (const weekStart of weekStarts) {
      for (const template of templates) {
        instancesToCreate.push({
          course_id: template.course_id,
          class_id: classId,
          week_start_date: weekStart,
          day_of_week: template.day_of_week,
          start_time: template.start_time,
          end_time: template.end_time,
          room: template.room || undefined,
          notes: template.notes || undefined,
          created_from_template: true,
          template_entry_id: template.id,
          created_by: userId,
        });
      }
    }

    const created = await TimetableInstanceModel.bulkCreateInstances(instancesToCreate);

    return res.status(201).json({
      success: true,
      data: {
        weeksGenerated: weekStarts.length,
        instancesCreated: created.length,
        weekStarts,
      },
    });
  } catch (error) {
    console.error('Erreur generateFromTemplates:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération depuis les templates',
    });
  }
}

// ============================================
// HANDLERS - STAFF & UTILITAIRES
// ============================================

/**
 * Récupérer les classes gérées par le staff
 */
export async function getStaffClassesHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;

    const query = `
      SELECT DISTINCT
        c.id as class_id,
        c.label as class_label,
        c.code as class_code,
        c.level
      FROM classes c
      JOIN class_staff cs ON c.id = cs.class_id
      WHERE cs.user_id = $1
      ORDER BY c.level, c.label
    `;

    const result = await pool.query(query, [userId]);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur getStaffClasses:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des classes',
    });
  }
}

/**
 * Récupérer les cours disponibles pour une classe
 */
export async function getAvailableCoursesHandler(req: Request, res: Response) {
  try {
    const { classId } = req.params;

    const courses = await TimetableModel.getAvailableCoursesForClass(classId);

    return res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error('Erreur getAvailableCourses:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des cours',
    });
  }
}



/**
 * Mettre à jour un cours (staff)
 */
export async function updateCourseForStaffHandler(req: Request, res: Response) {
  try {
    const { courseId } = req.params;
    const { class_id, subject_id, teacher_id, default_room } = req.body;
    const { establishmentId } = req.user!;

    // 1. Vérifier que le cours existe et appartient à la classe
    const courseResult = await pool.query(
      `
      SELECT 
        id,
        class_id,
        establishment_id
      FROM courses
      WHERE id = $1
      `,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Cours non trouvé",
      });
    }

    const course = courseResult.rows[0];

    // 2. Vérifier que c'est bien une classe gérée par cet établissement
    if (
      establishmentId &&
      course.establishment_id &&
      course.establishment_id !== establishmentId
    ) {
      return res.status(403).json({
        success: false,
        error: "Cours invalide pour cet établissement",
      });
    }

    // 3. Mise à jour simple du cours (on fait confiance aux IDs reçus)
    await pool.query(
      `
      UPDATE courses
      SET 
        class_id = $1,
        subject_id = $2,
        teacher_id = $3,
        establishment_id = COALESCE(establishment_id, $4)
      WHERE id = $5
      `,
      [class_id, subject_id, teacher_id, establishmentId, courseId]
    );

    // 4. Mettre à jour la salle par défaut du template associé si fournie
    if (typeof default_room !== "undefined") {
      await pool.query(
        `
        UPDATE course_templates
        SET default_room = $1
        WHERE course_id = $2
        `,
        [default_room || null, courseId]
      );
    }

    // 5. Renvoyer la liste à jour des cours de la classe
    const courses = await TimetableModel.getAvailableCoursesForClass(class_id);

    return res.json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("Erreur updateCourseForStaffHandler:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la mise à jour du cours",
    });
  }
}


/**
 * Désactiver un cours (staff)
 * -> on fait un "soft delete" en mettant active = false
 */
export async function deleteCourseForStaffHandler(req: Request, res: Response) {
  try {
    const { courseId } = req.params;
    const { establishmentId } = req.user!;

    // 1. Vérifier que le cours existe
    const courseResult = await pool.query(
      `
      SELECT 
        id,
        class_id,
        establishment_id
      FROM courses
      WHERE id = $1
      `,
      [courseId]
    );

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cours non trouvé',
      });
    }

    const course = courseResult.rows[0];

    // 2. Vérifier l’appartenance à l’établissement
    if (course.establishment_id && establishmentId && course.establishment_id !== establishmentId) {
      return res.status(403).json({
        success: false,
        error: "Cours invalide pour cet établissement",
      });
    }

    // 3. Soft delete : on passe active = false
    await pool.query(
      `
      UPDATE courses
      SET active = false
      WHERE id = $1
      `,
      [courseId]
    );

    return res.json({
      success: true,
      message: 'Cours désactivé avec succès',
    });
  } catch (error) {
    console.error('Erreur deleteCourseForStaffHandler:', error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la suppression du cours",
    });
  }
}





// 🔹 Récupérer les matières visibles par un staff (en fonction de ses classes)
export async function getSubjectsForStaffHandler(req: Request, res: Response) {
  try {
    // ⚠️ MODE DEBUG : on ignore l'établissement, on renvoie toutes les matières
    const subjectsRes = await pool.query(
      `
      SELECT id, name, short_code, color, level, establishment_id
      FROM subjects
      ORDER BY name ASC
      `
    );

    return res.json({
      success: true,
      data: subjectsRes.rows,
    });
  } catch (error) {
    console.error("Erreur getSubjectsForStaff (DEBUG):", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des matières",
    });
  }
}



// 🔹 Récupérer les professeurs pour l'établissement du staff
// 🔹 Récupérer les professeurs pour l'établissement du staff
export async function getTeachersForStaffHandler(req: Request, res: Response) {
  try {
    // ⚠️ MODE DEBUG : on ignore l'établissement, on renvoie tous les profs
    const teachersRes = await pool.query(
      `
      SELECT id, full_name, email, role, active, establishment_id
      FROM users
      WHERE role = 'teacher'
      ORDER BY full_name ASC
      `
    );

    return res.json({
      success: true,
      data: teachersRes.rows,
    });
  } catch (error) {
    console.error("Erreur getTeachersForStaff (DEBUG):", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des professeurs",
    });
  }
}




// 🔹 Création d'un cours par le STAFF
export async function createCourseForStaffHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { class_id, subject_id, teacher_id, default_room } = req.body;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: "Accès réservé au staff / admin",
      });
    }

    // Vérifier que le staff gère bien cette classe
    const staffCheck = await pool.query(
      `
      SELECT 1
      FROM class_staff
      WHERE class_id = $1 AND user_id = $2
      `,
      [class_id, userId]
    );

    if (role === 'staff' && staffCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: "Vous ne gérez pas cette classe",
      });
    }

    // Récupérer infos de la classe (année + établissement)
    const classRes = await pool.query(
      `
      SELECT academic_year, establishment_id, label, code
      FROM classes
      WHERE id = $1
      `,
      [class_id]
    );

    if (classRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Classe non trouvée",
      });
    }

    const { academic_year, establishment_id, label, code } = classRes.rows[0];

    // Vérifier que la matière appartient bien à l'établissement
    const subjRes = await pool.query(
      `SELECT id FROM subjects WHERE id = $1 AND establishment_id = $2`,
      [subject_id, establishment_id]
    );
    if (subjRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Matière invalide pour cet établissement",
      });
    }

    // Vérifier que le prof appartient bien à l'établissement
    const teacherRes = await pool.query(
      `SELECT id FROM users WHERE id = $1 AND role = 'teacher' AND establishment_id = $2`,
      [teacher_id, establishment_id]
    );
    if (teacherRes.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Professeur invalide pour cet établissement",
      });
    }

    // 🧱 Création du cours
    const title = `${code ?? ''} ${label ?? ''}`.trim() || 'Cours';

    const insertRes = await pool.query(
      `
      INSERT INTO courses (
        subject_id,
        class_id,
        teacher_id,
        academic_year,
        title,
        active,
        establishment_id,
        default_room
      ) VALUES ($1,$2,$3,$4,$5,true,$6,$7)
      RETURNING id
      `,
      [subject_id, class_id, teacher_id, academic_year, title, establishment_id, default_room || null]
    );

    const courseId = insertRes.rows[0].id;

    // Retourner le cours dans le même format que getAvailableCoursesForClass
    const fullRes = await pool.query(
      `
      SELECT 
        c.id as course_id,
        c.title,
        sub.name as subject_name,
        sub.code as subject_code,
        sub.color as subject_color,
        u.full_name as teacher_name,
        u.id as teacher_id,
        c.class_id
      FROM courses c
      JOIN subjects sub ON c.subject_id = sub.id
      JOIN users u ON c.teacher_id = u.id
      WHERE c.id = $1
      `,
      [courseId]
    );

    return res.status(201).json({
      success: true,
      data: fullRes.rows[0],
    });
  } catch (error) {
    console.error("Erreur createCourseForStaff:", error);
    return res.status(500).json({
      success: false,
      error: "Erreur lors de la création du cours",
    });
  }
}





/**
 * Vérifier les conflits
 */
export async function checkConflictsHandler(req: Request, res: Response) {
  try {
    const {
      course_id,
      class_id,
      week_start_date,
      day_of_week,
      start_time,
      end_time,
      room,
      exclude_instance_id,
    } = req.body;

    const conflicts = [];

    // Récupérer les infos du cours
    const courseQuery = 'SELECT teacher_id FROM courses WHERE id = $1';
    const courseResult = await pool.query(courseQuery, [course_id]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cours non trouvé',
      });
    }

    const teacherId = courseResult.rows[0].teacher_id;

    // Vérifier conflit professeur
    const teacherConflict = await TimetableModel.checkTeacherConflict(
      teacherId,
      week_start_date,
      day_of_week,
      start_time,
      end_time,
      exclude_instance_id
    );

    if (teacherConflict.hasConflict) {
      conflicts.push({
        type: 'teacher',
        details: teacherConflict.conflictDetails,
      });
    }

    // Vérifier conflit salle (si une salle est spécifiée)
    if (room) {
      const roomConflict = await TimetableModel.checkRoomConflict(
        class_id,
        week_start_date,
        day_of_week,
        start_time,
        end_time,
        room,
        exclude_instance_id
      );

      if (roomConflict.hasConflict) {
        conflicts.push({
          type: 'room',
          details: roomConflict.conflictDetails,
        });
      }
    }

    return res.json({
      success: true,
      data: {
        hasConflicts: conflicts.length > 0,
        conflicts,
      },
    });
  } catch (error) {
    console.error('Erreur checkConflicts:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification des conflits',
    });
  }
}

// ============================================
// HANDLERS LEGACY (Pour compatibilité)
// ============================================

/**
 * @deprecated Utiliser getClassTimetableForWeekHandler à la place
 * Récupérer l'emploi du temps d'une classe (legacy)
 */
export async function getClassTimetableHandler(req: Request, res: Response) {
  try {
    const { classId } = req.params;
    
    // Rediriger vers la nouvelle API
    console.warn('⚠️ LEGACY API - Utiliser /class/:classId/week/:weekStartDate à la place');

    const entries = await TimetableModel.getEntriesByClass(classId);

    return res.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    console.error('Erreur getClassTimetable:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'emploi du temps',
    });
  }
}

/**
 * @deprecated Utiliser getTeacherTimetableForWeekHandler à la place
 * Récupérer l'emploi du temps d'un professeur (legacy)
 */
export async function getTeacherTimetableHandler(req: Request, res: Response) {
  try {
    const { teacherId } = req.params;
    
    console.warn('⚠️ LEGACY API - Utiliser /teacher/:teacherId/week/:weekStartDate à la place');

    // Retourner un tableau vide pour éviter les erreurs
    return res.json({
      success: true,
      data: [],
    });
  } catch (error) {
    console.error('Erreur getTeacherTimetable:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'emploi du temps',
    });
  }
}

// ============================================
// HANDLERS - ENTRIES (Templates uniquement)
// ============================================

export async function createEntryHandler(req: Request, res: Response) {
  try {
    const entry = await TimetableModel.createEntry(req.body);

    return res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error('Erreur createEntry:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du créneau',
    });
  }
}

export async function bulkCreateEntriesHandler(req: Request, res: Response) {
  try {
    const { entries } = req.body;

    const created = await TimetableModel.bulkCreateEntries(entries);

    return res.status(201).json({
      success: true,
      data: created,
    });
  } catch (error) {
    console.error('Erreur bulkCreateEntries:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création des créneaux',
    });
  }
}

export async function updateEntryHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const entry = await TimetableModel.updateEntry(id, req.body);

    return res.json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    console.error('Erreur updateEntry:', error);
    
    if (error.message === 'Template non trouvé') {
      return res.status(404).json({
        success: false,
        error: 'Créneau non trouvé',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du créneau',
    });
  }
}

export async function deleteEntryHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const entry = await TimetableModel.deleteEntry(id);

    return res.json({
      success: true,
      data: entry,
    });
  } catch (error: any) {
    console.error('Erreur deleteEntry:', error);
    
    if (error.message === 'Template non trouvé') {
      return res.status(404).json({
        success: false,
        error: 'Créneau non trouvé',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du créneau',
    });
  }
}

export async function createFromTemplateHandler(req: Request, res: Response) {
  try {
    const { template_id, ...entryData } = req.body;

    // Récupérer le template
    const templateQuery = 'SELECT * FROM timetable_entries WHERE id = $1';
    const templateResult = await pool.query(templateQuery, [template_id]);

    if (templateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template non trouvé',
      });
    }

    const template = templateResult.rows[0];

    // Créer l'entry avec les données du template
    const entry = await TimetableModel.createEntry({
      course_id: template.course_id,
      day_of_week: entryData.day_of_week,
      start_time: entryData.start_time,
      end_time: template.end_time,
      room: entryData.room || template.room,
      notes: entryData.notes || template.notes,
    });

    return res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    console.error('Erreur createFromTemplate:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création depuis le template',
    });
  }
}

export async function duplicateTimetableHandler(req: Request, res: Response) {
  try {
    return res.status(501).json({
      success: false,
      error: 'Fonctionnalité non implémentée en mode dynamic',
    });
  } catch (error) {
    console.error('Erreur duplicateTimetable:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur serveur',
    });
  }
}