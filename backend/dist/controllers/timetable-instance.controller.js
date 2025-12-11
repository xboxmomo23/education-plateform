"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInstancesForWeekHandler = getInstancesForWeekHandler;
exports.createInstanceHandler = createInstanceHandler;
exports.generateFromTemplateHandler = generateFromTemplateHandler;
exports.generateFromTemplateBulkHandler = generateFromTemplateBulkHandler;
exports.copyWeekHandler = copyWeekHandler;
exports.updateInstanceHandler = updateInstanceHandler;
exports.deleteInstanceHandler = deleteInstanceHandler;
const timetable_instance_model_1 = require("../models/timetable-instance.model");
const database_1 = __importDefault(require("../config/database"));
async function staffCanManageClass(req, classId) {
    const user = req.user;
    if (user.role !== 'staff') {
        return true;
    }
    const assignments = (user.assignedClassIds ?? []).filter((id) => Boolean(id));
    if (assignments.length > 0) {
        return assignments.includes(classId);
    }
    if (!user.establishmentId) {
        return false;
    }
    const check = await database_1.default.query(`SELECT 1 FROM classes WHERE id = $1 AND establishment_id = $2`, [classId, user.establishmentId]);
    return (check?.rowCount ?? 0) > 0;
}
/**
 * GET /api/timetable/instances/class/:classId/week/:weekStartDate
 * Récupérer les instances d'une semaine
 */
async function getInstancesForWeekHandler(req, res) {
    try {
        const { classId, weekStartDate } = req.params;
        const instances = await timetable_instance_model_1.TimetableInstanceModel.getInstancesForWeek(classId, weekStartDate);
        return res.json({
            success: true,
            data: instances,
        });
    }
    catch (error) {
        console.error('Erreur getInstancesForWeekHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des cours',
        });
    }
}
/**
 * POST /api/timetable/instances
 * Créer une instance (cours pour une semaine spécifique)
 */
async function createInstanceHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { class_id, course_id, week_start_date, day_of_week, start_time, end_time, room, notes } = req.body;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        // Vérifier que le cours existe
        const courseQuery = 'SELECT class_id, teacher_id FROM courses WHERE id = $1';
        const courseResult = await database_1.default.query(courseQuery, [course_id]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cours non trouvé',
            });
        }
        const courseClassId = courseResult.rows[0].class_id;
        const teacherId = courseResult.rows[0].teacher_id;
        // Vérifier la cohérence class_id
        if (courseClassId !== class_id) {
            return res.status(400).json({
                success: false,
                error: 'Le cours n\'appartient pas à cette classe',
            });
        }
        // Si staff, vérifier qu'il gère cette classe
        if (role === 'staff') {
            const canManage = await staffCanManageClass(req, class_id);
            if (!canManage) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        // Vérifier les conflits de salle
        if (room) {
            const roomConflict = await timetable_instance_model_1.TimetableInstanceModel.checkConflict(class_id, week_start_date, day_of_week, start_time, end_time, room);
            if (roomConflict.hasConflict) {
                return res.status(409).json({
                    success: false,
                    error: 'Conflit de salle détecté',
                    conflict: roomConflict.conflictDetails,
                });
            }
        }
        // Créer l'instance
        const instance = await timetable_instance_model_1.TimetableInstanceModel.create({
            class_id,
            course_id,
            week_start_date,
            day_of_week,
            start_time,
            end_time,
            room,
            notes,
            created_by: userId,
        });
        return res.json({
            success: true,
            message: 'Cours créé avec succès',
            data: instance,
        });
    }
    catch (error) {
        console.error('Erreur createInstanceHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du cours',
        });
    }
}
/**
 * POST /api/timetable/instances/generate-from-template
 * Générer les instances d'une semaine depuis le template
 */
async function generateFromTemplateHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { class_id, source_week_start, target_week_start } = req.body;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        if (role === 'staff') {
            const canManage = await staffCanManageClass(req, class_id);
            if (!canManage) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        if (!source_week_start || !target_week_start) {
            return res.status(400).json({
                success: false,
                error: 'source_week_start et target_week_start sont requis',
            });
        }
        const count = await timetable_instance_model_1.TimetableInstanceModel.generateFromTemplate(class_id, source_week_start, target_week_start, userId);
        return res.json({
            success: true,
            message: `${count} cours générés pour la semaine du ${target_week_start}`,
            data: { count },
        });
    }
    catch (error) {
        console.error('Erreur generateFromTemplateHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération',
        });
    }
}
/**
 * ✨ NOUVEAU : POST /api/timetable/instances/generate-bulk
 * Générer les instances de PLUSIEURS semaines depuis le template
 */
