-- Ajout d'un contact_email sur les profils parents pour envoyer les invitations

ALTER TABLE parent_profiles
ADD COLUMN IF NOT EXISTS contact_email TEXT;
