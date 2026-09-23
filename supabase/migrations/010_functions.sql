-- ============================================================================
-- 010: ATOMIC STORED DATABASE FUNCTIONS
-- ============================================================================

-- Function to generate 6-character room code
CREATE OR REPLACE FUNCTION public.generate_unique_room_code()
RETURNS VARCHAR(6) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code VARCHAR(6) := '';
  i INT;
  code_exists BOOLEAN := TRUE;
BEGIN
  WHILE code_exists LOOP
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || SUBSTRING(chars FROM FLOOR(RANDOM() * LENGTH(chars) + 1)::INT FOR 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.rooms WHERE room_code = new_code) INTO code_exists;
  END LOOP;
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 1. ATOMIC ROOM CREATION
CREATE OR REPLACE FUNCTION public.create_room()
RETURNS JSONB AS $$
DECLARE
  v_host_id UUID := auth.uid();
  v_room_code VARCHAR(6);
  v_room_id UUID;
  v_result JSONB;
BEGIN
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  v_room_code := public.generate_unique_room_code();

  INSERT INTO public.rooms (room_code, host_id, status, max_players)
  VALUES (v_room_code, v_host_id, 'WAITING', 4)
  RETURNING id INTO v_room_id;

  -- Insert host into Seat 0 (Team 0 / Team A)
  INSERT INTO public.room_players (room_id, user_id, seat, team, is_ready)
  VALUES (v_room_id, v_host_id, 0, 0, TRUE);

  SELECT jsonb_build_object(
    'room_id', v_room_id,
    'room_code', v_room_code,
    'host_id', v_host_id,
    'seat', 0,
    'team', 0
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ATOMIC ROOM JOIN
CREATE OR REPLACE FUNCTION public.join_room(p_room_code VARCHAR(6))
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_room_id UUID;
  v_room_status VARCHAR(20);
  v_player_count INT;
  v_assigned_seat INT := -1;
  v_assigned_team INT;
  v_result JSONB;
  i INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  -- Lock room row for update to prevent race conditions
  SELECT id, status INTO v_room_id, v_room_status
  FROM public.rooms
  WHERE room_code = UPPER(p_room_code)
  FOR UPDATE;

  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND';
  END IF;

  IF v_room_status <> 'WAITING' AND v_room_status <> 'READY' THEN
    RAISE EXCEPTION 'ROOM_NOT_JOINABLE';
  END IF;

  -- Check if user already in room
  SELECT seat INTO v_assigned_seat
  FROM public.room_players
  WHERE room_id = v_room_id AND user_id = v_user_id;

  IF v_assigned_seat IS NOT NULL AND v_assigned_seat >= 0 THEN
    RETURN jsonb_build_object('room_id', v_room_id, 'seat', v_assigned_seat, 'team', v_assigned_seat % 2);
  END IF;

  -- Count capacity
  SELECT COUNT(*) INTO v_player_count FROM public.room_players WHERE room_id = v_room_id;
  IF v_player_count >= 4 THEN
    RAISE EXCEPTION 'ROOM_FULL';
  END IF;

  -- Find first open seat
  FOR i IN 0..3 LOOP
    IF NOT EXISTS(SELECT 1 FROM public.room_players WHERE room_id = v_room_id AND seat = i) THEN
      v_assigned_seat := i;
      EXIT;
    END IF;
  END LOOP;

  v_assigned_team := v_assigned_seat % 2; -- Seat 0/2 = Team A (0), Seat 1/3 = Team B (1)

  INSERT INTO public.room_players (room_id, user_id, seat, team, is_ready)
  VALUES (v_room_id, v_user_id, v_assigned_seat, v_assigned_team, FALSE);

  RETURN jsonb_build_object('room_id', v_room_id, 'seat', v_assigned_seat, 'team', v_assigned_team);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. ATOMIC ROOM LEAVE WITH HOST TRANSFER
CREATE OR REPLACE FUNCTION public.leave_room(p_room_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_host_id UUID;
  v_new_host_id UUID;
  v_remaining_count INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  DELETE FROM public.room_players WHERE room_id = p_room_id AND user_id = v_user_id;

  SELECT host_id INTO v_host_id FROM public.rooms WHERE id = p_room_id;

  -- If host left, transfer host to next player or cancel room if empty
  IF v_host_id = v_user_id THEN
    SELECT user_id INTO v_new_host_id
    FROM public.room_players
    WHERE room_id = p_room_id
    ORDER BY joined_at ASC
    LIMIT 1;

    IF v_new_host_id IS NOT NULL THEN
      UPDATE public.rooms SET host_id = v_new_host_id WHERE id = p_room_id;
    ELSE
      UPDATE public.rooms SET status = 'CANCELLED' WHERE id = p_room_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
