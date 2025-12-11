"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findReportCard = findReportCard;
exports.createOrUpdateReportCard = createOrUpdateReportCard;
exports.validateReportCard = validateReportCard;
exports.unvalidateReportCard = unvalidateReportCard;
exports.setCouncilAppreciation = setCouncilAppreciation;
exports.getClassReportCards = getClassReportCards;
exports.findSubjectAppreciation = findSubjectAppreciation;
exports.setSubjectAppreciation = setSubjectAppreciation;
exports.getStudentAppreciations = getStudentAppreciations;
exports.deleteSubjectAppreciation = deleteSubjectAppreciation;
const database_1 = require("../config/database");
// =========================
// Report Cards
// =========================
async function findReportCard(studentId, termId, establishmentId) {
    const params = [studentId, termId];
    let where = 'student_id = $1 AND term_id = $2';
    if (establishmentId) {
        params.push(establishmentId);
        where += ' AND establishment_id = $3';
    }
    const result = await database_1.pool.query(`SELECT 
      id,
      student_id as "studentId",
      term_id as "termId",
      establishment_id as "establishmentId",
      council_appreciation as "councilAppreciation",
      council_appreciation_by as "councilAppreciationBy",
      council_appreciation_at as "councilAppreciationAt",
      validated_at as "validatedAt",
      validated_by as "validatedBy",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM report_cards
    WHERE ${where}`, params);
    return result.rows[0] || null;
}
async function createOrUpdateReportCard(studentId, termId, establishmentId) {
    const result = await database_1.pool.query(`INSERT INTO report_cards (student_id, term_id, establishment_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (student_id, term_id) DO UPDATE SET updated_at = NOW()
    RETURNING 
      id,
      student_id as "studentId",
      term_id as "termId",
      establishment_id as "establishmentId",
      council_appreciation as "councilAppreciation",
      council_appreciation_by as "councilAppreciationBy",
      council_appreciation_at as "councilAppreciationAt",
      validated_at as "validatedAt",
      validated_by as "validatedBy",
      created_at as "createdAt",
      updated_at as "updatedAt"`, [studentId, termId, establishmentId]);
    return result.rows[0];
}
async function validateReportCard(studentId, termId, validatedBy, establishmentId) {
    // Créer le report_card s'il n'existe pas, puis valider
    const result = await database_1.pool.query(`INSERT INTO report_cards (student_id, term_id, establishment_id, validated_at, validated_by)
    VALUES ($1, $2, $3, NOW(), $4)
    ON CONFLICT (student_id, term_id) DO UPDATE SET 
      validated_at = NOW(),
      validated_by = $4,
      updated_at = NOW()
    RETURNING 
      id,
      student_id as "studentId",
      term_id as "termId",
      establishment_id as "establishmentId",
      council_appreciation as "councilAppreciation",
      council_appreciation_by as "councilAppreciationBy",
      council_appreciation_at as "councilAppreciationAt",
      validated_at as "validatedAt",
      validated_by as "validatedBy",
      created_at as "createdAt",
      updated_at as "updatedAt"`, [studentId, termId, establishmentId, validatedBy]);
    return result.rows[0];
}
async function unvalidateReportCard(studentId, termId) {
    const result = await database_1.pool.query(`UPDATE report_cards 
    SET validated_at = NULL, validated_by = NULL, updated_at = NOW()
    WHERE student_id = $1 AND term_id = $2
    RETURNING 
      id,
      student_id as "studentId",
      term_id as "termId",
      establishment_id as "establishmentId",
      council_appreciation as "councilAppreciation",
      validated_at as "validatedAt",
      validated_by as "validatedBy"`, [studentId, termId]);
    return result.rows[0] || null;
}
async function setCouncilAppreciation(studentId, termId, appreciation, appreciationBy, establishmentId) {
    const result = await database_1.pool.query(`INSERT INTO report_cards (student_id, term_id, establishment_id, council_appreciation, council_appreciation_by, council_appreciation_at)
    VALUES ($1, $2, $3, $4, $5, NOW())
    ON CONFLICT (student_id, term_id) DO UPDATE SET 
      council_appreciation = $4,
      council_appreciation_by = $5,
      council_appreciation_at = NOW(),
      updated_at = NOW()
    RETURNING 
      id,
      student_id as "studentId",
      term_id as "termId",
      establishment_id as "establishmentId",
      council_appreciation as "councilAppreciation",
      council_appreciation_by as "councilAppreciationBy",
      council_appreciation_at as "councilAppreciationAt",
      validated_at as "validatedAt",
      validated_by as "validatedBy",
      created_at as "createdAt",
      updated_at as "updatedAt"`, [studentId, termId, establishmentId, appreciation, appreciationBy]);
    return result.rows[0];
}
async function getClassReportCards(classId, termId, establishmentId) {
    const result = await database_1.pool.query(`SELECT 
      u.id as student_id,
      u.full_name as student_name,
      rc.id as report_card_id,
      rc.council_appreciation,
      rc.validated_at,
      rc.validated_by,
      validator.full_name as validated_by_name
    FROM classes cl
    INNER JOIN students st ON st.class_id = cl.id
    INNER JOIN users u ON u.id = st.user_id
      AND u.role = 'student'
      AND u.active = TRUE
      AND u.establishment_id = $3
    LEFT JOIN report_cards rc ON rc.student_id = u.id AND rc.term_id = $2
    LEFT JOIN users validator ON validator.id = rc.validated_by
    WHERE cl.id = $1
      AND cl.establishment_id = $3
    ORDER BY u.full_name`, [classId, termId, establishmentId]);
    return result.rows;
}
// =========================
// Subject Appreciations
// =========================
async function findSubjectAppreciation(studentId, termId, courseId) {
    const result = await database_1.pool.query(`SELECT 
      id,
      student_id as "studentId",
      term_id as "termId",
      course_id as "courseId",
      teacher_id as "teacherId",
      appreciation,
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM subject_appreciations
    WHERE student_id = $1 AND term_id = $2 AND course_id = $3`, [studentId, termId, courseId]);
    return result.rows[0] || null;
}
async function setSubjectAppreciation(studentId, termId, courseId, teacherId, appreciation) {
    const result = await database_1.pool.query(`INSERT INTO subject_appreciations (student_id, term_id, course_id, teacher_id, appreciation)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (student_id, term_id, course_id) DO UPDATE SET 
      appreciation = $5,
      teacher_id = $4,
      updated_at = NOW()
    RETURNING 
      id,
      student_id as "studentId",
      term_id as "termId",
      course_id as "courseId",
      teacher_id as "teacherId",
      appreciation,
      created_at as "createdAt",
      updated_at as "updatedAt"`, [studentId, termId, courseId, teacherId, appreciation]);
    return result.rows[0];
}
async function getStudentAppreciations(studentId, termId) {
    const result = await database_1.pool.query(`SELECT 
      sa.id,
      sa.appreciation,
      sa.course_id as "courseId",
      sa.teacher_id as "teacherId",
      s.name as subject_name,
      u.full_name as teacher_name,
      sa.created_at as "createdAt",
      sa.updated_at as "updatedAt"
    FROM subject_appreciations sa
    INNER JOIN courses c ON c.id = sa.course_id
    INNER JOIN subjects s ON s.id = c.subject_id
    INNER JOIN users u ON u.id = sa.teacher_id
    WHERE sa.student_id = $1 AND sa.term_id = $2
    ORDER BY s.name`, [studentId, termId]);
    return result.rows;
}
async function deleteSubjectAppreciation(studentId, termId, courseId) {
    const result = await database_1.pool.query(`DELETE FROM subject_appreciations 
    WHERE student_id = $1 AND term_id = $2 AND course_id = $3`, [studentId, termId, courseId]);
    return (result.rowCount ?? 0) > 0;
}
//# sourceMappingURL=reportCard.model.js.map