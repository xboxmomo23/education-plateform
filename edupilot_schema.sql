-- =========================
-- EduPilot - Schema PostgreSQL Complet
-- Version: 1.0.0 - Optimisé et Sécurisé
-- =========================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
psql -d edupilot -f edupilot_schema.sql

-- Supprimer les objets existants si nécessaire (ATTENTION en production)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- =========================
-- ENUMS
-- =========================

CREATE TYPE user_role AS ENUM ('student', 'teacher', 'responsable', 'admin');
CREATE TYPE evaluation_type AS ENUM ('controle', 'devoir', 'participation', 'examen');
CREATE TYPE assignment_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excluded');
CREATE TYPE timetable_status AS ENUM ('confirmed', 'cancelled', 'changed');
CREATE TYPE week_type AS ENUM ('A', 'B');
CREATE TYPE class_level AS ENUM ('6eme', '5eme', '4eme', '3eme', 'seconde', 'premiere', 'terminale');

-- =========================
-- USERS & AUTHENTICATION
-- =========================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, -- Obligatoire maintenant
    role user_role NOT NULL,
    full_name TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Sécurité et gestion des comptes
    email_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    failed_login_attempts SMALLINT DEFAULT 0,
    account_locked_until TIMESTAMPTZ,
    password_changed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Tokens de sécurité
    verification_token TEXT,
    reset_token TEXT,
    reset_token_expires TIMESTAMPTZ,
    
    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ -- Soft delete
);

-- Index pour performances
CREATE INDEX idx_users_email_active ON users(email) WHERE active = TRUE AND deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_reset_token ON users(reset_token) WHERE reset_token IS NOT NULL;

-- =========================
-- SESSIONS JWT
-- =========================

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE, -- Hash du JWT pour révocation
    device_info TEXT, -- User agent, IP (optionnel)
    ip_address INET, -- Adresse IP de connexion
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_sessions_token_hash ON user_sessions(token_hash);

-- Fonction pour nettoyer les sessions expirées
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =========================
-- PROFILS PAR RÔLE
-- =========================

CREATE TABLE student_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    student_no TEXT UNIQUE,
    birthdate DATE,
    address TEXT,
    phone TEXT,
    emergency_contact TEXT,
    medical_notes TEXT,
    photo_url TEXT
);

CREATE TABLE teacher_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    employee_no TEXT UNIQUE,
    hire_date DATE,
    specialization TEXT,
    phone TEXT,
    office_room TEXT
);

CREATE TABLE responsable_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL, -- Important pour contact
    address TEXT,
    relation_type TEXT, -- père, mère, tuteur légal, etc.
    is_primary_contact BOOLEAN DEFAULT TRUE,
    can_view_grades BOOLEAN DEFAULT TRUE,
    can_view_attendance BOOLEAN DEFAULT TRUE,
    emergency_contact BOOLEAN DEFAULT FALSE
);

-- =========================
-- RELATION RESPONSABLES ↔ ÉLÈVES (CRUCIAL)
-- =========================

CREATE TABLE student_responsables (
    student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
    responsable_id UUID NOT NULL REFERENCES responsable_profiles(user_id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL, -- père, mère, tuteur, grand-parent, etc.
    is_primary BOOLEAN DEFAULT FALSE, -- Contact principal
    can_pickup BOOLEAN DEFAULT TRUE, -- Peut récupérer l'enfant
    receive_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (student_id, responsable_id)
);

CREATE INDEX idx_student_resp_student ON student_responsables(student_id);
CREATE INDEX idx_student_resp_responsable ON student_responsables(responsable_id);

-- =========================
-- CLASSES
-- =========================

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL, -- ex: 1A-2025
    label TEXT NOT NULL, -- ex: Première A
    academic_year SMALLINT NOT NULL, -- ex: 2025
    level class_level, -- ENUM maintenant
    capacity SMALLINT DEFAULT 30,
    current_size SMALLINT DEFAULT 0,
    room TEXT, -- Salle principale
    archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (code, academic_year)
);

CREATE INDEX idx_classes_year ON classes(academic_year) WHERE archived = FALSE;
CREATE INDEX idx_classes_level ON classes(level) WHERE archived = FALSE;

-- =========================
-- RESPONSABLES DE CLASSE (profs principaux)
-- =========================

