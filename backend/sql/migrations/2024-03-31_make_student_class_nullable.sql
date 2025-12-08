-- Rendre la classe optionnelle pour les élèves

ALTER TABLE students
  ALTER COLUMN class_id DROP NOT NULL;
