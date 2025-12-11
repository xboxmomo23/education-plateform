"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttendanceModel = void 0;
const database_1 = __importDefault(require("../config/database"));
// ============================================
// MODEL
// ============================================
exports.AttendanceModel = {
    // ============================================
    // SESSIONS
    // ============================================
    /**
     * Récupérer les cours d'un professeur pour une semaine (avec statut présence)
     */
    async getTeacherWeekCourses(teacherId, weekStartDate, establishmentId) {
        const query = `
      SELECT 
        ti.id AS instance_id,
        ases.id AS session_id,
        ti.class_id,
        cl.label AS class_label,
        ti.course_id,
        s.name AS subject_name,
        s.code AS subject_code,
        s.color AS subject_color,
        ti.day_of_week,
        (ti.week_start_date + ((ti.day_of_week - 1) || ' days')::INTERVAL)::DATE AS session_date,
        ti.start_time,
        ti.end_time,
        ti.room,
        CASE WHEN ases.id IS NOT NULL THEN true ELSE false END AS has_session,
        ases.status,
        COALESCE((
          SELECT COUNT(*) FROM attendance_records ar 
          WHERE ar.session_id = ases.id AND ar.status = 'present'
        ), 0)::INTEGER AS present_count,
        COALESCE((
          SELECT COUNT(*) FROM attendance_records ar 
          WHERE ar.session_id = ases.id AND ar.status = 'absent'
        ), 0)::INTEGER AS absent_count,
        COALESCE((
          SELECT COUNT(*) FROM attendance_records ar 
          WHERE ar.session_id = ases.id AND ar.status = 'late'
        ), 0)::INTEGER AS late_count,
        COALESCE((
          SELECT COUNT(*) FROM students st WHERE st.class_id = ti.class_id
        ), 0)::INTEGER AS total_students
      FROM timetable_instances ti
      JOIN courses c ON ti.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN classes cl ON ti.class_id = cl.id
      LEFT JOIN attendance_sessions ases ON ases.instance_id = ti.id
      WHERE c.teacher_id = $1
        AND ti.week_start_date = $2
      ORDER BY ti.day_of_week, ti.start_time
    `;
        const result = await database_1.default.query(query, [teacherId, weekStartDate]);
        return result.rows;
    },
    /**
     * Récupérer ou créer une session pour une instance
     */
    async getOrCreateSession(instanceId, userId) {
        // Utiliser la fonction PostgreSQL
        const createQuery = 'SELECT get_or_create_attendance_session($1, $2) AS session_id';
        const createResult = await database_1.default.query(createQuery, [instanceId, userId]);
        const sessionId = createResult.rows[0].session_id;
        // Initialiser les enregistrements de présence
        await database_1.default.query('SELECT init_attendance_records($1, $2)', [sessionId, userId]);
        // Retourner les détails complets
        return this.getSessionById(sessionId);
    },
    /**
     * Récupérer une session par ID avec détails
     */
    async getSessionById(sessionId) {
        const query = `
      SELECT 
        ases.*,
        cl.label AS class_label,
        s.name AS subject_name,
        s.code AS subject_code,
        s.color AS subject_color,
        u.full_name AS teacher_name,
        ti.room,
        ti.day_of_week,
        ti.week_start_date,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ases.id)::INTEGER AS total_students,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ases.id AND ar.status = 'present')::INTEGER AS present_count,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ases.id AND ar.status = 'absent')::INTEGER AS absent_count,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ases.id AND ar.status = 'late')::INTEGER AS late_count
      FROM attendance_sessions ases
      JOIN timetable_instances ti ON ases.instance_id = ti.id
      JOIN classes cl ON ases.class_id = cl.id
      JOIN courses c ON ases.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON ases.teacher_id = u.id
      WHERE ases.id = $1
    `;
        const result = await database_1.default.query(query, [sessionId]);
        return result.rows[0];
    },
    /**
     * Récupérer une session par instance_id
     */
    async getSessionByInstanceId(instanceId) {
        const query = `
      SELECT 
        ases.*,
        cl.label AS class_label,
        s.name AS subject_name,
        s.code AS subject_code,
        s.color AS subject_color,
        u.full_name AS teacher_name,
        ti.room,
        ti.day_of_week,
        ti.week_start_date,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ases.id)::INTEGER AS total_students,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ases.id AND ar.status = 'present')::INTEGER AS present_count,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ases.id AND ar.status = 'absent')::INTEGER AS absent_count,
        (SELECT COUNT(*) FROM attendance_records ar WHERE ar.session_id = ases.id AND ar.status = 'late')::INTEGER AS late_count
      FROM attendance_sessions ases
      JOIN timetable_instances ti ON ases.instance_id = ti.id
      JOIN classes cl ON ases.class_id = cl.id
      JOIN courses c ON ases.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN users u ON ases.teacher_id = u.id
      WHERE ases.instance_id = $1
    `;
        const result = await database_1.default.query(query, [instanceId]);
        return result.rows[0] || null;
    },
    /**
     * Fermer une session
     */
    async closeSession(sessionId, userId) {
        const query = `
      UPDATE attendance_sessions
      SET status = 'closed', closed_at = NOW(), closed_by = $2
      WHERE id = $1
      RETURNING *
    `;
        const result = await database_1.default.query(query, [sessionId, userId]);
        return result.rows[0];
    },
    // ============================================
    // RECORDS (Présences individuelles)
    // ============================================
    /**
     * Récupérer tous les élèves d'une session avec leur statut
     */
    async getSessionStudents(sessionId) {
        // D'abord récupérer le class_id de la session
        const sessionQuery = 'SELECT class_id FROM attendance_sessions WHERE id = $1';
        const sessionResult = await database_1.default.query(sessionQuery, [sessionId]);
        if (sessionResult.rows.length === 0) {
            throw new Error('Session non trouvée');
        }
        const classId = sessionResult.rows[0].class_id;
        // Récupérer tous les élèves de la classe avec leur statut de présence
        const query = `
      SELECT 
        u.id AS user_id,
        u.full_name,
        u.email,
        sp.student_no AS student_number,
        ar.status,
        ar.comment,
        ar.late_minutes,
        ar.id AS record_id
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN student_profiles sp ON sp.user_id = u.id
      LEFT JOIN attendance_records ar ON ar.student_id = u.id AND ar.session_id = $1
      WHERE s.class_id = $2
        AND u.active = true
      ORDER BY u.full_name
    `;
        const result = await database_1.default.query(query, [sessionId, classId]);
        return result.rows;
    },
    /**
     * Marquer la présence d'un élève
     */
    async markAttendance(sessionId, studentId, status, userId, options) {
        const query = `
      INSERT INTO attendance_records (
        session_id, student_id, status, comment, late_minutes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (session_id, student_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        comment = EXCLUDED.comment,
        late_minutes = EXCLUDED.late_minutes,
        updated_at = NOW(),
        updated_by = EXCLUDED.created_by
      RETURNING *
    `;
        const result = await database_1.default.query(query, [
            sessionId,
            studentId,
            status,
            options?.comment || null,
            options?.lateMinutes || null,
            userId
        ]);
        return result.rows[0];
    },
    /**
     * Marquer plusieurs élèves en masse
     */
    async bulkMarkAttendance(sessionId, records, userId) {
        const client = await database_1.default.connect();
        const results = [];
        try {
            await client.query('BEGIN');
            for (const record of records) {
                const query = `
          INSERT INTO attendance_records (
            session_id, student_id, status, comment, late_minutes, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (session_id, student_id)
          DO UPDATE SET
            status = EXCLUDED.status,
            comment = EXCLUDED.comment,
            late_minutes = EXCLUDED.late_minutes,
            updated_at = NOW(),
            updated_by = EXCLUDED.created_by
          RETURNING *
        `;
                const result = await client.query(query, [
                    sessionId,
                    record.studentId,
                    record.status,
                    record.comment || null,
                    record.lateMinutes || null,
                    userId
                ]);
                results.push(result.rows[0]);
            }
            await client.query('COMMIT');
            return results;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    },
    // ============================================
    // HISTORIQUE ÉLÈVE
    // ============================================
    /**
     * Récupérer l'historique de présence d'un élève
     */
    async getStudentAttendanceHistory(studentId, options) {
        let query = `
      SELECT 
        ar.*,
        ases.session_date,
        ases.start_time,
        ases.end_time,
        s.name AS subject_name,
        s.color AS subject_color,
        cl.label AS class_label
      FROM attendance_records ar
      JOIN attendance_sessions ases ON ar.session_id = ases.id
      JOIN courses c ON ases.course_id = c.id
      JOIN subjects s ON c.subject_id = s.id
      JOIN classes cl ON ases.class_id = cl.id
      WHERE ar.student_id = $1
    `;
        const params = [studentId];
        let paramIndex = 2;
        if (options?.startDate) {
            query += ` AND ases.session_date >= $${paramIndex}`;
            params.push(options.startDate);
            paramIndex++;
        }
        if (options?.endDate) {
            query += ` AND ases.session_date <= $${paramIndex}`;
            params.push(options.endDate);
            paramIndex++;
        }
        if (options?.courseId) {
            query += ` AND ases.course_id = $${paramIndex}`;
            params.push(options.courseId);
            paramIndex++;
        }
        query += ` ORDER BY ases.session_date DESC, ases.start_time DESC`;
        if (options?.limit) {
            query += ` LIMIT $${paramIndex}`;
            params.push(options.limit);
        }
        const result = await database_1.default.query(query, params);
        return result.rows;
    },
    /**
     * Récupérer les statistiques de présence d'un élève
     */
    async getStudentAttendanceStats(studentId, options) {
        let query = `
      SELECT 
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (WHERE ar.status = 'present')::INTEGER AS present,
        COUNT(*) FILTER (WHERE ar.status = 'absent')::INTEGER AS absent,
        COUNT(*) FILTER (WHERE ar.status = 'late')::INTEGER AS late,
        COUNT(*) FILTER (WHERE ar.status = 'excused')::INTEGER AS excused
      FROM attendance_records ar
      JOIN attendance_sessions ases ON ar.session_id = ases.id
      WHERE ar.student_id = $1
    `;
        const params = [studentId];
        let paramIndex = 2;
        if (options?.startDate) {
            query += ` AND ases.session_date >= $${paramIndex}`;
            params.push(options.startDate);
            paramIndex++;
        }
        if (options?.endDate) {
            query += ` AND ases.session_date <= $${paramIndex}`;
            params.push(options.endDate);
            paramIndex++;
        }
        if (options?.courseId) {
            query += ` AND ases.course_id = $${paramIndex}`;
            params.push(options.courseId);
            paramIndex++;
        }
        const result = await database_1.default.query(query, params);
        const stats = result.rows[0];
        // Calculer le taux de présence
        const presentAndLate = stats.present + stats.late;
        const rate = stats.total > 0
            ? Math.round((presentAndLate / stats.total) * 100)
            : 100;
        return {
            ...stats,
            rate
        };
    },
    // ============================================
    // VÉRIFICATIONS D'ACCÈS
    // ============================================
    /**
     * Vérifier si un utilisateur peut accéder à une session
     */
    async canAccessSession(userId, role, sessionId) {
        // Admin peut tout faire
        if (role === 'admin')
            return true;
        // Récupérer la session
        const sessionQuery = `
      SELECT teacher_id, class_id, establishment_id
      FROM attendance_sessions
      WHERE id = $1
    `;
        const sessionResult = await database_1.default.query(sessionQuery, [sessionId]);
        if (sessionResult.rows.length === 0)
            return false;
        const session = sessionResult.rows[0];
        // Professeur de ce cours
        if (role === 'teacher' && session.teacher_id === userId) {
            return true;
        }
        // Staff assigné à cette classe
        if (role === 'staff') {
            const staffCheck = await database_1.default.query('SELECT 1 FROM class_staff WHERE user_id = $1 AND class_id = $2', [userId, session.class_id]);
            return staffCheck.rows.length > 0;
        }
        return false;
    },
    /**
     * Vérifier si un utilisateur peut accéder à une instance
     */
    async canAccessInstance(userId, role, instanceId) {
        // Admin peut tout faire
        if (role === 'admin')
            return true;
        // Récupérer l'instance
        const instanceQuery = `
      SELECT ti.class_id, c.teacher_id
      FROM timetable_instances ti
      JOIN courses c ON ti.course_id = c.id
      WHERE ti.id = $1
    `;
        const instanceResult = await database_1.default.query(instanceQuery, [instanceId]);
        if (instanceResult.rows.length === 0)
            return false;
        const instance = instanceResult.rows[0];
        // Professeur de ce cours
        if (role === 'teacher' && instance.teacher_id === userId) {
            return true;
        }
        // Staff assigné à cette classe
        if (role === 'staff') {
            const staffCheck = await database_1.default.query('SELECT 1 FROM class_staff WHERE user_id = $1 AND class_id = $2', [userId, instance.class_id]);
            return staffCheck.rows.length > 0;
        }
        return false;
    }
};
//# sourceMappingURL=attendance.model.js.map