CREATE TABLE class_responsables (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    is_main BOOLEAN DEFAULT FALSE, -- Professeur principal
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, class_id)
);

-- =========================
-- INSCRIPTIONS DES ÉLÈVES
-- =========================

CREATE TABLE enrollments (
    student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    academic_year SMALLINT NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    PRIMARY KEY (student_id, class_id, academic_year)
);

-- Un élève ne peut être que dans 1 classe par année
CREATE UNIQUE INDEX uniq_enrollment_per_year ON enrollments(student_id, academic_year) WHERE end_date IS NULL;
CREATE INDEX idx_enrollments_year ON enrollments(academic_year);
CREATE INDEX idx_enrollments_class ON enrollments(class_id);

-- =========================
-- MATIÈRES / COURS
-- =========================

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE, -- ex: MATH, FR, PHYS
    name TEXT NOT NULL,
    description TEXT,
    color TEXT, -- Code couleur pour l'interface (ex: #FF5733)
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES teacher_profiles(user_id) ON DELETE RESTRICT,
    academic_year SMALLINT NOT NULL,
    title TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subject_id, class_id, teacher_id, academic_year)
);

CREATE INDEX idx_courses_teacher ON courses(teacher_id) WHERE active = TRUE;
CREATE INDEX idx_courses_class ON courses(class_id) WHERE active = TRUE;
CREATE INDEX idx_courses_subject ON courses(subject_id);

-- =========================
-- EMPLOI DU TEMPS
-- =========================

CREATE TABLE timetable_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7), -- 1=Lundi
    start_time TIME NOT NULL,
    end_time TIME NOT NULL CHECK (end_time > start_time),
    week week_type, -- NULL = toutes semaines, 'A' ou 'B'
    room TEXT,
    status timetable_status NOT NULL DEFAULT 'confirmed',
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_to DATE,
    notes TEXT
);

CREATE INDEX idx_timetable_course_day ON timetable_entries(course_id, day_of_week);
CREATE INDEX idx_timetable_status ON timetable_entries(status);

-- =========================
-- PÉRIODES (trimestres/semestres)
-- =========================

CREATE TABLE terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year SMALLINT NOT NULL,
    name TEXT NOT NULL, -- ex: "S1", "S2" / "T1", "T2", "T3"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_current BOOLEAN DEFAULT FALSE, -- Période active
    UNIQUE (academic_year, name),
    CHECK (end_date > start_date)
);

CREATE INDEX idx_terms_year ON terms(academic_year);
CREATE INDEX idx_terms_current ON terms(is_current) WHERE is_current = TRUE;

-- =========================
-- ÉVALUATIONS & NOTES
-- =========================

CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    term_id UUID REFERENCES terms(id) ON DELETE RESTRICT, -- Lié à une période maintenant
    title TEXT NOT NULL,
    type evaluation_type NOT NULL,
    coefficient NUMERIC(4,2) NOT NULL DEFAULT 1.0 CHECK (coefficient > 0),
    max_scale NUMERIC(5,2) DEFAULT 20.0, -- Barème (peut être /10, /40, etc.)
    eval_date DATE NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evaluations_course ON evaluations(course_id);
CREATE INDEX idx_evaluations_term ON evaluations(term_id);
CREATE INDEX idx_evaluations_date ON evaluations(eval_date);

CREATE TABLE grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
    value NUMERIC(5,2) CHECK (value >= 0), -- Peut être NULL (absent/non noté)
    absent BOOLEAN DEFAULT FALSE,
    normalized_value NUMERIC(5,2), -- Note ramenée sur 20 (calculée automatiquement)
    comment TEXT,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- 1 note par élève et par évaluation
CREATE UNIQUE INDEX uniq_grade_eval_student ON grades(evaluation_id, student_id);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grades_eval ON grades(evaluation_id);

-- Trigger pour calculer automatiquement la note normalisée
CREATE OR REPLACE FUNCTION calculate_normalized_grade()
RETURNS TRIGGER AS $$
DECLARE
    eval_scale NUMERIC(5,2);
BEGIN
    -- Récupérer le barème de l'évaluation
    SELECT max_scale INTO eval_scale
    FROM evaluations
    WHERE id = NEW.evaluation_id;
    
    -- Calculer la note normalisée si la note existe
    IF NEW.value IS NOT NULL AND eval_scale > 0 THEN
        NEW.normalized_value := (NEW.value / eval_scale) * 20;
    ELSE
        NEW.normalized_value := NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_normalize_grade
