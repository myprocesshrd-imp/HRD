-- ──────────────────────────────────────────────────────────
-- Migration 00013: Create bulletin_posts table
-- HR Pulse Survey Platform — Announcement / Bulletin Board
-- ──────────────────────────────────────────────────────────

-- 1. Enum for bulletin category (idempotent creation)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'bulletin_category') then
    create type bulletin_category as enum (
      'general', 'hr', 'it', 'event', 'policy', 'safety'
    );
  end if;
end
$$;

-- 2. Table
create table if not exists bulletin_posts (
  id          uuid primary key default gen_random_uuid(),
  title_th    text not null,
  title_en    text not null,
  content_th  text not null,
  content_en  text not null,
  category    bulletin_category not null default 'general',
  image_url   text,
  is_pinned   boolean not null default false,
  posted_by   text not null,                   -- display name of author
  links       jsonb not null default '[]'::jsonb, -- array of {labelTh, labelEn, url}
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 3. Index for ordering
create index if not exists bulletin_posts_pinned_date_idx
  on bulletin_posts (is_pinned desc, created_at desc);

-- 4. Helper function for auto-updating updated_at (create if not exists)
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 5. Auto-update updated_at trigger (idempotent trigger creation)
drop trigger if exists bulletin_posts_updated_at on bulletin_posts;
create trigger bulletin_posts_updated_at
  before update on bulletin_posts
  for each row execute function update_updated_at_column();

-- 6. Enable RLS
alter table bulletin_posts enable row level security;

-- 7. RLS Policies (idempotent policy creation)

-- All authenticated users can read
drop policy if exists "Authenticated users can read bulletin posts" on bulletin_posts;
create policy "Authenticated users can read bulletin posts"
  on bulletin_posts for select
  to authenticated
  using (true);

-- HR admin / super admin can insert
drop policy if exists "HR admins can create bulletin posts" on bulletin_posts;
create policy "HR admins can create bulletin posts"
  on bulletin_posts for insert
  to authenticated
  with check (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role in ('hr_admin', 'super_admin')
    )
  );

-- HR admin / super admin can update
drop policy if exists "HR admins can update bulletin posts" on bulletin_posts;
create policy "HR admins can update bulletin posts"
  on bulletin_posts for update
  to authenticated
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role in ('hr_admin', 'super_admin')
    )
  );

-- HR admin / super admin can delete
drop policy if exists "HR admins can delete bulletin posts" on bulletin_posts;
create policy "HR admins can delete bulletin posts"
  on bulletin_posts for delete
  to authenticated
  using (
    exists (
      select 1 from users
      where users.id = auth.uid()
        and users.role in ('hr_admin', 'super_admin')
    )
  );
