"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClassTimetableHandler = getClassTimetableHandler;
exports.getTeacherTimetableHandler = getTeacherTimetableHandler;
exports.getAvailableCoursesHandler = getAvailableCoursesHandler;
exports.getTemplatesByClassHandler = getTemplatesByClassHandler;
exports.createTemplateHandler = createTemplateHandler;
exports.updateTemplateHandler = updateTemplateHandler;
exports.deleteTemplateHandler = deleteTemplateHandler;
exports.createEntryFromTemplateHandler = createEntryFromTemplateHandler;
exports.createEntryHandler = createEntryHandler;
exports.bulkCreateEntriesHandler = bulkCreateEntriesHandler;
exports.updateEntryHandler = updateEntryHandler;
exports.deleteEntryHandler = deleteEntryHandler;
exports.duplicateTimetableHandler = duplicateTimetableHandler;
exports.checkConflictsHandler = checkConflictsHandler;
exports.getStaffClassesHandler = getStaffClassesHandler;
const timetable_model_1 = require("../models/timetable.model");
const course_template_model_1 = require("../models/course-template.model");
const database_1 = __importDefault(require("../config/database"));
// =========================
// RÉCUPÉRATION
// =========================
/**
 * GET /api/timetable/class/:classId
 * Récupérer l'emploi du temps d'une classe
 */
async function getClassTimetableHandler(req, res) {
    try {
        const { classId } = req.params;
        const { week, startDate, endDate } = req.query;
        const entries = await timetable_model_1.TimetableModel.getEntriesByClass(classId, week);
        return res.json({
            success: true,
            data: entries,
        });
    }
    catch (error) {
        console.error('Erreur getClassTimetableHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'emploi du temps',
        });
    }
}
/**
 * GET /api/timetable/teacher/:teacherId
 * Récupérer l'emploi du temps d'un professeur
 */
async function getTeacherTimetableHandler(req, res) {
    try {
        const { teacherId } = req.params;
        const { week } = req.query;
        const entries = await timetable_model_1.TimetableModel.getEntriesByTeacher(teacherId, week);
        return res.json({
            success: true,
            data: entries,
        });
    }
    catch (error) {
        console.error('Erreur getTeacherTimetableHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'emploi du temps',
        });
    }
}
/**
 * GET /api/timetable/courses/:classId
 * Récupérer les cours disponibles pour une classe
 */
async function getAvailableCoursesHandler(req, res) {
    try {
        const { classId } = req.params;
        const courses = await timetable_model_1.TimetableModel.getAvailableCoursesForClass(classId);
        return res.json({
            success: true,
            data: courses,
        });
    }
    catch (error) {
        console.error('Erreur getAvailableCoursesHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des cours',
        });
    }
}
// =========================
// TEMPLATES - NOUVEAUX HANDLERS
// =========================
/**
 * GET /api/timetable/templates/class/:classId
 * Récupérer les templates d'une classe
 */
async function getTemplatesByClassHandler(req, res) {
    try {
        const { classId } = req.params;
        const { userId, role } = req.user;
        // Vérifier les permissions si staff
        if (role === 'staff') {
            const staffCheck = await database_1.default.query('SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2', [classId, userId]);
            if (staffCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        const templates = await course_template_model_1.CourseTemplateModel.getTemplatesByClass(classId);
        return res.json({
            success: true,
            data: templates,
        });
    }
    catch (error) {
        console.error('Erreur getTemplatesByClassHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des templates',
        });
    }
}
/**
 * POST /api/timetable/templates
 * Créer un nouveau template
 */
async function createTemplateHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { course_id, default_duration, default_room, display_order } = req.body;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        // Vérifier que le cours existe
        const courseQuery = 'SELECT c.*, cl.id as class_id FROM courses c JOIN classes cl ON c.class_id = cl.id WHERE c.id = $1';
        const courseResult = await database_1.default.query(courseQuery, [course_id]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cours non trouvé',
            });
        }
        const course = courseResult.rows[0];
        // Si staff, vérifier qu'il gère cette classe
        if (role === 'staff') {
            const staffCheck = await database_1.default.query('SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2', [course.class_id, userId]);
            if (staffCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        // Vérifier si un template existe déjà pour ce cours
        const exists = await course_template_model_1.CourseTemplateModel.existsForCourse(course_id);
        if (exists) {
            return res.status(409).json({
                success: false,
                error: 'Un template existe déjà pour ce cours',
            });
        }
        // Créer le template
        const template = await course_template_model_1.CourseTemplateModel.create({
            course_id,
            default_duration,
            default_room,
            display_order,
            created_by: userId,
        });
        // Récupérer avec les détails
        const templateWithDetails = await course_template_model_1.CourseTemplateModel.getById(template.id);
        return res.json({
            success: true,
            message: 'Template créé avec succès',
            data: templateWithDetails,
        });
    }
    catch (error) {
        console.error('Erreur createTemplateHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du template',
        });
    }
}
/**
 * PUT /api/timetable/templates/:id
 * Modifier un template
 */
