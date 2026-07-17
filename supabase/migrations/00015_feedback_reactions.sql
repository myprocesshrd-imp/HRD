-- Migration 00015: Shared feedback reactions (Agree / Actioned)
-- Global flags so every HRD user sees the same state.
-- One row per answer per reaction type (toggle = upsert/delete).

create table if not exists feedback_reactions (
  answer_id      uuid not null references response_answers(id) on delete cascade,
  reaction_type  text not null check (reaction_type in ('agree', 'actioned')),
  created_by     text not null,
  created_at     timestamptz not null default now(),
  primary key (answer_id, reaction_type)
);

create index if not exists feedback_reactions_answer_idx
  on feedback_reactions (answer_id);

alter table feedback_reactions enable row level security;

-- supabaseAdmin (service role) bypasses RLS; this policy allows anon reads
-- in case the table is ever queried through the public client.
drop policy if exists "Anyone can read feedback reactions" on feedback_reactions;
create policy "Anyone can read feedback reactions"
  on feedback_reactions for select
  to anon, authenticated
  using (true);
