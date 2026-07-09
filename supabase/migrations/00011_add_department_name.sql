-- Migration: Add department_name text column to users table
-- This stores the department name directly from IDMS/HRMS sync
-- to avoid dependency on the departments join which requires department_id to be set

alter table users add column if not exists department_name text;

-- Backfill from hrms_raw_data if available
update users
set department_name = hrms_raw_data->>'Department'
where department_name is null
  and hrms_raw_data is not null
  and hrms_raw_data->>'Department' is not null;
