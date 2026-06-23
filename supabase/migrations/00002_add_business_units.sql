-- Create business_units table
create table business_units (
  id          uuid primary key default gen_random_uuid(),
  name        text, -- legacy
  name_en     text not null,
  name_th     text not null,
  code        text unique,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Add business_unit_id to departments
alter table departments add column business_unit_id uuid references business_units(id) on delete set null;

-- Add business_unit_id to users
alter table users add column business_unit_id uuid references business_units(id) on delete set null;

-- Enable RLS
alter table business_units enable row level security;

-- RLS Policies for business_units
create policy business_units_read_all on business_units
  for select using (true);

create policy business_units_write_admin on business_units
  for all using (exists (
    select 1 from users where id = auth.uid() and role in ('super_admin', 'hr_admin')
  ));

-- Trigger for updated_at
create trigger business_units_updated_at before update on business_units
  for each row execute function trigger_updated_at();
