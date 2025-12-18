"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClassTimetableForWeekHandler = getClassTimetableForWeekHandler;
exports.getTeacherTimetableForWeekHandler = getTeacherTimetableForWeekHandler;
exports.createInstanceHandler = createInstanceHandler;
exports.bulkCreateInstancesHandler = bulkCreateInstancesHandler;
exports.updateInstanceHandler = updateInstanceHandler;
exports.deleteInstanceHandler = deleteInstanceHandler;
exports.copyWeekHandler = copyWeekHandler;
exports.getTemplatesByClassHandler = getTemplatesByClassHandler;
exports.createTemplateHandler = createTemplateHandler;
exports.updateTemplateHandler = updateTemplateHandler;
exports.deleteTemplateHandler = deleteTemplateHandler;
exports.generateFromTemplatesHandler = generateFromTemplatesHandler;
exports.getStaffClassesHandler = getStaffClassesHandler;
exports.getAvailableCoursesHandler = getAvailableCoursesHandler;
exports.exportClassTimetablePdfHandler = exportClassTimetablePdfHandler;
exports.updateCourseForStaffHandler = updateCourseForStaffHandler;
exports.deleteCourseForStaffHandler = deleteCourseForStaffHandler;
exports.getSubjectsForStaffHandler = getSubjectsForStaffHandler;
exports.getTeachersForStaffHandler = getTeachersForStaffHandler;
exports.createCourseForStaffHandler = createCourseForStaffHandler;
exports.checkConflictsHandler = checkConflictsHandler;
exports.getClassTimetableHandler = getClassTimetableHandler;
exports.getTeacherTimetableHandler = getTeacherTimetableHandler;
exports.createEntryHandler = createEntryHandler;
exports.bulkCreateEntriesHandler = bulkCreateEntriesHandler;
exports.updateEntryHandler = updateEntryHandler;
exports.deleteEntryHandler = deleteEntryHandler;
exports.createFromTemplateHandler = createFromTemplateHandler;
exports.duplicateTimetableHandler = duplicateTimetableHandler;
const pdfkit_1 = __importDefault(require("pdfkit"));
const database_1 = __importDefault(require("../config/database"));
const timetable_model_1 = require("../models/timetable.model");
const audit_service_1 = require("../services/audit.service");
const DAY_LABELS = {
    1: 'Dimanche',
    2: 'Lundi',
    3: 'Mardi',
    4: 'Mercredi',
    5: 'Jeudi',
    6: 'Vendredi',
    7: 'Samedi',
};
const STAFF_DAY_ORDER = [1, 2, 3, 4, 5];
const DEFAULT_TIME_RANGE = { start: 8, end: 18 };
const MM_TO_PT = 2.83465;
const A4_WIDTH_PT = 210 * MM_TO_PT; // 595.28
const A4_HEIGHT_PT = 297 * MM_TO_PT; // 841.89
const PAGE_MARGIN_PT = 10 * MM_TO_PT; // 28.35
const CARNET_ZONE_WIDTH_PT = 190 * MM_TO_PT; // 538.58
const CARNET_ZONE_HEIGHT_PT = 105 * MM_TO_PT; // 297.64
const CARNET_ZONE_X = (A4_WIDTH_PT - CARNET_ZONE_WIDTH_PT) / 2; // ~28.35
const CARNET_ZONE_Y = A4_HEIGHT_PT - PAGE_MARGIN_PT - CARNET_ZONE_HEIGHT_PT; // ~515.90
function sanitizeFilePart(value) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9-_]+/g, '_');
}
function parseDateOrThrow(dateStr) {
    const date = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
        throw new Error(`Date invalide: ${dateStr}`);
    }
    return date;
}
function computeAcademicYear(date) {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    if (month >= 9) {
        return `${year}-${year + 1}`;
    }
    return `${year - 1}-${year}`;
}
function normalizeWeekStart(queryWeekStart) {
    if (!queryWeekStart) {
        const now = new Date();
        const day = now.getUTCDay();
        now.setUTCDate(now.getUTCDate() - day);
        return now.toISOString().slice(0, 10);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(queryWeekStart)) {
        throw new Error('Paramètre weekStart invalide');
    }
    const provided = parseDateOrThrow(queryWeekStart);
    const day = provided.getUTCDay();
    provided.setUTCDate(provided.getUTCDate() - day);
    return provided.toISOString().slice(0, 10);
}
function parseTimeToMinutes(time) {
    const [hourStr, minuteStr] = time.split(':');
    const hour = parseInt(hourStr ?? '0', 10);
    const minute = parseInt((minuteStr ?? '0').slice(0, 2), 10);
    return hour * 60 + minute;
}
function getDayColumns() {
    return STAFF_DAY_ORDER;
}
function normalizeHexColor(color) {
    if (!color)
        return null;
    let hex = color.trim();
    if (hex.startsWith('#'))
        hex = hex.slice(1);
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map((c) => c + c)
            .join('');
    }
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
        return null;
    }
    return `#${hex.toLowerCase()}`;
}
function lightenHexColor(hexColor, ratio) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const mix = (channel) => Math.round(channel + (255 - channel) * ratio);
    const toHex = (value) => value.toString(16).padStart(2, '0');
    return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
