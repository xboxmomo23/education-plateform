-- Création de la table id_counters pour générer des codes internes auto
-- par établissement / rôle / année académique

CREATE TABLE IF NOT EXISTS id_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'staff')),
  academic_year INT NOT NULL,
  current_value INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (establishment_id, role, academic_year)
);
