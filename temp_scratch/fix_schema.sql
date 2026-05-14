-- Fix schema discrepancies
ALTER TABLE surveys RENAME COLUMN target TO target_responses;

ALTER TABLE survey_sections RENAME COLUMN order_index TO sort_order;

ALTER TABLE questions RENAME COLUMN order_index TO sort_order;
ALTER TABLE questions RENAME COLUMN question_en TO text_en;
ALTER TABLE questions RENAME COLUMN question_th TO text_th;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS min_value integer;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS max_value integer;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS min_choices integer;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS max_choices integer;

ALTER TABLE sections ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS question_choices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  value text NOT NULL,
  label_en text NOT NULL,
  label_th text NOT NULL,
  sort_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS matrix_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  label_en text NOT NULL,
  label_th text NOT NULL,
  sort_order integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS matrix_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  value text NOT NULL,
  label_en text NOT NULL,
  label_th text NOT NULL,
  sort_order integer DEFAULT 0
);

ALTER TABLE question_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrix_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE matrix_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all anon question_choices" ON question_choices FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon matrix_rows" ON matrix_rows FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon matrix_columns" ON matrix_columns FOR ALL TO anon USING (true) WITH CHECK (true);

-- Also fix PostgREST config
NOTIFY pgrst, 'reload schema';
