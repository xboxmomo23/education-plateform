-- Ajout du domaine d'email de connexion configurable par établissement

ALTER TABLE establishments
  ADD COLUMN IF NOT EXISTS login_email_domain TEXT;
