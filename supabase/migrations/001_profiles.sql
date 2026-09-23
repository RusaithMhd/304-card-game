-- ============================================================================
-- 001: PROFILES TABLE & AUTHENTICATION TRIGGER
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(20) UNIQUE NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  avatar_url TEXT DEFAULT 'https://api.dicebear.com/7.x/bottts/svg?seed=default',
  bio TEXT DEFAULT '',
  country VARCHAR(3) DEFAULT 'LKA',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT username_len_check CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format_check CHECK (username ~* '^[a-zA-Z0-9_]+$')
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- TRIGGER ON AUTH USER CREATION
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || SUBSTRING(NEW.id::text FROM 1 FOR 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'Player ' || SUBSTRING(NEW.id::text FROM 1 FOR 4)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/bottts/svg?seed=' || NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
