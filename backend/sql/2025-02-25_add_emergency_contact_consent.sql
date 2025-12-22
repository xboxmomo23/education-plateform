-- Ajoute la colonne manquante pour les profils parents
ALTER TABLE parent_profiles
ADD COLUMN IF NOT EXISTS emergency_contact_consent boolean DEFAULT false;
