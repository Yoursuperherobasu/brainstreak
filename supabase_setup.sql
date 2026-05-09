-- ─────────────────────────────────────────────────────────────────────────────
-- BrainStreak v1 — Supabase Setup SQL
-- Run this once in your Supabase project: Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Profiles table — one row per signed-in user
CREATE TABLE IF NOT EXISTS public.profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT NOT NULL DEFAULT 'BrainPlayer',
  total_xp        INTEGER NOT NULL DEFAULT 0,
  level           INTEGER NOT NULL DEFAULT 1,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  games_played    INTEGER NOT NULL DEFAULT 0,
  last_play_date  DATE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotent migration for existing v1 deployments without last_play_date
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_play_date DATE;

-- 2. Trigger to auto-create a profile row on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'BrainPlayer'));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Row Level Security — users can only see and modify their own row
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read own profile" ON public.profiles;
CREATE POLICY "Read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
CREATE POLICY "Insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Update own profile" ON public.profiles;
CREATE POLICY "Update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────────────
-- v2 reference (DO NOT RUN until v2):
-- ─────────────────────────────────────────────────────────────────────────────
-- CREATE TABLE IF NOT EXISTS public.scores (
--   id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
--   score             INTEGER NOT NULL DEFAULT 0,
--   xp_earned         INTEGER NOT NULL DEFAULT 0,
--   category          TEXT NOT NULL DEFAULT 'Mixed',
--   questions_correct INTEGER NOT NULL DEFAULT 0,
--   questions_total   INTEGER NOT NULL DEFAULT 5,
--   created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
-- );
-- CREATE INDEX IF NOT EXISTS idx_scores_score      ON public.scores(score DESC);
-- CREATE INDEX IF NOT EXISTS idx_scores_created_at ON public.scores(created_at DESC);
-- CREATE INDEX IF NOT EXISTS idx_scores_user_id    ON public.scores(user_id);
--
-- CREATE OR REPLACE FUNCTION get_daily_leaderboard()
-- RETURNS TABLE(rank BIGINT, username TEXT, score INTEGER, category TEXT)
-- LANGUAGE SQL AS $$
--   SELECT ROW_NUMBER() OVER (ORDER BY s.score DESC) AS rank,
--          p.username, s.score, s.category
--   FROM public.scores s
--   JOIN public.profiles p ON p.id = s.user_id
--   WHERE s.created_at >= CURRENT_DATE
--   ORDER BY s.score DESC
--   LIMIT 20;
-- $$;
