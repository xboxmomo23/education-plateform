ALTER TABLE teacher_profiles
  ADD COLUMN IF NOT EXISTS assigned_class_ids UUID[];

ALTER TABLE staff_profiles
  ADD COLUMN IF NOT EXISTS assigned_class_ids UUID[];
