"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyCoursesHandler = getMyCoursesHandler;
exports.getCourseStudents = getCourseStudents;
const database_1 = require("../config/database");
/**
 * GET /api/courses/my-courses
 * Récupère tous les cours du professeur connecté
 */
async function getMyCoursesHandler(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { userId, establishmentId } = req.user;
        if (!establishmentId) {
            res.status(403).json({
                success: false,
                error: 'Aucun établissement associé à votre compte',
            });
            return;
        }
        const query = `
      SELECT 
        c.id,
        c.title,
        c.academic_year,
        s.name as subject_name,
        s.code as subject_code,
        cl.label as class_label,
        cl.code as class_code,
        cl.level as class_level
      FROM courses c
      INNER JOIN subjects s ON s.id = c.subject_id
      INNER JOIN classes cl ON cl.id = c.class_id
      WHERE c.teacher_id = $1
        AND cl.establishment_id = $2
        AND c.active = TRUE
      ORDER BY cl.label, s.name
    `;
        const result = await database_1.pool.query(query, [userId, establishmentId]);
        res.json({
            success: true,
            data: result.rows,
        });
    }
    catch (error) {
        console.error('Erreur récupération cours:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des cours',
        });
    }
}
// GET /api/courses/:courseId/students
// Récupérer les élèves d'un cours
async function getCourseStudents(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: 'Non authentifié' });
            return;
        }
        const { courseId } = req.params;
        const { userId, role, establishmentId } = req.user;
        if (!establishmentId) {
            res.status(403).json({
                success: false,
                error: 'Aucun établissement associé à votre compte',
            });
            return;
        }
        const courseResult = await database_1.pool.query(`
        SELECT 
          c.id,
          c.teacher_id,
          c.class_id,
          c.establishment_id,
          cl.label AS class_label
        FROM courses c
        INNER JOIN classes cl ON cl.id = c.class_id
        WHERE c.id = $1
      `, [courseId]);
        if (courseResult.rowCount === 0) {
            res.status(404).json({ success: false, error: 'Cours introuvable' });
            return;
        }
        const course = courseResult.rows[0];
        if (course.establishment_id !== establishmentId) {
            res.status(403).json({
                success: false,
                error: 'Vous ne pouvez pas consulter les élèves de ce cours',
            });
            return;
        }
        if (role === 'teacher' && course.teacher_id !== userId) {
            res.status(403).json({
                success: false,
                error: 'Ce cours ne vous est pas attribué',
            });
            return;
        }
        const studentsResult = await database_1.pool.query(`
        SELECT 
          u.id,
          u.full_name,
          u.email,
          sp.student_no,
          st.class_id,
          cl.label AS class_label
        FROM students st
        INNER JOIN users u ON u.id = st.user_id
          AND u.role = 'student'
          AND u.active = TRUE
          AND u.establishment_id = $1
        INNER JOIN classes cl ON cl.id = st.class_id
        LEFT JOIN student_profiles sp ON sp.user_id = u.id
        WHERE st.class_id = $2
          AND cl.establishment_id = $1
        ORDER BY u.full_name
      `, [establishmentId, course.class_id]);
        res.json({
            success: true,
            data: studentsResult.rows,
        });
    }
    catch (error) {
        console.error('Erreur récupération élèves du cours:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des élèves',
        });
    }
}
//# sourceMappingURL=course.controller.js.map