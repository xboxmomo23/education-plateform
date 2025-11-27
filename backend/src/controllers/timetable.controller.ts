import { Request, Response } from 'express';
import { TimetableModel } from '../models/timetable.model';
import { CourseTemplateModel } from '../models/course-template.model';
import pool from '../config/database';

// =========================
// RÉCUPÉRATION - CLASSIC (GARDER POUR COMPATIBILITÉ)
// =========================

/**
 * GET /api/timetable/class/:classId
 * Récupérer l'emploi du temps d'une classe (mode classic seulement)
 */
export async function getClassTimetableHandler(req: Request, res: Response) {
  try {
    const { classId } = req.params;
    const { week, startDate, endDate } = req.query;

    const entries = await TimetableModel.getEntriesByClass(
      classId,
      week as 'A' | 'B' | undefined
    );

    return res.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    console.error('Erreur getClassTimetableHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'emploi du temps',
    });
  }
}

/**
 * GET /api/timetable/teacher/:teacherId
 * Récupérer l'emploi du temps d'un professeur (mode classic seulement)
 */
export async function getTeacherTimetableHandler(req: Request, res: Response) {
  try {
    const { teacherId } = req.params;
    const { week } = req.query;

    const entries = await TimetableModel.getEntriesByTeacher(
      teacherId,
      week as 'A' | 'B' | undefined
    );

    return res.json({
      success: true,
      data: entries,
    });
  } catch (error) {
    console.error('Erreur getTeacherTimetableHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'emploi du temps',
    });
  }
}

// =========================
// ✨ NOUVEAUX HANDLERS - ÉLÈVE & PROFESSEUR (AVEC DÉTECTION AUTO)
// =========================

/**
 * GET /api/timetable/class/:classId/week/:weekStartDate
 * Récupérer l'emploi du temps d'une classe pour une semaine spécifique
 * Détection automatique du mode (dynamic prioritaire)
 */
