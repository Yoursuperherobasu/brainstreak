-- ─────────────────────────────────────────────────────────────────────────────
-- BrainStreak — Supabase Setup SQL
-- Run this once in your Supabase project: Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username    TEXT NOT NULL DEFAULT 'BrainPlayer',
  avatar_url  TEXT,
  total_xp    INTEGER NOT NULL DEFAULT 0,
  level       INTEGER NOT NULL DEFAULT 1,
  current_streak  INTEGER NOT NULL DEFAULT 0,
  longest_streak  INTEGER NOT NULL DEFAULT 0,
  games_played    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Scores table (one row per game session)
CREATE TABLE IF NOT EXISTS public.scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  username          TEXT NOT NULL,
  score             INTEGER NOT NULL DEFAULT 0,
  xp_earned         INTEGER NOT NULL DEFAULT 0,
  category          TEXT NOT NULL DEFAULT 'Mixed',
  questions_correct INTEGER NOT NULL DEFAULT 0,
  questions_total   INTEGER NOT NULL DEFAULT 5,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_scores_score       ON public.scores(score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_created_at  ON public.scores(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scores_user_id     ON public.scores(user_id);

-- 4. Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scores   ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read (public leaderboard)
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public read scores"   ON public.scores   FOR SELECT USING (true);

-- Allow inserts from authenticated users only (or anon for now)
CREATE POLICY "Insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Insert own score" ON public.scores
  FOR INSERT WITH CHECK (true);

-- 5. Function: get leaderboard with rank
CREATE OR REPLACE FUNCTION get_daily_leaderboard()
RETURNS TABLE(rank BIGINT, username TEXT, score INTEGER, category TEXT)
LANGUAGE SQL AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY score DESC) as rank,
    username,
    score,
    category
  FROM public.scores
  WHERE created_at >= CURRENT_DATE
  ORDER BY score DESC
  LIMIT 20;
$$;
