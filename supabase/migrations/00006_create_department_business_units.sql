-- Create department_business_units junction table
CREATE TABLE IF NOT EXISTS department_business_units (
  department_id uuid references departments(id) on delete cascade,
  business_unit_id uuid references business_units(id) on delete cascade,
  primary key (department_id, business_unit_id)
);

-- Enable RLS
ALTER TABLE department_business_units ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY department_business_units_read_all ON department_business_units
  FOR SELECT USING (true);

CREATE POLICY department_business_units_write_admin ON department_business_units
  FOR ALL USING (exists (
    select 1 from users where id = auth.uid() and role in ('super_admin', 'hr_admin')
  ));

-- Populate with existing N:1 relationships
INSERT INTO department_business_units (department_id, business_unit_id)
SELECT id, business_unit_id FROM departments WHERE business_unit_id IS NOT NULL
ON CONFLICT DO NOTHING;
