import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase/admin';
import { createInitialPlayer, createInitialState, applyGameAction } from '../../../lib/game-engine/gameEngine';
import { PlayerState } from '../../../lib/game-engine/types';

export const dynamic = 'force-dynamic';

interface ServerPlayer {
  user_id: string;
  seat: number;
  team: number;
  is_ready: boolean;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

interface ServerRoom {
  id: string;
  room_code: string;
  host_id: string;
  status: 'waiting' | 'bidding' | 'playing' | 'finished';
  max_players: number;
  created_at: string;
  members: ServerPlayer[];
  game_state?: any;
}

// Server-authoritative in-memory room registry across hot reloads & worker processes
if (!(globalThis as any).__304_SERVER_ROOMS__) {
  (globalThis as any).__304_SERVER_ROOMS__ = new Map<string, ServerRoom>();
}
const serverRoomsMap: Map<string, ServerRoom> = (globalThis as any).__304_SERVER_ROOMS__;

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function toUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(id)) return id.toLowerCase();

  let hex = '';
  for (let i = 0; i < id.length; i++) {
    hex += id.charCodeAt(i).toString(16);
  }
  hex = hex.padEnd(32, '0').slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, hostId, hostName, userId, userName, roomCode, seat, isReady } = body;

    // 1. CREATE ROOM
    if (action === 'create') {
      if (!hostId) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Host user ID is required.' } },
          { status: 400 }
        );
      }

      let code = generateRoomCode();
      let attempts = 0;
      while (serverRoomsMap.has(code) && attempts < 10) {
        code = generateRoomCode();
        attempts++;
      }

      const dbRoomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const hostUuid = toUuid(hostId);
      const hostDisplayName = hostName || 'Host Player';
      const hostAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${hostUuid.slice(0, 5)}`;

      const hostMember: ServerPlayer = {
        user_id: hostId,
        seat: 0,
        team: 0,
        is_ready: true,
        profiles: {
          id: hostUuid,
          username: hostDisplayName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          display_name: hostDisplayName,
          avatar_url: hostAvatar,
        },
      };

      const newRoom: ServerRoom = {
        id: dbRoomId,
        room_code: code,
        host_id: hostId,
        status: 'waiting',
        max_players: 4,
        created_at: new Date().toISOString(),
        members: [hostMember],
      };

      // Save to server-authoritative memory store
      serverRoomsMap.set(code, newRoom);

      // Attempt optional Supabase DB persistence
      try {
        await supabaseAdmin.from('profiles').upsert({
          id: hostUuid,
          username: hostMember.profiles.username,
          display_name: hostDisplayName,
          avatar_url: hostAvatar,
          role: 'USER',
        });

        const { data: dbRoom } = await supabaseAdmin
          .from('rooms')
          .insert({
            room_code: code,
            host_id: hostUuid,
            status: 'WAITING',
            max_players: 4,
          })
          .select()
          .single();

        if (dbRoom) {
          newRoom.id = dbRoom.id;
          await supabaseAdmin.from('room_players').insert({
            room_id: dbRoom.id,
            user_id: hostUuid,
            seat: 0,
            team: 0,
            is_ready: true,
          });
        }
      } catch (e: any) {
        console.warn('[SUPABASE OPTIONAL SYNC WARN]', e.message);
      }

      console.log(`[CREATE ROOM SUCCESS] Code: ${code}, Host: ${hostDisplayName}`);
      return NextResponse.json({ success: true, room: newRoom });
    }

    // 2. JOIN ROOM
    if (action === 'join') {
      if (!userId || !roomCode) {
        return NextResponse.json(
          { success: false, error: { code: 'MISSING_PARAM', message: 'User ID and Room Code are required.' } },
          { status: 400 }
        );
      }

      const cleanCode = roomCode.trim().toUpperCase();

      console.log('[JOIN ROOM REQUEST]', { input: roomCode, cleanCode, userId, userName });

      let room = serverRoomsMap.get(cleanCode);

      // Fallback query to Supabase DB if not in server memory
      if (!room) {
        try {
          const { data: dbRoom } = await supabaseAdmin
            .from('rooms')
            .select('*')
            .eq('room_code', cleanCode)
            .single();

          if (dbRoom) {
            const { data: membersData } = await supabaseAdmin
              .from('room_players')
              .select('*, profiles(id, username, display_name, avatar_url)')
              .eq('room_id', dbRoom.id);

            const mappedMembers: ServerPlayer[] = (membersData || []).map((m: any, idx: number) => ({
              user_id: m.user_id,
              seat: m.seat ?? idx,
              team: m.team ?? (m.seat % 2),
              is_ready: m.is_ready ?? false,
              profiles: {
                id: m.user_id,
                username: m.profiles?.username || `player_${m.seat}`,
                display_name: m.profiles?.display_name || `Player ${m.seat + 1}`,
                avatar_url: m.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.seat}`,
              },
            }));

            room = {
              id: dbRoom.id,
              room_code: dbRoom.room_code,
              host_id: dbRoom.host_id,
              status: dbRoom.status?.toLowerCase() === 'waiting' ? 'waiting' : 'playing',
              max_players: 4,
              created_at: dbRoom.created_at || new Date().toISOString(),
              members: mappedMembers,
            };
            serverRoomsMap.set(cleanCode, room);
          }
        } catch (e: any) {
          console.warn('[SUPABASE FETCH ROOM WARN]', e.message);
        }
      }

      if (!room) {
        console.log(`[JOIN ROOM ERROR] Room code "${cleanCode}" does not exist.`);
        return NextResponse.json(
          { success: false, error: { code: 'ROOM_NOT_FOUND', message: `Room code "${cleanCode}" does not exist. Please verify the code and try again.` } },
          { status: 404 }
        );
      }

      // Check if user is already in the room
      const existingUser = room.members.find((m) => m.user_id === userId);
      if (existingUser) {
        console.log(`[JOIN ROOM REJOINED] User ${userName || userId} rejoined room ${cleanCode}`);
        return NextResponse.json({ success: true, room, seat: existingUser.seat, members: room.members });
      }

      if (room.status !== 'waiting') {
        return NextResponse.json(
          { success: false, error: { code: 'ROOM_IN_PROGRESS', message: `Match in room "${cleanCode}" is already in progress.` } },
          { status: 400 }
        );
      }

      // Check room capacity
      if (room.members.length >= 4) {
        return NextResponse.json(
          { success: false, error: { code: 'ROOM_FULL', message: `Room "${cleanCode}" is full (maximum 4 players allowed).` } },
          { status: 400 }
        );
      }

      // Find first available seat number (0, 1, 2, 3)
      const occupiedSeats = new Set(room.members.map((m) => m.seat));
      let availableSeat = 0;
      for (let s = 0; s < 4; s++) {
        if (!occupiedSeats.has(s)) {
          availableSeat = s;
          break;
        }
      }

      const assignedTeam = availableSeat % 2;
      const userUuid = toUuid(userId);
      const userDisplayName = userName || `Player ${availableSeat + 1}`;
      const userAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${userUuid.slice(0, 5)}`;

      const newMember: ServerPlayer = {
        user_id: userId,
        seat: availableSeat,
        team: assignedTeam,
        is_ready: false,
        profiles: {
          id: userUuid,
          username: userDisplayName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          display_name: userDisplayName,
          avatar_url: userAvatar,
        },
      };

      room.members.push(newMember);
      serverRoomsMap.set(cleanCode, room);

      // Attempt optional DB insert
      try {
        await supabaseAdmin.from('profiles').upsert({
          id: userUuid,
          username: newMember.profiles.username,
          display_name: userDisplayName,
          avatar_url: userAvatar,
          role: 'USER',
        });

        await supabaseAdmin.from('room_players').insert({
          room_id: room.id,
          user_id: userUuid,
          seat: availableSeat,
          team: assignedTeam,
          is_ready: false,
        });
      } catch (e: any) {}

      console.log(`[JOIN ROOM SUCCESS] Code: ${cleanCode}, User: ${userDisplayName}, Seat: ${availableSeat}`);
      return NextResponse.json({
        success: true,
        room,
        seat: availableSeat,
        team: assignedTeam,
        members: room.members,
      });
    }

    // 3. GET ROOM DETAILS
    if (action === 'get') {
      if (!roomCode) {
        return NextResponse.json(
          { success: false, error: { code: 'MISSING_PARAM', message: 'Room Code is required.' } },
          { status: 400 }
        );
      }

      const cleanCode = roomCode.trim().toUpperCase();
      let room = serverRoomsMap.get(cleanCode);

      if (!room) {
        return NextResponse.json(
          { success: false, error: { code: 'ROOM_NOT_FOUND', message: `Room code "${cleanCode}" not found.` } },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, room, members: room.members, gameState: room.game_state });
    }

    // 4. TOGGLE PLAYER READY
    if (action === 'toggle_ready') {
      if (!roomCode || !userId) {
        return NextResponse.json(
          { success: false, error: { code: 'MISSING_PARAM', message: 'Room Code and User ID required.' } },
          { status: 400 }
        );
      }

      const cleanCode = roomCode.trim().toUpperCase();
      const room = serverRoomsMap.get(cleanCode);
      if (room) {
        const member = room.members.find((m) => m.user_id === userId);
        if (member) {
          member.is_ready = isReady !== undefined ? isReady : !member.is_ready;
          serverRoomsMap.set(cleanCode, room);
        }
        return NextResponse.json({ success: true, room, members: room.members });
      }
      return NextResponse.json({ success: true });
    }

    // 5. KICK PLAYER
    if (action === 'kick') {
      if (!roomCode || seat === undefined) {
        return NextResponse.json(
          { success: false, error: { code: 'MISSING_PARAM', message: 'Room Code and Seat required.' } },
          { status: 400 }
        );
      }

      const cleanCode = roomCode.trim().toUpperCase();
      const room = serverRoomsMap.get(cleanCode);
      if (room) {
        room.members = room.members.filter((m) => m.seat !== seat);
        serverRoomsMap.set(cleanCode, room);
        return NextResponse.json({ success: true, room, members: room.members });
      }
      return NextResponse.json({ success: true });
    }

    // 6. FILL WITH BOTS
    if (action === 'fill_bots') {
      if (!roomCode) {
        return NextResponse.json(
          { success: false, error: { code: 'MISSING_PARAM', message: 'Room Code required.' } },
          { status: 400 }
        );
      }

      const cleanCode = roomCode.trim().toUpperCase();
      const room = serverRoomsMap.get(cleanCode);
      if (room) {
        const currentSeats = room.members.map((m) => m.seat);
        const botNames = ['Kavin', 'Ahmed', 'Sajith', 'Nimal'];
        const botAvatars = ['kavin', 'ahmed', 'sajith', 'nimal'];

        for (let s = 0; s < 4; s++) {
          if (!currentSeats.includes(s)) {
            const botId = `bot_${s}_${Date.now()}`;
            const botUuid = toUuid(botId);
            const botName = botNames[s % botNames.length];
            const botAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${botAvatars[s % botAvatars.length]}`;
            room.members.push({
              user_id: botId,
              seat: s,
              team: s % 2,
              is_ready: true,
              profiles: {
                id: botUuid,
                username: botName.toLowerCase(),
                display_name: botName,
                avatar_url: botAvatar,
              },
            });
          }
        }
        room.members.sort((a, b) => a.seat - b.seat);
        serverRoomsMap.set(cleanCode, room);
        return NextResponse.json({ success: true, room, members: room.members });
      }
      return NextResponse.json({ success: true });
    }

    // 7. START GAME MATCH
    if (action === 'start_game') {
      if (!roomCode) {
        return NextResponse.json(
          { success: false, error: { code: 'MISSING_PARAM', message: 'Room Code required.' } },
          { status: 400 }
        );
      }

      const cleanCode = roomCode.trim().toUpperCase();
      const room = serverRoomsMap.get(cleanCode);
      if (room) {
        room.status = 'playing';

        // Initialize server-authoritative game state
        const players: PlayerState[] = room.members.map((m) =>
          createInitialPlayer(
            m.user_id,
            m.profiles?.display_name || m.profiles?.username || `Player ${m.seat + 1}`,
            m.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.seat}`,
            m.seat
          )
        );
        const initState = createInitialState(cleanCode, players);
        room.game_state = applyGameAction(initState, { type: 'START_GAME' });

        serverRoomsMap.set(cleanCode, room);

        try {
          await supabaseAdmin
            .from('rooms')
            .update({ status: 'PLAYING' })
            .eq('room_code', cleanCode);
        } catch (e: any) {}

        console.log(`[START GAME SUCCESS] Room ${cleanCode} status changed to playing, game initialized`);
        return NextResponse.json({ success: true, room, members: room.members, gameState: room.game_state });
      }
      return NextResponse.json({ success: true });
    }

    // 8. PROCESS MULTIPLAYER GAME ACTION
    if (action === 'game_action') {
      if (!roomCode || !body.gameAction) {
        return NextResponse.json(
          { success: false, error: { code: 'MISSING_PARAM', message: 'Room Code and Game Action required.' } },
          { status: 400 }
        );
      }

      const cleanCode = roomCode.trim().toUpperCase();
      const room = serverRoomsMap.get(cleanCode);
      if (room) {
        if (!room.game_state) {
          const players: PlayerState[] = room.members.map((m) =>
            createInitialPlayer(
              m.user_id,
              m.profiles?.display_name || m.profiles?.username || `Player ${m.seat + 1}`,
              m.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.seat}`,
              m.seat
            )
          );
          const initState = createInitialState(cleanCode, players);
          room.game_state = applyGameAction(initState, { type: 'START_GAME' });
        }

        try {
          const nextState = applyGameAction(room.game_state, body.gameAction);
          room.game_state = nextState;
          serverRoomsMap.set(cleanCode, room);
          console.log(`[GAME ACTION APPLIED] Room: ${cleanCode}, Action: ${body.gameAction.type}`);
          return NextResponse.json({ success: true, gameState: room.game_state });
        } catch (e: any) {
          console.warn(`[GAME ACTION ERROR] Room: ${cleanCode}`, e.message);
          return NextResponse.json({ success: false, error: e.message, gameState: room.game_state });
        }
      }
      return NextResponse.json({ success: true });
    }

    // 9. LIST ACTIVE WAITING ROOMS
    if (action === 'list') {
      const activeRooms = Array.from(serverRoomsMap.values()).filter((r) => r.status === 'waiting');
      return NextResponse.json({ success: true, rooms: activeRooms });
    }

    return NextResponse.json(
      { success: false, error: { code: 'UNKNOWN_ACTION', message: 'Invalid action specified.' } },
      { status: 400 }
    );
  } catch (e: any) {
    console.error('[API ROOMS SERVER ERROR]', e);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: e.message || 'Internal server error.' } },
      { status: 500 }
    );
  }
}
