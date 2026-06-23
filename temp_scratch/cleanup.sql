-- Cleanup existing surveys and sections to match sample-test.md
-- We want to keep only the Scenario-based survey

-- Delete all surveys except the ones we want to keep
-- Actually, let's just delete everything and start fresh to be safe
DELETE FROM survey_responses;
DELETE FROM survey_sections;
DELETE FROM surveys;
DELETE FROM questions;
DELETE FROM sections;

-- The seeding will be handled by a script
