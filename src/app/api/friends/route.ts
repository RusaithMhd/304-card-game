import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const query = searchParams.get('query');

    if (query) {
      // Search users by username or display_name
      const { data: users } = await supabaseAdmin
        .from('profiles')
        .select('id, username, display_name, avatar_url, country')
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10);

      return NextResponse.json({ success: true, users: users || [] });
    }

    if (!userId) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_PARAM', message: 'User ID required' } }, { status: 400 });
    }

    // Get friendships
    const { data: friendships } = await supabaseAdmin
      .from('friendships')
      .select('id, user_id_1, user_id_2')
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`);

    const friendIds = (friendships || []).map((f) => (f.user_id_1 === userId ? f.user_id_2 : f.user_id_1));

    let friends: any[] = [];
    if (friendIds.length > 0) {
      const { data: friendProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, username, display_name, avatar_url, is_online, last_seen')
        .in('id', friendIds);
      friends = friendProfiles || [];
    }

    // Get pending incoming requests
    const { data: requests } = await supabaseAdmin
      .from('friend_requests')
      .select('id, sender_id, created_at, profiles!friend_requests_sender_id_fkey(username, display_name, avatar_url)')
      .eq('receiver_id', userId)
      .eq('status', 'pending');

    return NextResponse.json({ success: true, friends, pendingRequests: requests || [] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, senderId, receiverId, requestId, blockerId, blockedId } = body;

    if (action === 'send_request') {
      if (!senderId || !receiverId || senderId === receiverId) {
        return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid sender or receiver' } }, { status: 400 });
      }

      // Check if blocked
      const { data: isBlocked } = await supabaseAdmin
        .from('blocked_users')
        .select('id')
        .or(`and(blocker_id.eq.${receiverId},blocked_id.eq.${senderId}),and(blocker_id.eq.${senderId},blocked_id.eq.${receiverId})`)
        .single();

      if (isBlocked) {
        return NextResponse.json({ success: false, error: { code: 'BLOCKED', message: 'Cannot send request to blocked user' } }, { status: 403 });
      }

      const { data, error } = await supabaseAdmin
        .from('friend_requests')
        .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: { code: 'REQUEST_EXISTS', message: 'Request already pending' } }, { status: 400 });
      }

      return NextResponse.json({ success: true, request: data });
    }

    if (action === 'accept_request') {
      if (!requestId) {
        return NextResponse.json({ success: false, error: { code: 'MISSING_PARAM', message: 'Request ID required' } }, { status: 400 });
      }

      const { data: reqData, error: reqErr } = await supabaseAdmin
        .from('friend_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .select()
        .single();

      if (reqErr || !reqData) {
        return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Request not found' } }, { status: 404 });
      }

      // Create normalized friendship entry
      const u1 = reqData.sender_id < reqData.receiver_id ? reqData.sender_id : reqData.receiver_id;
      const u2 = reqData.sender_id < reqData.receiver_id ? reqData.receiver_id : reqData.sender_id;

      await supabaseAdmin.from('friendships').insert({ user_id_1: u1, user_id_2: u2 });

      return NextResponse.json({ success: true, message: 'Friend request accepted' });
    }

    if (action === 'block') {
      if (!blockerId || !blockedId) {
        return NextResponse.json({ success: false, error: { code: 'MISSING_PARAM', message: 'Blocker and Blocked ID required' } }, { status: 400 });
      }

      await supabaseAdmin.from('blocked_users').insert({ blocker_id: blockerId, blocked_id: blockedId });
      return NextResponse.json({ success: true, message: 'User blocked' });
    }

    return NextResponse.json({ success: false, error: { code: 'UNKNOWN_ACTION', message: 'Invalid action' } }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } }, { status: 500 });
  }
}
