-- ============================================================================
-- 012: DATABASE SECURITY & CONSTRAINT VERIFICATION SCRIPT
-- ============================================================================

DO $$
BEGIN
  -- Verify profiles username length check
  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'username_len_check'
  ), 'Missing username length constraint';

  -- Verify room players unique seat constraint
  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'room_players_room_id_seat_key'
  ), 'Missing unique seat per room constraint';

  -- Verify canonical friendship constraint
  ASSERT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'canonical_user_pair'
  ), 'Missing canonical friendship user ordering constraint';

  RAISE NOTICE 'All Step 2 Database Constraints Verified Successfully!';
END $$;
