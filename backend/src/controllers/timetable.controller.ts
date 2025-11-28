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

    const templates = await TimetableModel.getEntriesByClass(classId);

    return res.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Erreur getTemplates:', error);
    return res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des templates',
    });
  }
}

/**
 * Créer un template
 */
export async function createTemplateHandler(req: Request, res: Response) {
  try {
    const template = await TimetableModel.createEntry(req.body);

    return res.status(201).json({
      success: true,
      data: template,
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
export async function updateTemplateHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const template = await TimetableModel.updateEntry(id, req.body);

    return res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('Erreur updateTemplate:', error);
    
    if (error.message === 'Template non trouvé') {
      return res.status(404).json({
        success: false,
        error: 'Template non trouvé',
      });
    }

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

    const template = await TimetableModel.deleteEntry(id);

    return res.json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    console.error('Erreur deleteTemplate:', error);
    
    if (error.message === 'Template non trouvé') {
      return res.status(404).json({
        success: false,
        error: 'Template non trouvé',
      });
    }

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