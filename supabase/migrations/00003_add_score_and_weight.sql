-- Add weight to questions for prioritization
ALTER TABLE questions ADD COLUMN IF NOT EXISTS weight FLOAT DEFAULT 1.0;

-- Add explicit score to choices for flexible calculation
ALTER TABLE question_choices ADD COLUMN IF NOT EXISTS score NUMERIC DEFAULT 0.0;

-- Backfill score from value for existing numerical choices
UPDATE question_choices 
SET score = value::NUMERIC 
WHERE value ~ '^[0-9.]+$';

-- Add comment for clarity
COMMENT ON COLUMN questions.weight IS 'Weighting factor for the question in total score calculations';
COMMENT ON COLUMN question_choices.score IS 'Numeric score associated with this choice for analytics';