async function updateTemplateHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { id: templateId } = req.params;
        const updateData = req.body;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        // Vérifier que le template existe et permissions
        const template = await course_template_model_1.CourseTemplateModel.getById(templateId);
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template non trouvé',
            });
        }
        if (role === 'staff') {
            const staffCheck = await database_1.default.query('SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2', [template.class_id, userId]);
            if (staffCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        const updated = await course_template_model_1.CourseTemplateModel.update(templateId, updateData);
        const updatedWithDetails = await course_template_model_1.CourseTemplateModel.getById(updated.id);
        return res.json({
            success: true,
            message: 'Template mis à jour',
            data: updatedWithDetails,
        });
    }
    catch (error) {
        console.error('Erreur updateTemplateHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du template',
        });
    }
}
/**
 * DELETE /api/timetable/templates/:id
 * Supprimer un template
 */
async function deleteTemplateHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { id: templateId } = req.params;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        const template = await course_template_model_1.CourseTemplateModel.getById(templateId);
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template non trouvé',
            });
        }
        if (role === 'staff') {
            const staffCheck = await database_1.default.query('SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2', [template.class_id, userId]);
            if (staffCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        await course_template_model_1.CourseTemplateModel.delete(templateId);
        return res.json({
            success: true,
            message: 'Template supprimé',
        });
    }
    catch (error) {
        console.error('Erreur deleteTemplateHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression du template',
        });
    }
}
// =========================
// CRÉATION À PARTIR DE TEMPLATE
// =========================
/**
 * POST /api/timetable/entries/from-template
 * Créer un créneau à partir d'un template
 */
