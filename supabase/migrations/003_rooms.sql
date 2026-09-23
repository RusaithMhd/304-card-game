-- ============================================================================
-- 003: ROOM MANAGEMENT (ROOMS, ROOM PLAYERS, INVITATIONS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'READY', 'IN_PROGRESS', 'FINISHED', 'CANCELLED')),
  max_players INT DEFAULT 4 CHECK (max_players = 4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,

  CONSTRAINT room_code_format CHECK (room_code ~* '^[A-Z0-9]{6}$')
);

CREATE TABLE IF NOT EXISTS public.room_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seat INT NOT NULL CHECK (seat >= 0 AND seat <= 3),
  team INT NOT NULL CHECK (team IN (0, 1)),
  is_ready BOOLEAN DEFAULT FALSE,
  connection_status VARCHAR(20) DEFAULT 'CONNECTED' CHECK (connection_status IN ('CONNECTED', 'DISCONNECTED', 'AWAY')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,

  UNIQUE(room_id, user_id),
  UNIQUE(room_id, seat)
);

CREATE TABLE IF NOT EXISTS public.room_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),

  CONSTRAINT no_self_invite CHECK (inviter_id <> invitee_id)
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms readable by authenticated users"
  ON public.rooms FOR SELECT USING (true);

CREATE POLICY "Room players readable by authenticated users"
  ON public.room_players FOR SELECT USING (true);

CREATE POLICY "Invitations readable by invitee or inviter"
  ON public.room_invitations FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);