function computeCourseColors(theme, subjectColor) {
    if (theme === 'gray') {
        return {
            fill: '#e5e5e5',
            stroke: '#8c8c8c',
            text: '#111827',
        };
    }
    const normalized = normalizeHexColor(subjectColor) ?? '#3b82f6';
    return {
        fill: lightenHexColor(normalized, 0.7),
        stroke: normalized,
        text: '#0f172a',
    };
}
function getSlotConfig(instances) {
    let minHour = Number.POSITIVE_INFINITY;
    let maxHour = Number.NEGATIVE_INFINITY;
    instances.forEach((inst) => {
        const startHour = Math.floor(parseTimeToMinutes(inst.start_time) / 60);
        const endHour = Math.ceil(parseTimeToMinutes(inst.end_time) / 60);
        if (!Number.isNaN(startHour)) {
            minHour = Math.min(minHour, startHour);
        }
        if (!Number.isNaN(endHour)) {
            maxHour = Math.max(maxHour, endHour);
        }
    });
    if (!Number.isFinite(minHour) || !Number.isFinite(maxHour)) {
        minHour = DEFAULT_TIME_RANGE.start;
        maxHour = DEFAULT_TIME_RANGE.end;
    }
    else {
        minHour = Math.min(minHour, DEFAULT_TIME_RANGE.start);
        maxHour = Math.max(maxHour, DEFAULT_TIME_RANGE.end);
    }
    if (!Number.isFinite(minHour) || !Number.isFinite(maxHour)) {
        minHour = DEFAULT_TIME_RANGE.start;
        maxHour = DEFAULT_TIME_RANGE.end;
    }
    else {
        minHour = Math.min(minHour, DEFAULT_TIME_RANGE.start);
        maxHour = Math.max(maxHour, DEFAULT_TIME_RANGE.end);
    }
    const hours = [];
    for (let hour = minHour; hour <= maxHour; hour += 1) {
        hours.push(hour);
    }
    return {
        hours: hours.length > 0 ? hours : [DEFAULT_TIME_RANGE.start],
        minHour,
        maxHour,
    };
}
function formatSlotLabel(hour) {
    const end = hour + 1;
    return `${String(hour).padStart(2, '0')}h-${String(end).padStart(2, '0')}h`;
}
function formatEntryText(entry) {
    const lines = [entry.subject_name || 'Cours'];
    if (entry.teacher_name) {
        lines.push(entry.teacher_name);
    }
    return lines.join('\n');
}
function drawClassTimetablePdf(doc, options) {
    const { establishmentName, classLabel, classCode, weekStart, instances, schoolYear, theme } = options;
    const referenceDate = parseDateOrThrow(weekStart);
    const resolvedSchoolYear = schoolYear && schoolYear.trim().length > 0 ? schoolYear : computeAcademicYear(referenceDate);
    doc.font('Helvetica-Bold').fontSize(18).text(establishmentName);
    doc.moveDown(0.15);
    doc
        .font('Helvetica')
        .fontSize(12)
        .text(`Classe : ${classLabel}${classCode ? ` – ${classCode}` : ''}`);
    doc.fontSize(12).text(`Année scolaire : ${resolvedSchoolYear}`);
    doc.moveDown(0.7);
    const marginLeft = doc.page.margins.left;
    const marginRight = doc.page.margins.right;
    const gridWidth = doc.page.width - marginLeft - marginRight;
    const headerHeight = 26;
    const timeColumnWidth = 70;
    const dayColumns = getDayColumns();
    const slotConfig = getSlotConfig(instances);
    const slotHours = slotConfig.hours;
    const minHour = slotConfig.minHour;
    const availableHeight = doc.page.height * 0.45;
    const rowHeight = Math.max(24, Math.min(36, (availableHeight - headerHeight) / Math.max(slotHours.length, 1)));
    const gridHeight = headerHeight + rowHeight * slotHours.length;
    const columnWidth = (gridWidth - timeColumnWidth) / dayColumns.length;
    const gridTop = doc.y;
    const columnIndexMap = new Map(dayColumns.map((day, index) => [day, index]));
    doc.lineWidth(0.5).strokeColor('#94a3b8');
    doc.fontSize(9).font('Helvetica-Bold');
    doc.rect(marginLeft, gridTop, timeColumnWidth, headerHeight).stroke();
    doc.text('Horaire', marginLeft, gridTop + 6, {
        width: timeColumnWidth,
        align: 'center',
    });
    dayColumns.forEach((dayValue, index) => {
        const x = marginLeft + timeColumnWidth + index * columnWidth;
        doc.rect(x, gridTop, columnWidth, headerHeight).stroke();
        doc.text(DAY_LABELS[dayValue] || `Jour ${dayValue}`, x, gridTop + 6, {
            width: columnWidth,
            align: 'center',
        });
    });
    doc.font('Helvetica').fontSize(8);
    slotHours.forEach((hour, rowIndex) => {
        const y = gridTop + headerHeight + rowIndex * rowHeight;
        doc.rect(marginLeft, y, timeColumnWidth, rowHeight).stroke();
        doc.text(formatSlotLabel(hour), marginLeft + 5, y + rowHeight / 2 - 6, {
            width: timeColumnWidth - 10,
            align: 'center',
        });
        dayColumns.forEach((dayValue, index) => {
            const x = marginLeft + timeColumnWidth + index * columnWidth;
            doc.rect(x, y, columnWidth, rowHeight).stroke();
            // les blocs seront dessinés après la grille
        });
    });
    instances.forEach((entry) => {
        const columnIndex = columnIndexMap.get(entry.day_of_week);
        if (columnIndex === undefined) {
            return;
        }
        const startMinutes = parseTimeToMinutes(entry.start_time);
        const endMinutes = parseTimeToMinutes(entry.end_time);
        if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || endMinutes <= startMinutes) {
            return;
        }
        const offsetMinutes = startMinutes - minHour * 60;
        const top = gridTop + headerHeight + Math.max(0, (offsetMinutes / 60) * rowHeight);
        const durationMinutes = endMinutes - startMinutes;
        const height = Math.max((durationMinutes / 60) * rowHeight - 4, rowHeight * 0.6);
        const x = marginLeft + timeColumnWidth + columnIndex * columnWidth;
        const width = columnWidth - 4;
        const colors = computeCourseColors(theme, entry.subject_color);
        const hasTeacher = Boolean(entry.teacher_name);
        const useSingleLine = !hasTeacher || height < 32;
        const textX = x + 6;
        const textWidth = width - 12;
        doc
            .save()
            .lineWidth(0.6)
            .fillColor(colors.fill)
            .strokeColor(colors.stroke)
            .rect(x + 2, top + 2, width, height)
            .fillAndStroke()
            .fillColor(colors.text);
        if (useSingleLine) {
            const singleLine = hasTeacher
                ? `${entry.subject_name || 'Cours'} – ${entry.teacher_name}`
                : entry.subject_name || 'Cours';
            doc.font('Helvetica-Bold').fontSize(9).text(singleLine, textX, top + 8, {
                width: textWidth,
                ellipsis: true,
            });
        }
        else {
            doc.font('Helvetica-Bold').fontSize(9).text(entry.subject_name || 'Cours', textX, top + 6, {
                width: textWidth,
                ellipsis: true,
            });
            if (hasTeacher) {
                doc.font('Helvetica').fontSize(8).text(entry.teacher_name || '', textX, top + 20, {
                    width: textWidth,
                    ellipsis: true,
                });
            }
        }
        doc.restore();
    });
    if (instances.length === 0) {
        doc
            .moveDown(0.5)
            .font('Helvetica-Bold')
            .text('Aucun cours planifié pour cette semaine.', { align: 'left' });
    }
}
const CARNET_HEADER_BAND_PT = 36;
function drawCarnetTimetablePdf(doc, options) {
    const { establishmentName, classLabel, classCode, weekStart, instances, schoolYear, theme } = options;
    const referenceDate = parseDateOrThrow(weekStart);
    const resolvedSchoolYear = schoolYear && schoolYear.trim().length > 0 ? schoolYear : computeAcademicYear(referenceDate);
    const dayHeaderHeight = 16;
    const headerPaddingX = CARNET_ZONE_X + 8;
    const headerTextWidth = CARNET_ZONE_WIDTH_PT - 16;
    const dayColumns = getDayColumns();
    const slotConfig = getSlotConfig(instances);
    const slotHours = slotConfig.hours;
    const minHour = slotConfig.minHour;
    const timeColumnWidth = 40;
    const gridX = CARNET_ZONE_X;
    const gridY = CARNET_ZONE_Y + CARNET_HEADER_BAND_PT + dayHeaderHeight;
    const gridWidth = CARNET_ZONE_WIDTH_PT;
    const gridHeight = CARNET_ZONE_HEIGHT_PT - CARNET_HEADER_BAND_PT - dayHeaderHeight;
    const dayHeaderY = gridY - dayHeaderHeight;
    const columnWidth = (gridWidth - timeColumnWidth) / dayColumns.length;
    const rowHeight = gridHeight / Math.max(slotHours.length, 1);
    const columnIndexMap = new Map(dayColumns.map((day, index) => [day, index]));
    doc
        .save()
        .lineWidth(1)
        .strokeColor('#1f2937')
        .rect(CARNET_ZONE_X, CARNET_ZONE_Y, CARNET_ZONE_WIDTH_PT, CARNET_ZONE_HEIGHT_PT)
        .stroke()
        .restore();
    doc
        .moveTo(CARNET_ZONE_X, CARNET_ZONE_Y + CARNET_HEADER_BAND_PT)
        .lineTo(CARNET_ZONE_X + CARNET_ZONE_WIDTH_PT, CARNET_ZONE_Y + CARNET_HEADER_BAND_PT)
        .stroke();
    let headerY = CARNET_ZONE_Y + 8;
    doc
        .font('Helvetica-Bold')
        .fillColor('#111827')
        .fontSize(9)
        .text(establishmentName, headerPaddingX, headerY, {
        width: headerTextWidth,
        ellipsis: true,
    });
    headerY += 11;
    doc
        .font('Helvetica')
        .fontSize(8.5)
        .text(`Classe : ${classLabel}${classCode ? ` — ${classCode}` : ''}`, headerPaddingX, headerY, {
        width: headerTextWidth,
        ellipsis: true,
    });
    headerY += 10;
    doc
        .font('Helvetica')
        .fontSize(8.5)
        .text(`Année scolaire : ${resolvedSchoolYear}`, headerPaddingX, headerY, {
        width: headerTextWidth,
        ellipsis: true,
    });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111827');
    dayColumns.forEach((day, index) => {
        const x = gridX + timeColumnWidth + index * columnWidth;
        doc.text(DAY_LABELS[day] || `Jour ${day}`, x, dayHeaderY + 2, {
            width: columnWidth,
            align: 'center',
        });
    });
    doc.font('Helvetica').fontSize(8).fillColor('#111827');
    slotHours.forEach((hour, rowIndex) => {
        const y = gridY + rowIndex * rowHeight;
        doc.text(`${String(hour).padStart(2, '0')}h`, gridX + 2, y + rowHeight / 2 - 4, {
            width: timeColumnWidth - 4,
            align: 'left',
        });
    });
    doc.save().lineWidth(0.4).strokeColor('#94a3b8');
    for (let i = 0; i <= slotHours.length; i += 1) {
        const y = gridY + i * rowHeight;
        doc.moveTo(gridX, y).lineTo(gridX + gridWidth, y);
    }
    for (let i = 0; i <= dayColumns.length; i += 1) {
        const x = gridX + timeColumnWidth + i * columnWidth;
        doc.moveTo(x, gridY).lineTo(x, gridY + gridHeight);
    }
    doc.moveTo(gridX + timeColumnWidth, CARNET_ZONE_Y + CARNET_HEADER_BAND_PT).lineTo(gridX + timeColumnWidth, CARNET_ZONE_Y + CARNET_ZONE_HEIGHT_PT);
    doc.stroke().restore();
    instances.forEach((entry) => {
        const columnIndex = columnIndexMap.get(entry.day_of_week);
        if (columnIndex === undefined) {
            return;
        }
        const startMinutes = parseTimeToMinutes(entry.start_time);
        const endMinutes = parseTimeToMinutes(entry.end_time);
        if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes) || endMinutes <= startMinutes) {
            return;
        }
        const offsetMinutes = startMinutes - minHour * 60;
        const top = gridY + Math.max(0, (offsetMinutes / 60) * rowHeight);
        const durationMinutes = endMinutes - startMinutes;
        const height = Math.max((durationMinutes / 60) * rowHeight - 2, rowHeight * 0.6);
        const x = gridX + timeColumnWidth + columnIndex * columnWidth;
        const width = columnWidth - 4;
        const colors = computeCourseColors(theme, entry.subject_color);
        const hasTeacher = Boolean(entry.teacher_name);
        const useSingleLine = !hasTeacher || height < 26;
        const textX = x + 4;
        const textWidth = width - 8;
        doc
            .save()
            .lineWidth(0.6)
            .fillColor(colors.fill)
            .strokeColor(colors.stroke)
            .rect(x + 2, top + 2, width, height)
            .fillAndStroke()
            .fillColor(colors.text);
        if (useSingleLine) {
            const line = hasTeacher
                ? `${entry.subject_name || 'Cours'} – ${entry.teacher_name}`
                : entry.subject_name || 'Cours';
            doc.font('Helvetica-Bold').fontSize(8.5).text(line, textX, top + 6, {
                width: textWidth,
                ellipsis: true,
            });
        }
        else {
            doc.font('Helvetica-Bold').fontSize(9).text(entry.subject_name || 'Cours', textX, top + 4, {
                width: textWidth,
                ellipsis: true,
            });
            if (hasTeacher) {
                doc.font('Helvetica').fontSize(8).text(entry.teacher_name || '', textX, top + 16, {
                    width: textWidth,
                    ellipsis: true,
                });
            }
        }
        doc.restore();
    });
}
// ============================================
// HANDLERS - INSTANCES (MODE DYNAMIC)
// ============================================
/**
 * Récupérer l'emploi du temps d'une classe pour une semaine spécifique
 * MODE DYNAMIC UNIQUEMENT
 */
