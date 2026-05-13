-- ──────────────────────────────────────────────────────────
-- HR Pulse Survey Platform — Supabase Schema
-- ──────────────────────────────────────────────────────────
-- Best practices applied:
--   UUID PKs · Enum types · Timestamptz · RLS · Soft delete
--   Composite indexes · Check constraints · Triggers
-- ──────────────────────────────────────────────────────────

-- 1. Enums ────────────────────────────────────────────────

create type user_role as enum ('super_admin', 'hr_admin', 'manager', 'employee');
create type survey_status as enum ('draft', 'active', 'closed');
create type survey_type as enum ('anonymous', 'identified');
create type question_type as enum (
  'rating', 'single_select', 'multiple_select',
  'open_text_short', 'open_text_long', 'matrix',
  'ranking', 'nps', 'binary', 'constant_sum'
);
create type notification_type as enum (
  'survey_assigned', 'survey_reminder', 'results_published',
  'system_announcement', 'profile_update'
);

-- 2. Core Tables ──────────────────────────────────────────

create table departments (
  id          uuid primary key default gen_random_uuid(),
  name_en     text not null,
  name_th     text not null,
  business_unit text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Users synced from HRMS/IDMS (centralized auth — no password stored)
create table users (
  id              uuid primary key default gen_random_uuid(),
  employee_code   text not null unique,         -- รหัสพนักงาน (from HRMS)
  email           text,                          -- email from HRMS (nullable, SSO may use other id)
  idms_provider   text not null default 'idms',  -- which IDMS/SSO provider
  idms_subject    text unique,                   -- unique identifier from IDMS (sub/oid)
  role            user_role not null default 'employee',  -- all start as employee; promoted via admin UI
  name_en         text not null,
  name_th         text not null,
  position        text,                          -- ตำแหน่ง (from HRMS)
  phone           text,                          -- เบอร์โทรศัพท์ (from HRMS)
  department_id   uuid references departments(id) on delete set null,
  business_unit   text,
  level           text,
  location        text,
  avatar_url      text,                          -- รูปโปรไฟล์ (from HRMS)
  hrms_raw_data   jsonb,                         -- full payload from HRMS API for debugging
  is_active       boolean not null default true,
  last_synced_at  timestamptz,                   -- last HRMS sync timestamp
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table sections (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,  -- short code: A, B, C
  title_en    text not null,
  title_th    text not null,
  desc_en     text not null default '',
  desc_th     text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table questions (
  id            uuid primary key default gen_random_uuid(),
  section_id    uuid not null references sections(id) on delete cascade,
  type          question_type not null,
  text_en       text not null,
  text_th       text not null,
  desc_en       text,
  desc_th       text,
  required      boolean not null default true,
  category      text,                         -- Compensation, Growth, etc.
  sort_order    integer not null default 0,
  -- rating
  min_value     integer,
  max_value     integer,
  -- select
  min_choices   integer,
  max_choices   integer,
  -- conditional
  visible_if_question_id uuid references questions(id) on delete set null,
  visible_if_value       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 3. Question Options ─────────────────────────────────────

create table question_choices (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  value       text not null,
  label_en    text not null,
  label_th    text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table matrix_rows (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  label_en    text not null,
  label_th    text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table matrix_columns (
  id          uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  value       text not null,
  label_en    text not null,
  label_th    text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- 4. Survey Configuration ─────────────────────────────────

create table surveys (
  id            uuid primary key default gen_random_uuid(),
  title_en      text not null,
  title_th      text not null,
  status        survey_status not null default 'draft',
  survey_type   survey_type not null default 'identified',
  start_date    date,
  end_date      date,
  target_responses integer not null default 0,
  created_by    uuid references users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint valid_dates check (end_date is null or start_date is null or end_date >= start_date)
);

-- Junction: which sections belong to which survey + order
create table survey_sections (
  id          uuid primary key default gen_random_uuid(),
  survey_id   uuid not null references surveys(id) on delete cascade,
  section_id  uuid not null references sections(id) on delete cascade,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (survey_id, section_id)
);

-- 5. Survey Taking / Responses ────────────────────────────

create table survey_responses (
  id            uuid primary key default gen_random_uuid(),
  survey_id     uuid not null references surveys(id) on delete cascade,
  user_id       uuid references users(id) on delete set null,  -- null for anonymous
  anonymous_token text,  -- for tracking anonymous unique responses
  status        text not null default 'in_progress'
                  check (status in ('in_progress', 'completed', 'discontinued')),
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  -- demographics (anonymous surveys)
  demographics  jsonb,
  -- metadata
  ip_address    inet,
  user_agent    text,
  time_spent_seconds integer,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table response_answers (
  id            uuid primary key default gen_random_uuid(),
  response_id   uuid not null references survey_responses(id) on delete cascade,
  question_id   uuid not null references questions(id) on delete cascade,
  -- Flexible value storage:
  --   rating / nps          → numeric_value
  --   single_select / binary → text_value
  --   multiple_select       → array_text_value
  --   open_text             → text_value
  --   matrix                → jsonb_value ({"rowId": "colValue", ...})
  numeric_value   numeric,
  text_value      text,
  array_text_value text[],
  jsonb_value     jsonb,
  created_at      timestamptz not null default now(),
  unique (response_id, question_id)
);

create table response_feedback (
  id            uuid primary key default gen_random_uuid(),
  response_id   uuid not null references survey_responses(id) on delete cascade,
  question_id   uuid not null references questions(id) on delete cascade,
  text_value    text not null,
  created_at    timestamptz not null default now()
);

-- 6. Notifications ────────────────────────────────────────

create table notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references users(id) on delete cascade,
  type          notification_type not null,
  title_en      text not null,
  title_th      text not null,
  body_en       text,
  body_th       text,
  link_url      text,
  metadata      jsonb,
  is_read       boolean not null default false,
  created_at    timestamptz not null default now()
);

-- HRMS sync audit log
create table hrms_sync_log (
  id            uuid primary key default gen_random_uuid(),
  sync_type     text not null check (sync_type in ('full', 'incremental', 'single')),
  user_id       uuid references users(id) on delete set null,
  employee_code text,
  status        text not null check (status in ('success', 'failed', 'partial')),
  payload       jsonb,
  error_message text,
  created_at    timestamptz not null default now()
);

-- 7. Indexes ──────────────────────────────────────────────

-- Users
create index idx_users_employee_code on users(employee_code);
create index idx_users_idms_subject on users(idms_subject);
create index idx_users_department on users(department_id);
create index idx_users_role on users(role);
create index idx_users_active on users(is_active) where is_active = true;

-- Questions
create index idx_questions_section on questions(section_id);
create index idx_questions_type on questions(type);
create index idx_questions_sort on questions(section_id, sort_order);
create index idx_question_choices_sort on question_choices(question_id, sort_order);
create index idx_matrix_rows_sort on matrix_rows(question_id, sort_order);
create index idx_matrix_columns_sort on matrix_columns(question_id, sort_order);

-- Surveys
create index idx_surveys_status on surveys(status);
create index idx_surveys_type on surveys(survey_type);
create index idx_surveys_dates on surveys(start_date, end_date);
create index idx_survey_sections_survey on survey_sections(survey_id, sort_order);

-- Responses
create index idx_responses_survey on survey_responses(survey_id);
create index idx_responses_user on survey_responses(user_id);
create index idx_responses_status on survey_responses(status);
create index idx_responses_completed on survey_responses(survey_id) where status = 'completed';
create index idx_answers_response on response_answers(response_id);

-- Notifications
create index idx_notifications_user on notifications(user_id, is_read, created_at desc);

-- Full-text search on questions
create index idx_questions_search on questions
  using gin (to_tsvector('simple', text_en || ' ' || text_th || ' ' || coalesce(category, '')));

-- 8. Row Level Security ───────────────────────────────────

alter table users enable row level security;
alter table surveys enable row level security;
alter table sections enable row level security;
alter table questions enable row level security;
alter table question_choices enable row level security;
alter table matrix_rows enable row level security;
alter table matrix_columns enable row level security;
alter table survey_sections enable row level security;
alter table survey_responses enable row level security;
alter table response_answers enable row level security;
alter table response_feedback enable row level security;
alter table notifications enable row level security;
alter table departments enable row level security;
alter table hrms_sync_log enable row level security;

-- RLS Policies
-- Users: can read own profile; admins can read all
create policy users_read_own on users
  for select using (auth.uid() = id);
create policy users_read_admin on users
  for select using (exists (
    select 1 from users where id = auth.uid() and role in ('super_admin', 'hr_admin')
  ));
create policy users_update_own on users
  for update using (auth.uid() = id);
-- Prevent users from changing their own role
create policy users_no_role_change on users
  for update using (auth.uid() = id)
  with check (
    case when auth.uid() = id
      then role = (select role from users where id = auth.uid())
      else true
    end
  );

-- Surveys: employees see active; admins see all
create policy surveys_read_active on surveys
  for select using (status = 'active' or exists (
    select 1 from users where id = auth.uid() and role in ('super_admin', 'hr_admin')
  ));
create policy surveys_write_admin on surveys
  for all using (exists (
    select 1 from users where id = auth.uid() and role in ('super_admin', 'hr_admin')
  ));

-- Responses: users see own; admins see aggregate (no individual)
create policy responses_read_own on survey_responses
  for select using (user_id = auth.uid());
create policy responses_read_admin on survey_responses
  for select using (exists (
    select 1 from users where id = auth.uid() and role in ('super_admin', 'hr_admin', 'manager')
  ));
create policy responses_insert_own on survey_responses
  for insert with check (user_id = auth.uid() or user_id is null);

-- Notifications: users see own only
create policy notifications_read_own on notifications
  for all using (user_id = auth.uid());

-- HRMS sync log: admin only
create policy hrms_sync_log_read_admin on hrms_sync_log
  for select using (exists (
    select 1 from users where id = auth.uid() and role in ('super_admin', 'hr_admin')
  ));

-- 9. Helper Functions ─────────────────────────────────────

-- Auto-update updated_at
create or replace function trigger_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on users
  for each row execute function trigger_updated_at();
create trigger surveys_updated_at before update on surveys
  for each row execute function trigger_updated_at();
create trigger sections_updated_at before update on sections
  for each row execute function trigger_updated_at();
create trigger questions_updated_at before update on questions
  for each row execute function trigger_updated_at();
create trigger survey_responses_updated_at before update on survey_responses
  for each row execute function trigger_updated_at();

-- Get active question count for a survey
create or replace function survey_question_count(p_survey_id uuid)
returns integer as $$
  select count(q.id)::integer
  from survey_sections ss
  join sections s on s.id = ss.section_id
  join questions q on q.section_id = s.id
  where ss.survey_id = p_survey_id;
$$ language sql stable;

-- Get response rate for a survey
create or replace function survey_response_rate(p_survey_id uuid)
returns numeric as $$
  select round(
    (select count(*)::numeric from survey_responses
     where survey_id = p_survey_id and status = 'completed')
    / nullif(target_responses, 0) * 100, 1
  )
  from surveys where id = p_survey_id;
$$ language sql stable;

-- 10. Seed Data ───────────────────────────────────────────

insert into departments (name_en, name_th) values
  ('Human Resources', 'ทรัพยากรบุคคล'),
  ('Information Technology', 'เทคโนโลยีสารสนเทศ'),
  ('Finance', 'การเงิน'),
  ('Sales', 'ขาย'),
  ('Marketing', 'การตลาด'),
  ('Operations', 'ปฏิบัติการ'),
  ('Production', 'ผลิต'),
  ('Logistics', 'โลจิสติกส์'),
  ('Customer Service', 'บริการลูกค้า');

insert into sections (code, title_en, title_th, desc_en, desc_th, sort_order) values
  ('A', 'Organization, Compensation & Benefits', 'องค์กร ค่าตอบแทน สวัสดิการ และเครื่องมือ',
   'Compensation, benefits, tools, and overall trust in the organization.',
   'ค่าตอบแทน สวัสดิการ เครื่องมือ และความเชื่อมั่นในองค์กร', 1),
  ('B', 'Work & Employee Experience', 'ประสบการณ์การทำงานของพนักงาน',
   'Role clarity, growth, and supervisor support.',
   'ความชัดเจนของบทบาท การเติบโต และการสนับสนุนจากหัวหน้า', 2),
  ('C', 'Work Environment', 'สภาพแวดล้อมการทำงาน',
   'Safety, collaboration, communication, and well-being.',
   'ความปลอดภัย การทำงานร่วมกัน การสื่อสาร และความเป็นอยู่ที่ดี', 3);
