-- ============================================
-- Migration : Ajout de la colonne purpose aux tokens de mot de passe
-- ============================================

ALTER TABLE password_reset_tokens
ADD COLUMN IF NOT EXISTS purpose TEXT;

UPDATE password_reset_tokens
SET purpose = 'reset'
WHERE purpose IS NULL;

ALTER TABLE password_reset_tokens
ALTER COLUMN purpose SET DEFAULT 'reset';