async function generateFromTemplateBulkHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { class_id, source_week_start, target_weeks } = req.body;
        console.log('🚀 Génération bulk démarrée:', {
            class_id,
            target_weeks_count: Array.isArray(target_weeks) ? target_weeks.length : 0,
            user_id: userId,
        });
        // Vérifications d'autorisation
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        if (role === 'staff') {
            const canManage = await staffCanManageClass(req, class_id);
            if (!canManage) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        if (!source_week_start) {
            return res.status(400).json({
                success: false,
                error: 'source_week_start est requis',
            });
        }
        if (!Array.isArray(target_weeks) || target_weeks.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'target_weeks doit être un tableau non vide',
            });
        }
        let totalCreated = 0;
        const details = [];
        for (const weekStart of target_weeks) {
            try {
                console.log(`  📅 Génération pour la semaine: ${weekStart}`);
                const count = await timetable_instance_model_1.TimetableInstanceModel.generateFromTemplate(class_id, source_week_start, weekStart, userId);
                totalCreated += count;
                details.push({
                    week: weekStart,
                    count,
                    success: true,
                });
                console.log(`  ✅ ${count} cours créés pour ${weekStart}`);
            }
            catch (error) {
                console.error(`  ❌ Erreur pour ${weekStart}:`, error.message);
                details.push({
                    week: weekStart,
                    count: 0,
                    success: false,
                    error: error.message,
                });
            }
        }
        console.log('✅ Génération bulk terminée:', {
            totalCreated,
            weeksAffected: target_weeks.length,
            successCount: details.filter((d) => d.success).length,
            errorCount: details.filter((d) => !d.success).length,
        });
        return res.json({
            success: true,
            message: `${totalCreated} cours générés dans ${target_weeks.length} semaines`,
            data: {
                totalCreated,
                weeksAffected: target_weeks.length,
                details,
            },
        });
    }
    catch (error) {
        console.error('❌ Erreur generateFromTemplateBulkHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération bulk',
        });
    }
}
/**
 * POST /api/timetable/instances/copy-week
 * Copier une semaine vers une autre
 */
async function copyWeekHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { class_id, source_week, target_week } = req.body;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        if (role === 'staff') {
            const canManage = await staffCanManageClass(req, class_id);
            if (!canManage) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        const count = await timetable_instance_model_1.TimetableInstanceModel.copyWeek(class_id, source_week, target_week, userId);
        return res.json({
            success: true,
            message: `${count} cours copiés`,
            data: { count },
        });
    }
    catch (error) {
        console.error('Erreur copyWeekHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la copie',
        });
    }
}
/**
 * PUT /api/timetable/instances/:id
 * Modifier une instance
 */
async function updateInstanceHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { id: instanceId } = req.params;
        const updateData = req.body;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        const instance = await timetable_instance_model_1.TimetableInstanceModel.getById(instanceId);
        if (!instance) {
            return res.status(404).json({
                success: false,
                error: 'Cours non trouvé',
            });
        }
        if (role === 'staff') {
            const canManage = await staffCanManageClass(req, instance.class_id);
            if (!canManage) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        // Vérifier les conflits si changement d'horaire ou de salle
        if (updateData.day_of_week || updateData.start_time || updateData.end_time || updateData.room) {
            const dayOfWeek = updateData.day_of_week || instance.day_of_week;
            const startTime = updateData.start_time || instance.start_time;
            const endTime = updateData.end_time || instance.end_time;
            const room = updateData.room || instance.room;
            if (room) {
                const conflict = await timetable_instance_model_1.TimetableInstanceModel.checkConflict(instance.class_id, instance.week_start_date, dayOfWeek, startTime, endTime, room, instanceId);
                if (conflict.hasConflict) {
                    return res.status(409).json({
                        success: false,
                        error: 'Conflit détecté',
                        conflict: conflict.conflictDetails,
                    });
                }
            }
        }
        const updated = await timetable_instance_model_1.TimetableInstanceModel.update(instanceId, updateData);
        return res.json({
            success: true,
            message: 'Cours mis à jour',
            data: updated,
        });
    }
    catch (error) {
        console.error('Erreur updateInstanceHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour',
        });
    }
}
/**
 * DELETE /api/timetable/instances/:id
 * Supprimer une instance
 */
async function deleteInstanceHandler(req, res) {
    try {
        const { userId, role } = req.user;
        const { id: instanceId } = req.params;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Accès réservé au personnel',
            });
        }
        const instance = await timetable_instance_model_1.TimetableInstanceModel.getById(instanceId);
        if (!instance) {
            return res.status(404).json({
                success: false,
                error: 'Cours non trouvé',
            });
        }
        if (role === 'staff') {
            const canManage = await staffCanManageClass(req, instance.class_id);
            if (!canManage) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous ne gérez pas cette classe',
                });
            }
        }
        await timetable_instance_model_1.TimetableInstanceModel.delete(instanceId);
        return res.json({
            success: true,
            message: 'Cours supprimé',
        });
    }
    catch (error) {
        console.error('Erreur deleteInstanceHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression',
        });
    }
}
//# sourceMappingURL=timetable-instance.controller.js.map