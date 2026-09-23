import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, hostId, userId, roomCode, seat, isReady } = body;

    if (action === 'create') {
      if (!hostId) {
        return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Host user ID required' } }, { status: 400 });
      }

      let code = generateRoomCode();
      // Ensure code uniqueness
      let attempts = 0;
      while (attempts < 5) {
        const { data: existing } = await supabaseAdmin.from('rooms').select('id').eq('room_code', code).single();
        if (!existing) break;
        code = generateRoomCode();
        attempts++;
      }

      const { data: room, error } = await supabaseAdmin
        .from('rooms')
        .insert({
          room_code: code,
          host_id: hostId,
          status: 'WAITING',
          max_players: 4,
        })
        .select()
        .single();

      if (error || !room) {
        return NextResponse.json({ success: false, error: { code: 'CREATE_FAILED', message: error?.message || 'Could not create room' } }, { status: 500 });
      }

      // Add host to seat 0, Team 0
      await supabaseAdmin.from('room_players').insert({
        room_id: room.id,
        user_id: hostId,
        seat: 0,
        team: 0,
        is_ready: true,
      });

      return NextResponse.json({ success: true, room });
    }

    if (action === 'join') {
      if (!userId || !roomCode) {
        return NextResponse.json({ success: false, error: { code: 'MISSING_PARAM', message: 'User ID and Room Code required' } }, { status: 400 });
      }

      // 1. Find Room
      const { data: room } = await supabaseAdmin
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode.toUpperCase())
        .single();

      if (!room) {
        return NextResponse.json({ success: false, error: { code: 'ROOM_NOT_FOUND', message: 'Room code not found' } }, { status: 404 });
      }

      if (room.status !== 'WAITING' && room.status !== 'READY') {
        return NextResponse.json({ success: false, error: { code: 'ROOM_IN_PROGRESS', message: 'Room game already in progress' } }, { status: 400 });
      }

      // 2. Check current room members
      const { data: existingMembers } = await supabaseAdmin
        .from('room_players')
        .select('*')
        .eq('room_id', room.id);

      const members = existingMembers || [];

      // Check if user already joined
      const existingUserSeat = members.find((m) => m.user_id === userId);
      if (existingUserSeat) {
        return NextResponse.json({ success: true, room, seat: existingUserSeat.seat, members });
      }

      if (members.length >= 4) {
        return NextResponse.json({ success: false, error: { code: 'ROOM_FULL', message: 'Room already has maximum 4 players' } }, { status: 400 });
      }

      // Find available seat
      const occupiedSeats = new Set(members.map((m) => m.seat));
      let availableSeat = 0;
      for (let s = 0; s < 4; s++) {
        if (!occupiedSeats.has(s)) {
          availableSeat = s;
          break;
        }
      }

      const assignedTeam = availableSeat % 2; // Seats 0 & 2 = Team 0, Seats 1 & 3 = Team 1

      const { data: joinedPlayer, error: joinErr } = await supabaseAdmin
        .from('room_players')
        .insert({
          room_id: room.id,
          user_id: userId,
          seat: availableSeat,
          team: assignedTeam,
          is_ready: false,
        })
        .select()
        .single();

      if (joinErr) {
        return NextResponse.json({ success: false, error: { code: 'JOIN_FAILED', message: joinErr.message } }, { status: 400 });
      }

      return NextResponse.json({ success: true, room, seat: availableSeat, team: assignedTeam });
    }

    if (action === 'toggle_ready') {
      if (!userId || seat === undefined) {
        return NextResponse.json({ success: false, error: { code: 'MISSING_PARAM', message: 'User ID and Seat required' } }, { status: 400 });
      }

      await supabaseAdmin
        .from('room_players')
        .update({ is_ready: isReady })
        .eq('user_id', userId);

      return NextResponse.json({ success: true, isReady });
    }

    return NextResponse.json({ success: false, error: { code: 'UNKNOWN_ACTION', message: 'Invalid action' } }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } }, { status: 500 });
  }
}