export async function getClassTimetableForWeekHandler(req: Request, res: Response) {
  try {
    const { classId, weekStartDate } = req.params;

    console.log(`📅 Récupération emploi du temps - Classe: ${classId}, Semaine: ${weekStartDate}`);

    // 1. VÉRIFIER SI MODE DYNAMIC (instances existent pour cette semaine)
    const instancesQuery = `
      SELECT 
        ti.id,
        ti.day_of_week,
        ti.start_time,
        ti.end_time,
        ti.room,
        ti.notes,
        ti.week_start_date,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        u.full_name as teacher_name,
        c.teacher_id
      FROM timetable_instances ti
      JOIN courses c ON ti.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON c.teacher_id = u.id
      WHERE ti.class_id = $1
        AND ti.week_start_date = $2
      ORDER BY ti.day_of_week, ti.start_time
    `;

    const instancesResult = await pool.query(instancesQuery, [classId, weekStartDate]);

    // VÉRIFIER SI LA CLASSE UTILISE LE MODE DYNAMIC
    // (En regardant s'il existe au moins une instance pour cette classe, n'importe quelle semaine)
    const checkDynamicQuery = `
      SELECT EXISTS(
        SELECT 1 FROM timetable_instances 
        WHERE class_id = $1 
        LIMIT 1
      ) as uses_dynamic
    `;
    const checkResult = await pool.query(checkDynamicQuery, [classId]);
    const usesDynamicMode = checkResult.rows[0].uses_dynamic;

    if (instancesResult.rows.length > 0) {
      // MODE DYNAMIC DÉTECTÉ
      console.log(`✅ Mode DYNAMIC détecté - ${instancesResult.rows.length} cours trouvés`);

      const courses = instancesResult.rows.map((row: any) => ({
        id: row.id,
        subject_name: row.subject_name,
        subject_code: row.subject_code,
        subject_color: row.subject_color,
        teacher_name: row.teacher_name,
        teacher_id: row.teacher_id,
        day_of_week: row.day_of_week,
        start_time: row.start_time,
        end_time: row.end_time,
        room: row.room,
        notes: row.notes,
        status: 'normal', // Par défaut normal (pas de colonne status dans timetable_instances)
        week_start_date: row.week_start_date,
      }));

      return res.json({
        success: true,
        data: {
          mode: 'dynamic',
          courses: courses,
        },
      });
    }

    // SI LA CLASSE UTILISE LE MODE DYNAMIC MAIS PAS D'INSTANCES CETTE SEMAINE
    // → Retourner un tableau VIDE (ne pas fallback sur le template)
    if (usesDynamicMode) {
      console.log(`📭 Mode DYNAMIC - Aucun cours pour cette semaine`);
      return res.json({
        success: true,
        data: {
          mode: 'dynamic',
          courses: [], // Tableau vide
        },
      });
    }

    // 2. MODE CLASSIC (récupérer entries + overrides)
    console.log(`🔵 Mode CLASSIC détecté - Récupération entries + overrides`);

    const entriesQuery = `
      SELECT 
        te.id,
        te.day_of_week,
        te.start_time,
        te.end_time,
        te.room,
        te.notes,
        te.week,
        s.name as subject_name,
        s.code as subject_code,
        s.color as subject_color,
        u.full_name as teacher_name,
        c.teacher_id
      FROM timetable_entries te
      JOIN courses c ON te.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON c.teacher_id = u.id
      WHERE c.class_id = $1
      ORDER BY te.day_of_week, te.start_time
    `;

    const entriesResult = await pool.query(entriesQuery, [classId]);

    // Récupérer les overrides pour cette semaine
    const overridesQuery = `
      SELECT 
        o.id,
        o.template_entry_id,
        o.override_date,
        o.override_type,
        o.new_start_time,
        o.new_end_time,
        o.new_room,
        o.reason,
        o.notes
      FROM timetable_overrides o
      WHERE o.override_date >= $1 
        AND o.override_date < $1::date + interval '5 days'
        AND o.template_entry_id IN (
          SELECT te.id FROM timetable_entries te
          JOIN courses c ON te.course_id = c.id
          WHERE c.class_id = $2
        )
    `;

    const overridesResult = await pool.query(overridesQuery, [weekStartDate, classId]);

    // Créer un map des overrides par template_entry_id et date
    const overridesMap: { [key: string]: any } = {};
    overridesResult.rows.forEach((override: any) => {
      const key = `${override.template_entry_id}_${override.override_date}`;
      overridesMap[key] = override;
    });

    // Appliquer les overrides aux entries
    const courses = [];
    for (const entry of entriesResult.rows) {
      // Pour chaque jour de la semaine (Dimanche à Jeudi = 0 à 4 jours après weekStartDate)
      for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
        if (entry.day_of_week === dayOffset + 1) {
          // Calculer la date spécifique
          const specificDate = new Date(weekStartDate);
          specificDate.setDate(specificDate.getDate() + dayOffset);
          const dateStr = specificDate.toISOString().split('T')[0];

          const overrideKey = `${entry.id}_${dateStr}`;
          const override = overridesMap[overrideKey];

          if (override && override.override_type === 'cancelled') {
            // Cours annulé
            courses.push({
              id: entry.id,
              subject_name: entry.subject_name,
              subject_code: entry.subject_code,
              subject_color: entry.subject_color,
              teacher_name: entry.teacher_name,
              teacher_id: entry.teacher_id,
              day_of_week: entry.day_of_week,
              start_time: entry.start_time,
              end_time: entry.end_time,
              room: entry.room,
              notes: entry.notes,
              status: 'cancelled',
              override_reason: override.reason,
              override_date: dateStr,
            });
          } else if (override && override.override_type === 'modified') {
            // Cours modifié
            courses.push({
              id: entry.id,
              subject_name: entry.subject_name,
              subject_code: entry.subject_code,
              subject_color: entry.subject_color,
              teacher_name: entry.teacher_name,
              teacher_id: entry.teacher_id,
              day_of_week: entry.day_of_week,
              start_time: override.new_start_time || entry.start_time,
              end_time: override.new_end_time || entry.end_time,
              room: override.new_room || entry.room,
              notes: override.notes || entry.notes,
              status: 'modified',
              modifications: {
                original_start_time: entry.start_time,
                original_end_time: entry.end_time,
                original_room: entry.room,
                new_start_time: override.new_start_time,
                new_end_time: override.new_end_time,
                new_room: override.new_room,
              },
              override_reason: override.reason,
              override_date: dateStr,
            });
          } else {
            // Cours normal (pas d'override)
            courses.push({
              id: entry.id,
              subject_name: entry.subject_name,
              subject_code: entry.subject_code,
              subject_color: entry.subject_color,
              teacher_name: entry.teacher_name,
              teacher_id: entry.teacher_id,
              day_of_week: entry.day_of_week,
              start_time: entry.start_time,
              end_time: entry.end_time,
              room: entry.room,
              notes: entry.notes,
              status: 'normal',
            });
          }
        }
      }
    }

    console.log(`✅ Mode CLASSIC - ${courses.length} cours après application overrides`);

    return res.json({
      success: true,
      data: {
        mode: 'classic',
        courses: courses,
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
 * GET /api/timetable/teacher/:teacherId/week/:weekStartDate
 * Récupérer l'emploi du temps d'un professeur pour une semaine spécifique
 * Agrège tous les cours de toutes ses classes
 */
export async function getTeacherTimetableForWeekHandler(req: Request, res: Response) {
  try {
    const { teacherId, weekStartDate } = req.params;

    console.log(`📅 Récupération emploi du temps professeur - Teacher: ${teacherId}, Semaine: ${weekStartDate}`);

    // 1. Récupérer toutes les classes du professeur
    const classesQuery = `
      SELECT DISTINCT c.id as class_id, c.label as class_label
      FROM courses co
      JOIN classes c ON co.class_id = c.id
      WHERE co.teacher_id = $1
    `;

    const classesResult = await pool.query(classesQuery, [teacherId]);

    if (classesResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          mode: 'mixed',
          courses: [],
        },
      });
    }

    const allCourses: any[] = [];

    // 2. Pour chaque classe, récupérer les cours
    for (const classRow of classesResult.rows) {
      const { class_id, class_label } = classRow;

      // Vérifier mode dynamic
      const instancesQuery = `
        SELECT 
          ti.id,
          ti.day_of_week,
          ti.start_time,
          ti.end_time,
          ti.room,
          ti.notes,
          ti.week_start_date,
          s.name as subject_name,
          s.code as subject_code,
          s.color as subject_color,
          c.class_id
        FROM timetable_instances ti
        JOIN courses c ON ti.course_id = c.id
        JOIN subjects s ON c.subject_id = s.id
        WHERE ti.class_id = $1
          AND ti.week_start_date = $2
          AND c.teacher_id = $3
        ORDER BY ti.day_of_week, ti.start_time
      `;

      const instancesResult = await pool.query(instancesQuery, [class_id, weekStartDate, teacherId]);

      // Vérifier si cette classe utilise le mode dynamic
      const checkDynamicQuery = `
        SELECT EXISTS(
          SELECT 1 FROM timetable_instances 
          WHERE class_id = $1 
          LIMIT 1
        ) as uses_dynamic
      `;
      const checkResult = await pool.query(checkDynamicQuery, [class_id]);
      const usesDynamicMode = checkResult.rows[0].uses_dynamic;

      if (instancesResult.rows.length > 0) {
        // Mode dynamic pour cette classe
        instancesResult.rows.forEach((row: any) => {
          allCourses.push({
            id: row.id,
            subject_name: row.subject_name,
            subject_code: row.subject_code,
            subject_color: row.subject_color,
            class_label: class_label,
            class_id: row.class_id,
            day_of_week: row.day_of_week,
            start_time: row.start_time,
            end_time: row.end_time,
            room: row.room,
            notes: row.notes,
            status: 'normal', // Par défaut normal (pas de colonne status dans timetable_instances)
            week_start_date: row.week_start_date,
          });
        });
      } else if (!usesDynamicMode) {
        // Mode classic pour cette classe (UNIQUEMENT si la classe n'utilise PAS le mode dynamic)
        const entriesQuery = `
          SELECT 
            te.id,
            te.day_of_week,
            te.start_time,
            te.end_time,
            te.room,
            te.notes,
            te.week,
            s.name as subject_name,
            s.code as subject_code,
            s.color as subject_color,
            c.class_id
          FROM timetable_entries te
          JOIN courses c ON te.course_id = c.id
          JOIN subjects s ON c.subject_id = s.id
          WHERE c.class_id = $1
            AND c.teacher_id = $2
          ORDER BY te.day_of_week, te.start_time
        `;

        const entriesResult = await pool.query(entriesQuery, [class_id, teacherId]);

        // Récupérer les overrides
        const overridesQuery = `
          SELECT 
            o.id,
            o.template_entry_id,
            o.override_date,
            o.override_type,
            o.new_start_time,
            o.new_end_time,
            o.new_room,
            o.reason,
            o.notes
          FROM timetable_overrides o
          WHERE o.override_date >= $1 
            AND o.override_date < $1::date + interval '5 days'
            AND o.template_entry_id IN (
              SELECT te.id FROM timetable_entries te
              JOIN courses c ON te.course_id = c.id
              WHERE c.class_id = $2 AND c.teacher_id = $3
            )
        `;

        const overridesResult = await pool.query(overridesQuery, [weekStartDate, class_id, teacherId]);

        const overridesMap: { [key: string]: any } = {};
        overridesResult.rows.forEach((override: any) => {
          const key = `${override.template_entry_id}_${override.override_date}`;
          overridesMap[key] = override;
        });

        // Appliquer overrides
        for (const entry of entriesResult.rows) {
          for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
            if (entry.day_of_week === dayOffset + 1) {
              const specificDate = new Date(weekStartDate);
              specificDate.setDate(specificDate.getDate() + dayOffset);
              const dateStr = specificDate.toISOString().split('T')[0];

              const overrideKey = `${entry.id}_${dateStr}`;
              const override = overridesMap[overrideKey];

              if (override && override.override_type === 'cancelled') {
                allCourses.push({
                  id: entry.id,
                  subject_name: entry.subject_name,
                  subject_code: entry.subject_code,
                  subject_color: entry.subject_color,
                  class_label: class_label,
                  class_id: entry.class_id,
                  day_of_week: entry.day_of_week,
                  start_time: entry.start_time,
                  end_time: entry.end_time,
                  room: entry.room,
                  notes: entry.notes,
                  status: 'cancelled',
                  override_reason: override.reason,
                  override_date: dateStr,
                });
              } else if (override && override.override_type === 'modified') {
                allCourses.push({
                  id: entry.id,
                  subject_name: entry.subject_name,
                  subject_code: entry.subject_code,
                  subject_color: entry.subject_color,
                  class_label: class_label,
                  class_id: entry.class_id,
                  day_of_week: entry.day_of_week,
                  start_time: override.new_start_time || entry.start_time,
                  end_time: override.new_end_time || entry.end_time,
                  room: override.new_room || entry.room,
                  notes: override.notes || entry.notes,
                  status: 'modified',
                  modifications: {
                    original_start_time: entry.start_time,
                    original_end_time: entry.end_time,
                    original_room: entry.room,
                    new_start_time: override.new_start_time,
                    new_end_time: override.new_end_time,
                    new_room: override.new_room,
                  },
                  override_reason: override.reason,
                  override_date: dateStr,
                });
              } else {
                allCourses.push({
                  id: entry.id,
                  subject_name: entry.subject_name,
                  subject_code: entry.subject_code,
                  subject_color: entry.subject_color,
                  class_label: class_label,
                  class_id: entry.class_id,
                  day_of_week: entry.day_of_week,
                  start_time: entry.start_time,
                  end_time: entry.end_time,
                  room: entry.room,
                  notes: entry.notes,
                  status: 'normal',
                });
              }
            }
          }
        }
      }
    }

    // Trier tous les cours par jour et heure
    allCourses.sort((a, b) => {
      if (a.day_of_week !== b.day_of_week) {
        return a.day_of_week - b.day_of_week;
      }
      return a.start_time.localeCompare(b.start_time);
    });

    console.log(`✅ Professeur - ${allCourses.length} cours trouvés`);

    return res.json({
      success: true,
      data: {
        mode: 'mixed',
        courses: allCourses,
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

// =========================
// AUTRES HANDLERS (GARDER INCHANGÉS)
// =========================

/**
 * GET /api/timetable/courses/:classId
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
    console.error('Erreur getAvailableCoursesHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des cours',
    });
  }
}

// =========================
// TEMPLATES
// =========================

export async function getTemplatesByClassHandler(req: Request, res: Response) {
  try {
    const { classId } = req.params;
    const { userId, role } = req.user!;

    if (role === 'staff') {
      const staffCheck = await pool.query(
        'SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2',
        [classId, userId]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    }

    const templates = await CourseTemplateModel.getTemplatesByClass(classId);

    return res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Erreur getTemplatesByClassHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des templates',
    });
  }
}

export async function createTemplateHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { course_id, default_duration, default_room, display_order } = req.body;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    const courseQuery = 'SELECT c.*, cl.id as class_id FROM courses c JOIN classes cl ON c.class_id = cl.id WHERE c.id = $1';
    const courseResult = await pool.query(courseQuery, [course_id]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cours non trouvé',
      });
    }

    const course = courseResult.rows[0];

    if (role === 'staff') {
      const staffCheck = await pool.query(
        'SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2',
        [course.class_id, userId]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    }

    const exists = await CourseTemplateModel.existsForCourse(course_id);
    if (exists) {
      return res.status(409).json({
        success: false,
        error: 'Un template existe déjà pour ce cours',
      });
    }

    const template = await CourseTemplateModel.create({
      course_id,
      default_duration,
      default_room,
      display_order,
      created_by: userId,
    });

    const templateWithDetails = await CourseTemplateModel.getById(template.id);

    return res.json({
      success: true,
      message: 'Template créé avec succès',
      data: templateWithDetails,
    });
  } catch (error) {
    console.error('Erreur createTemplateHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du template',
    });
  }
}

export async function updateTemplateHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { id: templateId } = req.params;
    const updateData = req.body;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    const template = await CourseTemplateModel.getById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template non trouvé',
      });
    }

    if (role === 'staff') {
      const staffCheck = await pool.query(
        'SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2',
        [template.class_id, userId]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    }

    const updated = await CourseTemplateModel.update(templateId, updateData);
    const updatedWithDetails = await CourseTemplateModel.getById(updated.id);

    return res.json({
      success: true,
      message: 'Template mis à jour',
      data: updatedWithDetails,
    });
  } catch (error) {
    console.error('Erreur updateTemplateHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du template',
    });
  }
}

export async function deleteTemplateHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { id: templateId } = req.params;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    const template = await CourseTemplateModel.getById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template non trouvé',
      });
    }

    if (role === 'staff') {
      const staffCheck = await pool.query(
        'SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2',
        [template.class_id, userId]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    }

    await CourseTemplateModel.delete(templateId);

    return res.json({
      success: true,
      message: 'Template supprimé',
    });
  } catch (error) {
    console.error('Erreur deleteTemplateHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du template',
    });
  }
}

export async function createFromTemplateHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { template_id, day_of_week, start_time, room, notes } = req.body;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    const template = await CourseTemplateModel.getById(template_id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template non trouvé',
      });
    }

    if (role === 'staff') {
      const staffCheck = await pool.query(
        'SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2',
        [template.class_id, userId]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    }

    const [startH, startM] = start_time.split(':').map(Number);
    const totalMinutes = startH * 60 + startM + template.default_duration;
    const endH = Math.floor(totalMinutes / 60);
    const endM = totalMinutes % 60;
    const end_time = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

    const entry = await TimetableModel.createEntry({
      course_id: template.course_id,
      day_of_week,
      start_time,
      end_time,
      room: room || template.default_room,
      notes,
    });

    return res.json({
      success: true,
      message: 'Cours créé depuis le template',
      data: entry,
    });
  } catch (error) {
    console.error('Erreur createFromTemplateHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création depuis le template',
    });
  }
}

// =========================
// ENTRIES (GARDER)
// =========================

export async function createEntryHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const entryData = req.body;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    const courseQuery = 'SELECT c.*, cl.id as class_id FROM courses c JOIN classes cl ON c.class_id = cl.id WHERE c.id = $1';
    const courseResult = await pool.query(courseQuery, [entryData.course_id]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cours non trouvé',
      });
    }

    const course = courseResult.rows[0];

    if (role === 'staff') {
      const staffCheck = await pool.query(
        'SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2',
        [course.class_id, userId]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    }

    if (entryData.room) {
      const roomConflict = await TimetableModel.checkRoomConflict(
        entryData.day_of_week,
        entryData.start_time,
        entryData.end_time,
        entryData.room
      );

      if (roomConflict.hasConflict) {
        return res.status(409).json({
          success: false,
          error: 'Conflit de salle détecté',
          conflict: roomConflict.conflictDetails,
        });
      }
    }

    const teacherConflict = await TimetableModel.checkTeacherConflict(
      course.teacher_id,
      entryData.day_of_week,
      entryData.start_time,
      entryData.end_time
    );

    if (teacherConflict.hasConflict) {
      return res.status(409).json({
        success: false,
        error: 'Conflit de professeur détecté',
        conflict: teacherConflict.conflictDetails,
      });
    }

    const entry = await TimetableModel.createEntry(entryData);

    return res.json({
      success: true,
      message: 'Créneau créé avec succès',
      data: entry,
    });
  } catch (error) {
    console.error('Erreur createEntryHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du créneau',
    });
  }
}

export async function bulkCreateEntriesHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { entries } = req.body;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucun créneau fourni',
      });
    }

    const created = await TimetableModel.bulkCreateEntries(entries);

    return res.json({
      success: true,
      message: `${created.length} créneau(x) créé(s)`,
      data: created,
    });
  } catch (error) {
    console.error('Erreur bulkCreateEntriesHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la création en masse',
    });
  }
}

export async function updateEntryHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { id: entryId } = req.params;
    const updateData = req.body;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    const entryQuery = `
      SELECT t.*, c.class_id, c.teacher_id
      FROM timetable_entries t
      JOIN courses c ON t.course_id = c.id
      WHERE t.id = $1
    `;
    const entryResult = await pool.query(entryQuery, [entryId]);

    if (entryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Créneau non trouvé',
      });
    }

    const existingEntry = entryResult.rows[0];

    if (role === 'staff') {
      const staffCheck = await pool.query(
        'SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2',
        [existingEntry.class_id, userId]
      );
      if (staffCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    }

    if (updateData.start_time || updateData.end_time || updateData.day_of_week) {
      const dayOfWeek = updateData.day_of_week || existingEntry.day_of_week;
      const startTime = updateData.start_time || existingEntry.start_time;
      const endTime = updateData.end_time || existingEntry.end_time;
      const room = updateData.room || existingEntry.room;

      if (room) {
        const roomConflict = await TimetableModel.checkRoomConflict(
          dayOfWeek,
          startTime,
          endTime,
          room,
          entryId
        );

        if (roomConflict.hasConflict) {
          return res.status(409).json({
            success: false,
            error: 'Conflit de salle détecté',
            conflict: roomConflict.conflictDetails,
          });
        }
      }

      const teacherConflict = await TimetableModel.checkTeacherConflict(
        existingEntry.teacher_id,
        dayOfWeek,
        startTime,
        endTime,
        entryId
      );

      if (teacherConflict.hasConflict) {
        return res.status(409).json({
          success: false,
          error: 'Conflit de professeur détecté',
          conflict: teacherConflict.conflictDetails,
        });
      }
    }

    const updated = await TimetableModel.updateEntry(entryId, updateData);

    return res.json({
      success: true,
      message: 'Créneau mis à jour',
      data: updated,
    });
  } catch (error) {
    console.error('Erreur updateEntryHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour du créneau',
    });
  }
}

export async function deleteEntryHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { id: entryId } = req.params;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    if (role === 'staff') {
      const entryQuery = `
        SELECT c.class_id
        FROM timetable_entries t
        JOIN courses c ON t.course_id = c.id
        WHERE t.id = $1
      `;
      const entryResult = await pool.query(entryQuery, [entryId]);

      if (entryResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Créneau non trouvé',
        });
      }

      const staffCheck = await pool.query(
        'SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2',
        [entryResult.rows[0].class_id, userId]
      );

      if (staffCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas cette classe',
        });
      }
    }

    await TimetableModel.deleteEntry(entryId);

    return res.json({
      success: true,
      message: 'Créneau supprimé',
    });
  } catch (error) {
    console.error('Erreur deleteEntryHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du créneau',
    });
  }
}

export async function duplicateTimetableHandler(req: Request, res: Response) {
  try {
    const { userId, role } = req.user!;
    const { sourceClassId, targetClassId } = req.body;

    if (role !== 'staff' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Accès réservé au personnel',
      });
    }

    if (role === 'staff') {
      const staffCheck = await pool.query(
        `SELECT class_id FROM class_staff 
         WHERE user_id = $1 AND class_id IN ($2, $3)`,
        [userId, sourceClassId, targetClassId]
      );

      if (staffCheck.rows.length !== 2) {
        return res.status(403).json({
          success: false,
          error: 'Vous ne gérez pas ces classes',
        });
      }
    }

    const duplicated = await TimetableModel.duplicateToClass(sourceClassId, targetClassId);

    return res.json({
      success: true,
      message: `${duplicated.length} créneau(x) dupliqué(s)`,
      data: duplicated,
    });
  } catch (error) {
    console.error('Erreur duplicateTimetableHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la duplication',
    });
  }
}

export async function checkConflictsHandler(req: Request, res: Response) {
  try {
    const { course_id, day_of_week, start_time, end_time, room, exclude_entry_id } = req.body;

    const courseQuery = 'SELECT teacher_id FROM courses WHERE id = $1';
    const courseResult = await pool.query(courseQuery, [course_id]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cours non trouvé',
      });
    }

    const roomConflict = room
      ? await TimetableModel.checkRoomConflict(
          day_of_week,
          start_time,
          end_time,
          room,
          exclude_entry_id
        )
      : { hasConflict: false };

    const teacherConflict = await TimetableModel.checkTeacherConflict(
      courseResult.rows[0].teacher_id,
      day_of_week,
      start_time,
      end_time,
      exclude_entry_id
    );

    return res.json({
      success: true,
      data: {
        hasConflict: roomConflict.hasConflict || teacherConflict.hasConflict,
        conflicts: {
          room: roomConflict.hasConflict ? roomConflict.conflictDetails : null,
          teacher: teacherConflict.hasConflict ? teacherConflict.conflictDetails : null,
        },
      },
    });
  } catch (error) {
    console.error('Erreur checkConflictsHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification des conflits',
    });
  }
}



  /**
 * Récupérer les classes pour le staff
 */
export async function getStaffClassesHandler(req: Request, res: Response) {
  try {
    const query = `
      SELECT 
        c.id as class_id,
        c.label as class_label,
        c.level,
        c.code,
        COUNT(co.id) as course_count
      FROM classes c
      LEFT JOIN courses co ON co.class_id = c.id
      WHERE c.archived = false
      GROUP BY c.id, c.label, c.level, c.code
      ORDER BY c.level, c.label
    `;

    const result = await pool.query(query);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Erreur getStaffClassesHandler:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des classes',
    });
  }
}
