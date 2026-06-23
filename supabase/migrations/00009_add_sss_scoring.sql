-- Migration 00009: Say–Stay–Strive Scoring System
-- Additive-only: zero changes to existing tables.
-- All SSS metadata lives in separate tables; Frontend / employee queries are unaffected.

-- ── 1. Mapping table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sss_question_mappings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   TEXT NOT NULL,             -- references questions(id) by text PK
  sss_dimension TEXT NOT NULL CHECK (sss_dimension IN ('say', 'stay', 'strive')),
  weight        NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (question_id, sss_dimension)
);

-- ── 2. Computed score cache ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sss_response_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id   UUID NOT NULL REFERENCES public.survey_responses(id) ON DELETE CASCADE,
  survey_id     TEXT NOT NULL,
  say_score     NUMERIC(5,2),
  stay_score    NUMERIC(5,2),
  strive_score  NUMERIC(5,2),
  overall_score NUMERIC(5,2),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (response_id)
);

-- ── 3. Row Level Security — block anon/authenticated completely ───────────────
ALTER TABLE public.sss_question_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sss_response_scores   ENABLE ROW LEVEL SECURITY;
-- No policies created for anon or authenticated roles.
-- Only service_role (used by admin-service Edge Function) bypasses RLS.

-- ── 4. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sss_mappings_dim      ON public.sss_question_mappings (sss_dimension, is_active);
CREATE INDEX IF NOT EXISTS idx_sss_mappings_question ON public.sss_question_mappings (question_id);
CREATE INDEX IF NOT EXISTS idx_sss_scores_survey     ON public.sss_response_scores (survey_id);

-- ── 5. Auto-bump updated_at trigger ──────────────────────────────────────────
DROP TRIGGER IF EXISTS sss_mappings_updated_at ON public.sss_question_mappings;
CREATE TRIGGER sss_mappings_updated_at
  BEFORE UPDATE ON public.sss_question_mappings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();  -- reuse function from migration 00008

-- ── 6. Default seed mappings ──────────────────────────────────────────────────
-- Based on existing Question Bank. Admin can modify at any time via /admin/sss-config.
-- single_select scoring: a=4, b=3, c=2, d=1 (same as system default, stored as numeric).
-- max_value for all dimensions = 4 (single_select) or 5 (rating/NPS), handled by the calculator.
INSERT INTO public.sss_question_mappings (question_id, sss_dimension, weight)
VALUES
  -- SAY: measures employee advocacy / willingness to recommend
  ('D2', 'say',    2.0),   -- "If someone asks how is it working here..."
  ('A7', 'say',    1.0),   -- NPS: "How likely to recommend as workplace?"

  -- STAY: measures retention intent / loyalty
  ('D3', 'stay',   2.0),   -- "If another opportunity came today..."
  ('H2', 'stay',   1.0),   -- "If bonus cannot be paid this year..."

  -- STRIVE: measures discretionary effort / engagement
  ('G1', 'strive', 1.5),   -- "When new training programs are available..."
  ('J2', 'strive', 1.5)    -- "When there are special tasks or new opportunities..."
ON CONFLICT (question_id, sss_dimension) DO NOTHING;
