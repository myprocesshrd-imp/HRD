-- Create demographic_options table
CREATE TABLE IF NOT EXISTS demographic_options (
  id          uuid primary key default gen_random_uuid(),
  field_key   text not null, -- 'location', 'level', 'gender', 'ageRange', 'tenure'
  value       text not null,
  label_en    text not null,
  label_th    text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Enable RLS
ALTER TABLE demographic_options ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY demographic_options_read_all ON demographic_options
  FOR SELECT USING (true);

CREATE POLICY demographic_options_write_admin ON demographic_options
  FOR ALL USING (exists (
    select 1 from users where id = auth.uid() and role in ('super_admin', 'hr_admin')
  ));

-- Trigger for updated_at
CREATE TRIGGER demographic_options_updated_at BEFORE UPDATE ON demographic_options
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Seed initial data
INSERT INTO demographic_options (field_key, value, label_en, label_th, sort_order) VALUES
  ('location', 'Head Office', 'Head Office', 'สำนักงานใหญ่', 1),
  ('location', 'Factory', 'Factory', 'โรงงาน', 2),
  ('location', 'Warehouse', 'Warehouse', 'คลังสินค้า', 3),
  ('location', 'Branch Office', 'Branch Office', 'สาขา', 4),
  ('location', 'Remote Work', 'Remote Work', 'ทำงานทางไกล (Remote)', 5),

  ('level', 'Operational Level', 'Operational Level', 'ระดับปฏิบัติการ', 1),
  ('level', 'Supervisor', 'Supervisor', 'หัวหน้างาน', 2),
  ('level', 'Assistant Manager', 'Assistant Manager', 'ผู้ช่วยผู้จัดการ', 3),
  ('level', 'Manager', 'Manager', 'ผู้จัดการ', 4),
  ('level', 'Senior Manager', 'Senior Manager', 'ผู้จัดการอาวุโส', 5),
  ('level', 'Executive', 'Executive', 'ผู้บริหาร', 6),

  ('gender', 'Male', 'Male', 'ชาย', 1),
  ('gender', 'Female', 'Female', 'หญิง', 2),
  ('gender', 'LGBTQ+', 'LGBTQ+', 'LGBTQ+', 3),
  ('gender', 'Prefer not to say', 'Prefer not to say', 'ไม่ต้องการระบุ', 4),

  ('ageRange', 'Under 20', 'Under 20', 'ต่ำกว่า 20 ปี', 1),
  ('ageRange', '21-25', '21-25', '21-25 ปี', 2),
  ('ageRange', '26-30', '26-30', '26-30 ปี', 3),
  ('ageRange', '31-35', '31-35', '31-35 ปี', 4),
  ('ageRange', '36-40', '36-40', '36-40 ปี', 5),
  ('ageRange', '41-50', '41-50', '41-50 ปี', 6),
  ('ageRange', 'Over 50', 'Over 50', 'มากกว่า 50 ปี', 7),

  ('tenure', 'Less than 1 year', 'Less than 1 year', 'น้อยกว่า 1 ปี', 1),
  ('tenure', '1-3 years', '1-3 years', '1-3 ปี', 2),
  ('tenure', '4-6 years', '4-6 years', '4-6 ปี', 3),
  ('tenure', '7-10 years', '7-10 years', '7-10 ปี', 4),
  ('tenure', 'More than 10 years', 'More than 10 years', 'มากกว่า 10 ปี', 5)
ON CONFLICT DO NOTHING;
