-- ============================================================================
-- 005: USER SETTINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  friend_requests_enabled BOOLEAN DEFAULT TRUE,
  game_invites_enabled BOOLEAN DEFAULT TRUE,
  voice_enabled BOOLEAN DEFAULT TRUE,
  chat_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own settings"
  ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users update own settings"
  ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);
