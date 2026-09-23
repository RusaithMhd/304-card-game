-- ============================================================================
-- 009: HIGH PERFORMANCE DATABASE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON public.profiles(display_name);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id);

CREATE INDEX IF NOT EXISTS idx_friendships_user1 ON public.friendships(user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user2 ON public.friendships(user_id_2);

CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON public.blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON public.blocked_users(blocked_id);

CREATE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_host ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);

CREATE INDEX IF NOT EXISTS idx_room_players_room ON public.room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_user ON public.room_players(user_id);
CREATE INDEX IF NOT EXISTS idx_room_players_seat ON public.room_players(room_id, seat);

CREATE INDEX IF NOT EXISTS idx_room_invitations_invitee ON public.room_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_room_invitations_room ON public.room_invitations(room_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_reports_reported ON public.reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