async function createEntryFromTemplateHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { template_id, day_of_week, start_time, room, notes } = req.body;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        // Récupérer le template avec détails
        const template = await course_template_model_1.CourseTemplateModel.getById(template_id);
        if (!template) {
            return res.status(404).json({
                success: false,
                error: 'Template non trouvé',
            });
        }
        // Vérifier permissions
        if (role === 'staff') {
            const staffCheck = await database_1.default.query('SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2', [template.class_id, userId]);
            if (staffCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        // Calculer end_time basé sur la durée du template
        const startParts = start_time.split(':');
        const startDate = new Date();
        startDate.setHours(parseInt(startParts[0]), parseInt(startParts[1]), 0);
        startDate.setMinutes(startDate.getMinutes() + template.default_duration);
        const end_time = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
        // Vérifier les conflits
        const roomToCheck = room || template.default_room;
        if (roomToCheck) {
            const roomConflict = await timetable_model_1.TimetableModel.checkRoomConflict(day_of_week, start_time, end_time, roomToCheck);
            if (roomConflict.hasConflict) {
                return res.status(409).json({
                    success: false,
                    error: 'Conflit de salle détecté',
                    conflict: roomConflict.conflictDetails,
                });
            }
        }
        // Récupérer teacher_id depuis le template
        const teacherConflict = await timetable_model_1.TimetableModel.checkTeacherConflict(template.teacher_id, day_of_week, start_time, end_time);
        if (teacherConflict.hasConflict) {
            return res.status(409).json({
                success: false,
                error: 'Conflit de professeur détecté',
                conflict: teacherConflict.conflictDetails,
            });
        }
        // Créer le créneau
        const entry = await timetable_model_1.TimetableModel.createEntry({
            course_id: template.course_id,
            day_of_week,
            start_time,
            end_time,
            room: roomToCheck,
            notes,
        });
        // Lier au template
        await database_1.default.query('UPDATE timetable_entries SET template_id = $1 WHERE id = $2', [template_id, entry.id]);
        return res.json({
            success: true,
            message: 'Créneau créé depuis le template',
            data: entry,
        });
    }
    catch (error) {
        console.error('Erreur createEntryFromTemplateHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du créneau',
        });
    }
}
// =========================
// CRÉATION (ORIGINAL - GARDER)
// =========================
async function createEntryHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { course_id, day_of_week, start_time, end_time, week, room, notes } = req.body;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        const courseQuery = `
      SELECT c.*, cl.id as class_id, c.teacher_id
      FROM courses c
      JOIN classes cl ON c.class_id = cl.id
      WHERE c.id = $1
    `;
        const courseResult = await database_1.default.query(courseQuery, [course_id]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cours non trouvé',
            });
        }
        const course = courseResult.rows[0];
        if (role === 'staff') {
            const staffCheck = await database_1.default.query('SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2', [course.class_id, userId]);
            if (staffCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        const roomConflict = room
            ? await timetable_model_1.TimetableModel.checkRoomConflict(day_of_week, start_time, end_time, room)
            : { hasConflict: false };
        const teacherConflict = await timetable_model_1.TimetableModel.checkTeacherConflict(course.teacher_id, day_of_week, start_time, end_time);
        if (roomConflict.hasConflict || teacherConflict.hasConflict) {
            return res.status(409).json({
                success: false,
                error: 'Conflit détecté',
                conflicts: {
                    room: roomConflict.hasConflict ? roomConflict.conflictDetails : null,
                    teacher: teacherConflict.hasConflict ? teacherConflict.conflictDetails : null,
                },
            });
        }
        const entry = await timetable_model_1.TimetableModel.createEntry({
            course_id,
            day_of_week,
            start_time,
            end_time,
            week,
            room,
            notes,
        });
        return res.json({
            success: true,
            message: 'Créneau créé avec succès',
            data: entry,
        });
    }
    catch (error) {
        console.error('Erreur createEntryHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du créneau',
        });
    }
}
async function bulkCreateEntriesHandler(req, res) {
    try {
        const { userId, role } = req.user;
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
        const created = [];
        const conflicts = [];
        for (const entryData of entries) {
            try {
                const roomConflict = entryData.room
                    ? await timetable_model_1.TimetableModel.checkRoomConflict(entryData.day_of_week, entryData.start_time, entryData.end_time, entryData.room)
                    : { hasConflict: false };
                const courseQuery = 'SELECT teacher_id FROM courses WHERE id = $1';
                const courseResult = await database_1.default.query(courseQuery, [entryData.course_id]);
                if (courseResult.rows.length === 0) {
                    conflicts.push({
                        entry: entryData,
                        reason: 'Cours non trouvé',
                    });
                    continue;
                }
                const teacherConflict = await timetable_model_1.TimetableModel.checkTeacherConflict(courseResult.rows[0].teacher_id, entryData.day_of_week, entryData.start_time, entryData.end_time);
                if (roomConflict.hasConflict || teacherConflict.hasConflict) {
                    conflicts.push({
                        entry: entryData,
                        conflicts: {
                            room: roomConflict.conflictDetails,
                            teacher: teacherConflict.conflictDetails,
                        },
                    });
                    continue;
                }
                const entry = await timetable_model_1.TimetableModel.createEntry(entryData);
                created.push(entry);
            }
            catch (error) {
                conflicts.push({
                    entry: entryData,
                    reason: error instanceof Error ? error.message : 'Erreur inconnue',
                });
            }
        }
        return res.json({
            success: true,
            message: `${created.length} créneau(x) créé(s)`,
            data: {
                created,
                conflicts,
            },
        });
    }
    catch (error) {
        console.error('Erreur bulkCreateEntriesHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la création des créneaux',
        });
    }
}
// =========================
// MODIFICATION (GARDER)
// =========================
async function updateEntryHandler(req, res) {
    try {
        const { userId, role } = req.user;
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
        const entryResult = await database_1.default.query(entryQuery, [entryId]);
        if (entryResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Créneau non trouvé',
            });
        }
        const existingEntry = entryResult.rows[0];
        if (role === 'staff') {
            const staffCheck = await database_1.default.query('SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2', [existingEntry.class_id, userId]);
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
                const roomConflict = await timetable_model_1.TimetableModel.checkRoomConflict(dayOfWeek, startTime, endTime, room, entryId);
                if (roomConflict.hasConflict) {
                    return res.status(409).json({
                        success: false,
                        error: 'Conflit de salle détecté',
                        conflict: roomConflict.conflictDetails,
                    });
                }
            }
            const teacherConflict = await timetable_model_1.TimetableModel.checkTeacherConflict(existingEntry.teacher_id, dayOfWeek, startTime, endTime, entryId);
            if (teacherConflict.hasConflict) {
                return res.status(409).json({
                    success: false,
                    error: 'Conflit de professeur détecté',
                    conflict: teacherConflict.conflictDetails,
                });
            }
        }
        const updated = await timetable_model_1.TimetableModel.updateEntry(entryId, updateData);
        return res.json({
            success: true,
            message: 'Créneau mis à jour',
            data: updated,
        });
    }
    catch (error) {
        console.error('Erreur updateEntryHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du créneau',
        });
    }
}
// =========================
// SUPPRESSION (GARDER)
// =========================
async function deleteEntryHandler(req, res) {
    try {
        const { userId, role } = req.user;
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
            const entryResult = await database_1.default.query(entryQuery, [entryId]);
            if (entryResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Créneau non trouvé',
                });
            }
            const staffCheck = await database_1.default.query('SELECT 1 FROM class_staff WHERE class_id = $1 AND user_id = $2', [entryResult.rows[0].class_id, userId]);
            if (staffCheck.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        await timetable_model_1.TimetableModel.deleteEntry(entryId);
        return res.json({
            success: true,
            message: 'Créneau supprimé',
        });
    }
    catch (error) {
        console.error('Erreur deleteEntryHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression du créneau',
        });
    }
}
// =========================
// DUPLICATION (GARDER ET AMÉLIORER)
// =========================
async function duplicateTimetableHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { sourceClassId, targetClassId } = req.body;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        if (role === 'staff') {
            const staffCheck = await database_1.default.query(`SELECT class_id FROM class_staff 
         WHERE user_id = $1 AND class_id IN ($2, $3)`, [userId, sourceClassId, targetClassId]);
            if (staffCheck.rows.length !== 2) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas ces classes',
                });
            }
        }
        const duplicated = await timetable_model_1.TimetableModel.duplicateToClass(sourceClassId, targetClassId);
        return res.json({
            success: true,
            message: `${duplicated.length} créneau(x) dupliqué(s)`,
            data: duplicated,
        });
    }
    catch (error) {
        console.error('Erreur duplicateTimetableHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la duplication',
        });
    }
}
// =========================
// VÉRIFICATIONS (GARDER)
// =========================
async function checkConflictsHandler(req, res) {
    try {
        const { course_id, day_of_week, start_time, end_time, room, exclude_entry_id } = req.body;
        const courseQuery = 'SELECT teacher_id FROM courses WHERE id = $1';
        const courseResult = await database_1.default.query(courseQuery, [course_id]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cours non trouvé',
            });
        }
        const roomConflict = room
            ? await timetable_model_1.TimetableModel.checkRoomConflict(day_of_week, start_time, end_time, room, exclude_entry_id)
            : { hasConflict: false };
        const teacherConflict = await timetable_model_1.TimetableModel.checkTeacherConflict(courseResult.rows[0].teacher_id, day_of_week, start_time, end_time, exclude_entry_id);
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
    }
    catch (error) {
        console.error('Erreur checkConflictsHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la vérification des conflits',
        });
    }
}
/**
 * GET /api/timetable/staff/classes
 * Récupérer les classes gérées par le staff
 */
async function getStaffClassesHandler(req, res) {
    try {
        const { userId } = req.user;
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
        const result = await database_1.default.query(query, [userId]);
        return res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error('Erreur getStaffClasses:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des classes',
        });
    }
}
//# sourceMappingURL=timetable.controller.js.map