CREATE TABLE IF NOT EXISTS student_class_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_class_id UUID NULL REFERENCES classes(id),
  new_class_id UUID NOT NULL REFERENCES classes(id),
  effective_term_id UUID NOT NULL REFERENCES terms(id),
  establishment_id UUID NOT NULL REFERENCES establishments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id),
  applied_at TIMESTAMPTZ NULL,
  applied_by UUID NULL REFERENCES users(id),
  reason TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_student_class_changes_term
  ON student_class_changes (effective_term_id);

CREATE INDEX IF NOT EXISTS idx_student_class_changes_establishment
  ON student_class_changes (establishment_id, applied_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_class_changes_pending_unique
  ON student_class_changes (student_id, effective_term_id)
  WHERE applied_at IS NULL;
