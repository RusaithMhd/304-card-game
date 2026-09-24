-- ============================================================================
-- 013: TARGET REACHED & FINISH GAME FIELDS FOR GAMES TABLE
-- ============================================================================

ALTER TABLE IF EXISTS public.games
  ADD COLUMN IF NOT EXISTS target_score INT DEFAULT 22,
  ADD COLUMN IF NOT EXISTS target_reached BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finished_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
