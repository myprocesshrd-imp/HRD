-- Migration: Add demographic_fields to surveys
-- Adds configuration for which demographic fields and options to show in anonymous surveys

ALTER TABLE surveys 
  ADD COLUMN IF NOT EXISTS demographic_fields jsonb DEFAULT NULL;

COMMENT ON COLUMN surveys.demographic_fields IS 
  'Per-field demographic config for anonymous surveys. Keys = field names, values = selected dropdown options. NULL = show all fields with all options.';