BEFORE INSERT OR UPDATE ON grades
FOR EACH ROW
EXECUTE FUNCTION calculate_normalized_grade();

-- Historique des modifications de notes (audit trail)
CREATE TABLE grades_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    grade_id UUID NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    role user_role NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changes JSONB NOT NULL -- {"old_value": 12, "new_value": 14, "reason": "correction"}
);

CREATE INDEX idx_grades_history_grade ON grades_history(grade_id);
CREATE INDEX idx_grades_history_date ON grades_history(changed_at);

-- =========================
-- DEVOIRS
-- =========================

CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ NOT NULL,
    status assignment_status NOT NULL DEFAULT 'draft',
    resource_url TEXT,
    max_points NUMERIC(5,2), -- Note maximale
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX idx_assignments_course_due ON assignments(course_id, due_at);
CREATE INDEX idx_assignments_status ON assignments(status);
CREATE INDEX idx_assignments_due_published ON assignments(due_at) WHERE status = 'published';

-- Si un devoir doit viser plusieurs classes (optionnel)
CREATE TABLE assignment_targets (
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    PRIMARY KEY (assignment_id, class_id)
);

-- =========================
-- PRÉSENCES / APPELS
-- =========================

CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    scheduled_start TIME NOT NULL,
    scheduled_end TIME NOT NULL,
    status timetable_status NOT NULL DEFAULT 'confirmed',
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (course_id, session_date, scheduled_start, scheduled_end)
);

CREATE INDEX idx_att_sessions_course_date ON attendance_sessions(course_id, session_date);
CREATE INDEX idx_attendance_date ON attendance_sessions(session_date);

CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES student_profiles(user_id) ON DELETE CASCADE,
    status attendance_status NOT NULL,
    justification TEXT,
    justified BOOLEAN DEFAULT FALSE,
    justified_by UUID REFERENCES users(id),
    justified_at TIMESTAMPTZ,
    justification_document TEXT, -- URL/path du certificat médical
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (session_id, student_id)
);

CREATE INDEX idx_att_records_student ON attendance_records(student_id);
CREATE INDEX idx_att_records_status ON attendance_records(status);
CREATE INDEX idx_att_records_unjustified ON attendance_records(status, justified) 
    WHERE status IN ('absent', 'late') AND justified = FALSE;

-- =========================
-- VUES UTILES
-- =========================

-- Vue des utilisateurs actifs (sans les supprimés)
CREATE VIEW active_users AS
SELECT * FROM users WHERE deleted_at IS NULL;

-- Vue des classes actives
CREATE VIEW active_classes AS
SELECT * FROM classes WHERE archived = FALSE;

-- Vue des cours actifs
CREATE VIEW active_courses AS
SELECT c.*, s.name as subject_name, s.code as subject_code,
       cl.label as class_label, u.full_name as teacher_name
FROM courses c
JOIN subjects s ON c.subject_id = s.id
JOIN classes cl ON c.class_id = cl.id
JOIN teacher_profiles tp ON c.teacher_id = tp.user_id
JOIN users u ON tp.user_id = u.id
WHERE c.active = TRUE;

-- =========================
-- DONNÉES DE TEST (optionnel)
-- =========================

-- Ces données correspondent aux utilisateurs hardcodés du frontend
-- Mot de passe hashé avec bcrypt (round 10) : "eleve123", "prof123", etc.
-- Hash pour "eleve123" : $2b$10$rN5z.example...
-- Hash pour "prof123" : $2b$10$aB3c.example...
-- Hash pour "admin123" : $2b$10$xY7z.example...

-- Note : Les vrais hash seront générés par le backend lors de la création
-- Ici on met des placeholders pour la structure

COMMENT ON TABLE users IS 'Table principale des utilisateurs avec authentification';
COMMENT ON TABLE user_sessions IS 'Gestion des sessions JWT actives pour révocation';
COMMENT ON TABLE student_responsables IS 'Relation N:N entre élèves et leurs responsables légaux';
COMMENT ON COLUMN grades.normalized_value IS 'Note automatiquement ramenée sur 20 pour calcul des moyennes';

-- =========================
-- FIN DU SCHEMA
-- =========================