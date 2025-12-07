-- Ajout des colonnes contact_email sur les profils élèves / professeurs / staff
-- et création de la table staff_profiles si elle n'existe pas encore

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'staff_profiles'
      AND table_schema = 'public'
  ) THEN
    CREATE TABLE staff_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      phone TEXT,
      department TEXT,
      office_room TEXT,
      employee_no TEXT,
      hire_date DATE,
      contact_email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

ALTER TABLE student_profiles
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

ALTER TABLE teacher_profiles
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS contact_email TEXT;
