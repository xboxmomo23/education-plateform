-- Table de configuration établissement

CREATE TABLE IF NOT EXISTS establishment_settings (
  establishment_id UUID PRIMARY KEY REFERENCES establishments(id) ON DELETE CASCADE,
  school_year TEXT,
  contact_email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
