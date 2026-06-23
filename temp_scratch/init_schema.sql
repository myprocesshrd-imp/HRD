-- 1. Create tables
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_th text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_code text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL,
  name_en text,
  name_th text,
  department_id uuid REFERENCES departments(id),
  title text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_th text NOT NULL,
  status text NOT NULL DEFAULT 'Draft',
  survey_type text NOT NULL DEFAULT 'identified',
  start_date date,
  end_date date,
  target integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title_en text NOT NULL,
  title_th text NOT NULL,
  desc_en text,
  desc_th text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_sections (
  survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE,
  section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
  order_index integer DEFAULT 0,
  PRIMARY KEY (survey_id, section_id)
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid REFERENCES sections(id) ON DELETE CASCADE,
  type text NOT NULL,
  question_en text NOT NULL,
  question_th text NOT NULL,
  desc_en text,
  desc_th text,
  required boolean DEFAULT true,
  options jsonb,
  validation jsonb,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS survey_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id),
  status text NOT NULL DEFAULT 'completed',
  submitted_at timestamptz DEFAULT now(),
  demographics jsonb
);

CREATE TABLE IF NOT EXISTS response_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES survey_responses(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  answer_value jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2. Configure RLS (Permissive for mock auth via anon)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE response_answers ENABLE ROW LEVEL SECURITY;

-- Allow all operations for anon (since the app uses client-side mock auth)
CREATE POLICY "Allow all anon departments" ON departments FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon surveys" ON surveys FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon sections" ON sections FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon survey_sections" ON survey_sections FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon questions" ON questions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon survey_responses" ON survey_responses FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all anon response_answers" ON response_answers FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. Seed basic departments and users
INSERT INTO departments (code, name_en, name_th) VALUES 
('HR', 'Human Resources', 'ทรัพยากรบุคคล'),
('IT', 'Information Technology', 'เทคโนโลยีสารสนเทศ')
ON CONFLICT (code) DO NOTHING;

INSERT INTO users (employee_code, password_hash, role, name_en, name_th) VALUES
('admin', 'admin123', 'super_admin', 'Admin User', 'ผู้ดูแลระบบ'),
('hr', 'hr123', 'hr_admin', 'HR Manager', 'ผู้จัดการฝ่ายบุคคล')
ON CONFLICT (employee_code) DO NOTHING;
