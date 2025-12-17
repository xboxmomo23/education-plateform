ALTER TABLE establishment_settings
ADD COLUMN IF NOT EXISTS default_locale TEXT NOT NULL DEFAULT 'fr';

ALTER TABLE establishment_settings
ALTER COLUMN default_locale SET DEFAULT 'fr';

ALTER TABLE establishment_settings
ADD CONSTRAINT IF NOT EXISTS establishment_settings_default_locale_check
CHECK (default_locale IN ('fr','en'));