async function getClassTimetableForWeekHandler(req, res) {
    try {
        const { classId, weekStartDate } = req.params;
        console.log('📅 Récupération emploi du temps - Classe:', classId, ', Semaine:', weekStartDate);
        // Récupérer les instances pour cette semaine
        const instances = await timetable_model_1.TimetableInstanceModel.getInstancesForWeek(classId, weekStartDate);
        console.log(`✅ Mode DYNAMIC - ${instances.length} cours trouvés`);
        const courses = instances.map((instance) => ({
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
    }
    catch (error) {
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
async function getTeacherTimetableForWeekHandler(req, res) {
    try {
        const { teacherId, weekStartDate } = req.params;
        console.log(`📅 Récupération emploi du temps professeur - Teacher: ${teacherId}, Semaine: ${weekStartDate}`);
        // Récupérer les instances pour cette semaine
        const instances = await timetable_model_1.TimetableInstanceModel.getInstancesForTeacher(teacherId, weekStartDate);
        console.log(`✅ Mode DYNAMIC - ${instances.length} cours trouvés`);
        const courses = instances.map((instance) => ({
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
    }
    catch (error) {
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
async function createInstanceHandler(req, res) {
    try {
        const { userId } = req.user;
        const instanceData = {
            ...req.body,
            created_by: userId,
        };
        const instance = await timetable_model_1.TimetableInstanceModel.createInstance(instanceData);
        return res.status(201).json({
            success: true,
            data: instance,
        });
    }
    catch (error) {
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
async function bulkCreateInstancesHandler(req, res) {
    try {
        const { userId } = req.user;
        const { instances } = req.body;
        const instancesData = instances.map((inst) => ({
            ...inst,
            created_by: userId,
        }));
        const created = await timetable_model_1.TimetableInstanceModel.bulkCreateInstances(instancesData);
        return res.status(201).json({
            success: true,
            data: created,
            count: created.length,
        });
    }
    catch (error) {
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
async function updateInstanceHandler(req, res) {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const instance = await timetable_model_1.TimetableInstanceModel.updateInstance(id, updateData);
        return res.json({
            success: true,
            data: instance,
        });
    }
    catch (error) {
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
async function deleteInstanceHandler(req, res) {
    try {
        const { id } = req.params;
        const instance = await timetable_model_1.TimetableInstanceModel.deleteInstance(id);
        return res.json({
            success: true,
            data: instance,
        });
    }
    catch (error) {
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
async function copyWeekHandler(req, res) {
    try {
        const { userId } = req.user;
        const { classId, sourceWeekStart, targetWeekStart } = req.body;
        const copied = await timetable_model_1.TimetableInstanceModel.copyWeekToWeek(classId, sourceWeekStart, targetWeekStart, userId);
        return res.status(201).json({
            success: true,
            data: copied,
            count: copied.length,
        });
    }
    catch (error) {
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
async function getTemplatesByClassHandler(req, res) {
    try {
        const { classId } = req.params;
        const result = await database_1.default.query(`
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
      `, [classId]);
        return res.json({
            success: true,
            data: result.rows,
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
 * Créer un template
 */
/**
 * Créer un template (course_templates)
 */
async function createTemplateHandler(req, res) {
    try {
        const { course_id, default_duration, default_room, display_order } = req.body;
        const userId = req.user?.userId ?? null;
        // Empêcher les doublons de template pour un même cours
        const existing = await database_1.default.query('SELECT 1 FROM course_templates WHERE course_id = $1', [course_id]);
        if (existing.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Un template existe déjà pour ce cours',
            });
        }
        // Création du template dans course_templates
        const insertResult = await database_1.default.query(`
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
      `, [
            course_id,
            default_duration ?? null,
            default_room ?? null,
            display_order ?? 0,
            userId,
        ]);
        const newId = insertResult.rows[0].id;
        // Recharger le template avec toutes les infos utiles pour le front
        const result = await database_1.default.query(`
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
      `, [newId]);
        return res.status(201).json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (error) {
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
async function updateTemplateHandler(req, res) {
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
        const updateResult = await database_1.default.query(`
      UPDATE course_templates 
      SET 
        default_duration = COALESCE($1, default_duration),
        default_room     = COALESCE($2, default_room),
        updated_at       = NOW()
      WHERE id = $3
      RETURNING id
      `, [default_duration ?? null, default_room ?? null, id]);
        if (updateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Template non trouvé',
            });
        }
        // Rechargement avec données enrichies
        const result = await database_1.default.query(`
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
      `, [id]);
        return res.json({
            success: true,
            data: result.rows[0],
        });
    }
    catch (error) {
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
async function deleteTemplateHandler(req, res) {
    try {
        const { id } = req.params;
        const result = await database_1.default.query('DELETE FROM course_templates WHERE id = $1 RETURNING *', [id]);
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
    }
    catch (error) {
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
async function generateFromTemplatesHandler(req, res) {
    try {
        const { userId } = req.user;
        const { classId, startDate, endDate } = req.body;
        // Récupérer les templates de la classe
        const templates = await timetable_model_1.TimetableModel.getEntriesByClass(classId);
        if (templates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Aucun template trouvé pour cette classe',
            });
        }
        // Générer toutes les dates de début de semaine entre startDate et endDate
        const weekStarts = [];
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
        const created = await timetable_model_1.TimetableInstanceModel.bulkCreateInstances(instancesToCreate);
        return res.status(201).json({
            success: true,
            data: {
                weeksGenerated: weekStarts.length,
                instancesCreated: created.length,
                weekStarts,
            },
        });
    }
    catch (error) {
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
async function getStaffClassesHandler(req, res) {
    try {
        const { userId, role, establishmentId, assignedClassIds } = req.user;
        if (role === 'admin') {
            const estId = establishmentId;
            if (!estId) {
                return res.status(403).json({
                    success: false,
                    error: 'Aucun établissement associé au compte admin',
                });
            }
            const result = await database_1.default.query(`
          SELECT
            id AS class_id,
            label AS class_label,
            code AS class_code,
            level
          FROM classes
          WHERE establishment_id = $1
            AND archived = false
          ORDER BY level, label
        `, [estId]);
            return res.json({
                success: true,
                data: result.rows,
            });
        }
        const assignments = (assignedClassIds ?? []).filter(Boolean);
        if (assignments.length === 0) {
            if (!establishmentId) {
                return res.status(403).json({
                    success: false,
                    error: 'Aucun établissement associé à votre compte staff',
                });
            }
            const result = await database_1.default.query(`
          SELECT
            id AS class_id,
            label AS class_label,
            code AS class_code,
            level
          FROM classes
          WHERE establishment_id = $1
            AND archived = false
          ORDER BY level, label
        `, [establishmentId]);
            return res.json({
                success: true,
                data: result.rows,
            });
        }
        const result = await database_1.default.query(`
        SELECT
          id AS class_id,
          label AS class_label,
          code AS class_code,
          level
        FROM classes
        WHERE id = ANY($1::uuid[])
          AND archived = false
        ORDER BY level, label
      `, [assignments]);
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
/**
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
        console.error('Erreur getAvailableCourses:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des cours',
        });
    }
}
/**
 * Exporter l'emploi du temps d'une classe au format PDF (staff uniquement)
 */
async function exportClassTimetablePdfHandler(req, res) {
    let pdfStarted = false;
    try {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentification requise',
            });
            return;
        }
        const { classId } = req.params;
        const weekStartQuery = typeof req.query.weekStart === 'string' ? req.query.weekStart : undefined;
        const weekStartDate = normalizeWeekStart(weekStartQuery);
        const formatParam = typeof req.query.format === 'string' && req.query.format === 'full' ? 'full' : 'carnet';
        let themeParam = typeof req.query.theme === 'string' && req.query.theme === 'gray' ? 'gray' : 'color';
        if (typeof req.query.color === 'string') {
            themeParam = req.query.color === '0' ? 'gray' : 'color';
        }
        if (!classId) {
            res.status(400).json({
                success: false,
                error: 'ID de classe requis',
            });
            return;
        }
        const { establishmentId, assignedClassIds } = req.user;
        if (!establishmentId) {
            res.status(403).json({
                success: false,
                error: 'Aucun établissement associé au compte staff',
            });
            return;
        }
        const classResult = await database_1.default.query(`
        SELECT id, label, code, establishment_id
        FROM classes
        WHERE id = $1
        LIMIT 1
      `, [classId]);
        if (classResult.rowCount === 0) {
            res.status(404).json({
                success: false,
                error: 'Classe introuvable',
            });
            return;
        }
        const classRow = classResult.rows[0];
        if (classRow.establishment_id !== establishmentId) {
            res.status(403).json({
                success: false,
                error: 'Accès refusé pour cette classe',
            });
            return;
        }
        const sanitizedAssignments = (assignedClassIds ?? []).filter(Boolean);
        if (sanitizedAssignments.length > 0 && !sanitizedAssignments.includes(classId)) {
            res.status(403).json({
                success: false,
                error: 'Classe non accessible dans votre périmètre',
            });
            return;
        }
        let establishmentName = 'Établissement';
        let schoolYear = null;
        try {
            const establishmentResult = await database_1.default.query(`
          SELECT COALESCE(es.display_name, e.name) AS display_name,
                 es.school_year
          FROM establishments e
          LEFT JOIN establishment_settings es ON es.establishment_id = e.id
          WHERE e.id = $1
        `, [establishmentId]);
            establishmentName = establishmentResult.rows[0]?.display_name || establishmentName;
            schoolYear = establishmentResult.rows[0]?.school_year || null;
        }
        catch (err) {
            if (err?.code === '42P01') {
                const fallbackResult = await database_1.default.query(`
            SELECT name
            FROM establishments
            WHERE id = $1
          `, [establishmentId]);
                establishmentName = fallbackResult.rows[0]?.name || establishmentName;
            }
            else {
                throw err;
            }
        }
        const instances = await timetable_model_1.TimetableInstanceModel.getInstancesForWeek(classId, weekStartDate);
        const doc = new pdfkit_1.default(formatParam === 'full'
            ? { size: 'A4', layout: 'landscape', margin: 36 }
            : { size: 'A4', layout: 'portrait', margin: PAGE_MARGIN_PT });
        pdfStarted = true;
        const safeLabel = sanitizeFilePart(classRow.label || classRow.code || 'classe');
        const filename = `EDT_${safeLabel}_${weekStartDate}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=\"${filename}\"`);
        const effectiveSchoolYear = schoolYear && schoolYear.trim().length > 0
            ? schoolYear
            : computeAcademicYear(parseDateOrThrow(weekStartDate));
        console.log(`[PDF_EXPORT] establishmentName=${establishmentName} classId=${classId} weekStart=${weekStartDate} schoolYear=${effectiveSchoolYear} theme=${themeParam}`);
        doc.pipe(res);
        if (formatParam === 'full') {
            drawClassTimetablePdf(doc, {
                establishmentName,
                classLabel: classRow.label || classRow.code || 'Classe',
                classCode: classRow.code,
                weekStart: weekStartDate,
                instances,
                schoolYear: effectiveSchoolYear,
                theme: themeParam,
            });
        }
        else {
            drawCarnetTimetablePdf(doc, {
                establishmentName,
                classLabel: classRow.label || classRow.code || 'Classe',
                classCode: classRow.code,
                weekStart: weekStartDate,
                instances,
                schoolYear: effectiveSchoolYear,
                theme: themeParam,
            });
        }
        await (0, audit_service_1.logAuditEvent)({
            req,
            action: 'TIMETABLE_PDF_EXPORTED',
            entityType: 'class',
            entityId: classId,
            metadata: { weekStart: weekStartDate, format: formatParam, theme: themeParam },
        });
        doc.end();
    }
    catch (error) {
        console.error('Erreur export PDF emploi du temps:', error);
        if (!pdfStarted && !res.headersSent) {
            res.status(500).json({
                success: false,
                error: 'Impossible de générer le PDF',
            });
        }
        else if (!res.headersSent) {
            res.end();
        }
    }
}
/**
 * Mettre à jour un cours (staff)
 */
async function updateCourseForStaffHandler(req, res) {
    try {
        const { courseId } = req.params;
        const { class_id, subject_id, teacher_id, default_room } = req.body;
        const { establishmentId } = req.user;
        // 1. Vérifier que le cours existe et appartient à la classe
        const courseResult = await database_1.default.query(`
      SELECT 
        id,
        class_id,
        establishment_id
      FROM courses
      WHERE id = $1
      `, [courseId]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Cours non trouvé",
            });
        }
        const course = courseResult.rows[0];
        // 2. Vérifier que c'est bien une classe gérée par cet établissement
        if (establishmentId &&
            course.establishment_id &&
            course.establishment_id !== establishmentId) {
            return res.status(403).json({
                success: false,
                error: "Cours invalide pour cet établissement",
            });
        }
        // 3. Mise à jour simple du cours (on fait confiance aux IDs reçus)
        await database_1.default.query(`
      UPDATE courses
      SET 
        class_id = $1,
        subject_id = $2,
        teacher_id = $3,
        establishment_id = COALESCE(establishment_id, $4)
      WHERE id = $5
      `, [class_id, subject_id, teacher_id, establishmentId, courseId]);
        // 4. Mettre à jour la salle par défaut du template associé si fournie
        if (typeof default_room !== "undefined") {
            await database_1.default.query(`
        UPDATE course_templates
        SET default_room = $1
        WHERE course_id = $2
        `, [default_room || null, courseId]);
        }
        // 5. Renvoyer la liste à jour des cours de la classe
        const courses = await timetable_model_1.TimetableModel.getAvailableCoursesForClass(class_id);
        return res.json({
            success: true,
            data: courses,
        });
    }
    catch (error) {
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
async function deleteCourseForStaffHandler(req, res) {
    const client = await database_1.default.connect();
    try {
        const { courseId } = req.params;
        const { establishmentId } = req.user;
        await client.query('BEGIN');
        // 1. Vérifier que le cours existe
        const courseResult = await client.query(`
      SELECT 
        id,
        class_id,
        establishment_id
      FROM courses
      WHERE id = $1
      `, [courseId]);
        if (courseResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Cours non trouvé',
            });
        }
        const course = courseResult.rows[0];
        // 2. Vérifier l’appartenance à l’établissement
        if (course.establishment_id &&
            establishmentId &&
            course.establishment_id !== establishmentId) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                success: false,
                error: 'Cours invalide pour cet établissement',
            });
        }
        // 3.a Supprimer les instances liées au cours
        await client.query(`
      DELETE FROM timetable_instances
      WHERE course_id = $1
      `, [courseId]);
        // 3.b Supprimer les templates liés au cours (si tu as cette table)
        await client.query(`
      DELETE FROM course_templates
      WHERE course_id = $1
      `, [courseId]);
        // 3.c Supprimer le cours lui-même
        const deleteResult = await client.query(`
      DELETE FROM courses
      WHERE id = $1
      `, [courseId]);
        if (deleteResult.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Cours non trouvé ou déjà supprimé',
            });
        }
        await client.query('COMMIT');
        return res.json({
            success: true,
            message: 'Cours supprimé avec succès',
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Erreur deleteCourseForStaffHandler:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression du cours',
        });
    }
    finally {
        client.release();
    }
}
// 🔹 Récupérer les matières visibles par un staff (en fonction de ses classes)
async function getSubjectsForStaffHandler(req, res) {
    try {
        const { establishmentId } = req.user;
        if (!establishmentId) {
            return res.status(403).json({
                success: false,
                error: 'Aucun établissement associé à votre compte staff',
            });
        }
        const subjectsRes = await database_1.default.query(`
      SELECT id, name, short_code, color, level, establishment_id
      FROM subjects
      WHERE establishment_id = $1
         OR establishment_id IS NULL
      ORDER BY name ASC
      `, [establishmentId]);
        return res.json({
            success: true,
            data: subjectsRes.rows,
        });
    }
    catch (error) {
        console.error("Erreur getSubjectsForStaff:", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la récupération des matières",
        });
    }
}
// 🔹 Récupérer les professeurs pour l'établissement du staff
// 🔹 Récupérer les professeurs pour l'établissement du staff
async function getTeachersForStaffHandler(req, res) {
    try {
        // ⚠️ MODE DEBUG : on ignore l'établissement, on renvoie tous les profs
        const teachersRes = await database_1.default.query(`
      SELECT id, full_name, email, role, active, establishment_id
      FROM users
      WHERE role = 'teacher'
      ORDER BY full_name ASC
      `);
        return res.json({
            success: true,
            data: teachersRes.rows,
        });
    }
    catch (error) {
        console.error("Erreur getTeachersForStaff (DEBUG):", error);
        return res.status(500).json({
            success: false,
            error: "Erreur lors de la récupération des professeurs",
        });
    }
}
// 🔹 Création d'un cours par le STAFF
async function createCourseForStaffHandler(req, res) {
    try {
        const { userId, role, assignedClassIds, establishmentId } = req.user;
        const { class_id, subject_id, teacher_id, default_room } = req.body;
        if (role !== 'staff' && role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: "Accès réservé au staff / admin",
            });
        }
        const sanitizedAssignments = (assignedClassIds ?? []).filter(Boolean);
        if (role === 'staff') {
            if (!establishmentId) {
                return res.status(403).json({
                    success: false,
                    error: "Aucun établissement associé à ce compte",
                });
            }
            if (sanitizedAssignments.length > 0 && !sanitizedAssignments.includes(class_id)) {
                return res.status(403).json({
                    success: false,
                    error: "Vous ne gérez pas cette classe",
                });
            }
        }
        if (role === 'admin' && req.user?.establishmentId == null) {
            return res.status(403).json({
                success: false,
                error: "Aucun établissement associé à ce compte",
            });
        }
        // Récupérer infos de la classe (année + établissement)
        const classRes = await database_1.default.query(`
      SELECT academic_year, establishment_id, label, code
      FROM classes
      WHERE id = $1
      `, [class_id]);
        if (classRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Classe non trouvée",
            });
        }
        const { academic_year, establishment_id, label, code } = classRes.rows[0];
        if (req.user?.establishmentId &&
            req.user.establishmentId !== establishment_id) {
            return res.status(403).json({
                success: false,
                error: "Vous ne pouvez pas modifier une classe d'un autre établissement",
            });
        }
        // Vérifier que la matière appartient bien à l'établissement
        const subjRes = await database_1.default.query(`SELECT id FROM subjects WHERE id = $1 AND (establishment_id = $2 OR establishment_id IS NULL)`, [subject_id, establishment_id]);
        if (subjRes.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Matière invalide pour cet établissement",
            });
        }
        // Vérifier que le prof appartient bien à l'établissement
        const teacherRes = await database_1.default.query(`SELECT id FROM users WHERE id = $1 AND role = 'teacher' AND establishment_id = $2`, [teacher_id, establishment_id]);
        if (teacherRes.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: "Professeur invalide pour cet établissement",
            });
        }
        // 🧱 Création du cours
        const title = `${code ?? ''} ${label ?? ''}`.trim() || 'Cours';
        const insertRes = await database_1.default.query(`
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
      `, [subject_id, class_id, teacher_id, academic_year, title, establishment_id, default_room || null]);
        const courseId = insertRes.rows[0].id;
        // Retourner le cours dans le même format que getAvailableCoursesForClass
        const fullRes = await database_1.default.query(`
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
      `, [courseId]);
        return res.status(201).json({
            success: true,
            data: fullRes.rows[0],
        });
    }
    catch (error) {
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
async function checkConflictsHandler(req, res) {
    try {
        const { course_id, class_id, week_start_date, day_of_week, start_time, end_time, room, exclude_instance_id, } = req.body;
        const conflicts = [];
        // Récupérer les infos du cours
        const courseQuery = 'SELECT teacher_id FROM courses WHERE id = $1';
        const courseResult = await database_1.default.query(courseQuery, [course_id]);
        if (courseResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Cours non trouvé',
            });
        }
        const teacherId = courseResult.rows[0].teacher_id;
        // Vérifier conflit professeur
        const teacherConflict = await timetable_model_1.TimetableModel.checkTeacherConflict(teacherId, week_start_date, day_of_week, start_time, end_time, exclude_instance_id);
        if (teacherConflict.hasConflict) {
            conflicts.push({
                type: 'teacher',
                details: teacherConflict.conflictDetails,
            });
        }
        // Vérifier conflit salle (si une salle est spécifiée)
        if (room) {
            const roomConflict = await timetable_model_1.TimetableModel.checkRoomConflict(class_id, week_start_date, day_of_week, start_time, end_time, room, exclude_instance_id);
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
    }
    catch (error) {
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
async function getClassTimetableHandler(req, res) {
    try {
        const { classId } = req.params;
        // Rediriger vers la nouvelle API
        console.warn('⚠️ LEGACY API - Utiliser /class/:classId/week/:weekStartDate à la place');
        const entries = await timetable_model_1.TimetableModel.getEntriesByClass(classId);
        return res.json({
            success: true,
            data: entries,
        });
    }
    catch (error) {
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
async function getTeacherTimetableHandler(req, res) {
    try {
        const { teacherId } = req.params;
        console.warn('⚠️ LEGACY API - Utiliser /teacher/:teacherId/week/:weekStartDate à la place');
        // Retourner un tableau vide pour éviter les erreurs
        return res.json({
            success: true,
            data: [],
        });
    }
    catch (error) {
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
async function createEntryHandler(req, res) {
    try {
        const entry = await timetable_model_1.TimetableModel.createEntry(req.body);
        return res.status(201).json({
            success: true,
            data: entry,
        });
    }
    catch (error) {
        console.error('Erreur createEntry:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du créneau',
        });
    }
}
async function bulkCreateEntriesHandler(req, res) {
    try {
        const { entries } = req.body;
        const created = await timetable_model_1.TimetableModel.bulkCreateEntries(entries);
        return res.status(201).json({
            success: true,
            data: created,
        });
    }
    catch (error) {
        console.error('Erreur bulkCreateEntries:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la création des créneaux',
        });
    }
}
async function updateEntryHandler(req, res) {
    try {
        const { id } = req.params;
        const entry = await timetable_model_1.TimetableModel.updateEntry(id, req.body);
        return res.json({
            success: true,
            data: entry,
        });
    }
    catch (error) {
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
async function deleteEntryHandler(req, res) {
    try {
        const { id } = req.params;
        const entry = await timetable_model_1.TimetableModel.deleteEntry(id);
        return res.json({
            success: true,
            data: entry,
        });
    }
    catch (error) {
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
async function createFromTemplateHandler(req, res) {
    try {
        const { template_id, ...entryData } = req.body;
        // Récupérer le template
        const templateQuery = 'SELECT * FROM timetable_entries WHERE id = $1';
        const templateResult = await database_1.default.query(templateQuery, [template_id]);
        if (templateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Template non trouvé',
            });
        }
        const template = templateResult.rows[0];
        // Créer l'entry avec les données du template
        const entry = await timetable_model_1.TimetableModel.createEntry({
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
    }
    catch (error) {
        console.error('Erreur createFromTemplate:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur lors de la création depuis le template',
        });
    }
}
async function duplicateTimetableHandler(req, res) {
    try {
        return res.status(501).json({
            success: false,
            error: 'Fonctionnalité non implémentée en mode dynamic',
        });
    }
    catch (error) {
        console.error('Erreur duplicateTimetable:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur',
        });
    }
}
//# sourceMappingURL=timetable.controller.js.map