-- 304 Card Game Supabase PostgreSQL Schema with RLS Policies

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT DEFAULT '',
    games_played INT DEFAULT 0,
    games_won INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Friendships Table
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

-- 4. Rooms Table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('waiting', 'bidding', 'playing', 'finished')) DEFAULT 'waiting',
    is_private BOOLEAN DEFAULT true,
    max_players INT DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Room Players Table
CREATE TABLE IF NOT EXISTS public.room_players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    seat_number INT CHECK (seat_number BETWEEN 0 AND 3),
    team INT CHECK (team IN (0, 1)),
    ready BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(room_id, user_id),
    UNIQUE(room_id, seat_number)
);

-- 6. Games Table
CREATE TABLE IF NOT EXISTS public.games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('WAITING', 'DEALING', 'BIDDING', 'TRUMP_SELECTION', 'PLAYING', 'TRICK_COMPLETE', 'ROUND_COMPLETE', 'GAME_COMPLETE')) DEFAULT 'WAITING',
    dealer_seat INT DEFAULT 0,
    current_turn_seat INT DEFAULT 0,
    bidder_seat INT,
    bid_amount INT DEFAULT 160,
    trump_suit TEXT,
    trump_revealed BOOLEAN DEFAULT false,
    trump_card JSONB,
    team_a_score INT DEFAULT 0,
    team_b_score INT DEFAULT 0,
    current_trick_number INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Game Hands Table (Strict Private RLS)
CREATE TABLE IF NOT EXISTS public.game_hands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    seat_number INT CHECK (seat_number BETWEEN 0 AND 3),
    cards JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, player_id)
);

-- 8. Tricks Table
CREATE TABLE IF NOT EXISTS public.tricks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    trick_number INT NOT NULL,
    lead_seat INT NOT NULL,
    winner_seat INT,
    cards_played JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    sender_name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Match History Table
CREATE TABLE IF NOT EXISTS public.match_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    team_a_players JSONB DEFAULT '[]'::jsonb,
    team_b_players JSONB DEFAULT '[]'::jsonb,
    team_a_score INT DEFAULT 0,
    team_b_score INT DEFAULT 0,
    winning_team INT NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tricks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policy: Everyone authenticated can read profiles; user can update their own profile.
CREATE POLICY "Public profiles are viewable by authenticated users" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Game Hands Policy (CRITICAL SECURITY): User can ONLY read their own hand!
CREATE POLICY "Users can only see their own cards" ON public.game_hands FOR SELECT USING (auth.uid() = player_id);

-- General Policies for Rooms, Players, Games, Chat & History
CREATE POLICY "Authenticated users can read rooms" ON public.rooms FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can create rooms" ON public.rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Hosts can update their rooms" ON public.rooms FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Authenticated users can read room players" ON public.room_players FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can join room players" ON public.room_players FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update room player state" ON public.room_players FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view active games" ON public.games FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can view tricks" ON public.tricks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can read chat" ON public.chat_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can send chat" ON public.chat_messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can read match history" ON public.match_history FOR SELECT USING (auth.role() = 'authenticated');
