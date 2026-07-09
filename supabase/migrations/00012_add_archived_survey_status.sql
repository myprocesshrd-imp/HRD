-- Migration: Add 'archived' value to survey_status enum
-- Archived = admin-initiated archival (distinct from 'closed' = expired by schedule)
-- PostgreSQL allows adding enum values without recreating the type.

ALTER TYPE survey_status ADD VALUE IF NOT EXISTS 'archived';

-- Update the RLS policy comment to reflect the new status
COMMENT ON TYPE survey_status IS 'draft | active | closed (schedule-expired) | archived (admin-archived)';
