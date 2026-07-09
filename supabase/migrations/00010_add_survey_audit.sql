-- Migration 00010: Survey audit fields and edit history log

ALTER TABLE surveys
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS survey_audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   uuid REFERENCES surveys(id) ON DELETE SET NULL,
  actor_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  action      text NOT NULL CHECK (action IN ('create', 'update', 'delete', 'clone')),
  changes     jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_audit_log_survey_id ON survey_audit_log(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_audit_log_created_at ON survey_audit_log(created_at DESC);

ALTER TABLE survey_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY survey_audit_log_read_admin ON survey_audit_log
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin')
  ));