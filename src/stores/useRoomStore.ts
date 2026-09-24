import { create } from 'zustand';
import { PlayerState } from '../lib/game-engine/types';
import { createInitialPlayer } from '../lib/game-engine/gameEngine';
import { notify } from './useNotificationStore';

export interface RoomDetails {
  id: string;
  roomCode: string;
  name: string;
  hostId: string;
  isPrivate: boolean;
  maxPlayers: number;
  status: 'waiting' | 'bidding' | 'playing' | 'finished';
  players: PlayerState[];
  createdAt: string;
}

interface RoomStore {
  currentRoom: RoomDetails | null;
  activeRoomsList: RoomDetails[];
  createRoom: (name: string, isPrivate: boolean, hostUser: { id: string; name: string; avatar: string }) => Promise<RoomDetails>;
  joinRoomByCode: (code: string, user: { id: string; name: string; avatar: string }) => Promise<RoomDetails | null>;
  togglePlayerReady: (userId: string) => void;
  kickPlayer: (seatNumber: number) => void;
  fillWithBots: () => void;
  leaveRoom: () => void;
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const DEFAULT_ROOM: RoomDetails = {
  id: 'room_demo_1',
  roomCode: 'A7K29P',
  name: 'FRIDAY NIGHT 304',
  hostId: 'usr_default_host',
  isPrivate: true,
  maxPlayers: 4,
  status: 'waiting',
  players: [
    createInitialPlayer('usr_default_host', 'Rusaith (Host)', 'https://api.dicebear.com/7.x/bottts/svg?seed=rusaith', 0),
    createInitialPlayer('bot_kavin', 'Kavin', 'https://api.dicebear.com/7.x/bottts/svg?seed=kavin', 1),
    createInitialPlayer('bot_ahmed', 'Ahmed', 'https://api.dicebear.com/7.x/bottts/svg?seed=ahmed', 2),
    createInitialPlayer('bot_sajith', 'Sajith', 'https://api.dicebear.com/7.x/bottts/svg?seed=sajith', 3),
  ],
  createdAt: new Date().toISOString(),
};

function getSharedRoomsFromStorage(): RoomDetails[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('304_shared_rooms');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function broadcastRoomUpdate(room: RoomDetails) {
  if (typeof window === 'undefined') return;

  // 1. Save to localStorage
  try {
    const stored = getSharedRoomsFromStorage();
    const nextShared = [room, ...stored.filter((r) => r.id !== room.id)];
    localStorage.setItem('304_shared_rooms', JSON.stringify(nextShared));
  } catch (e) {}

  // 2. Broadcast via BroadcastChannel across tabs/windows
  try {
    const channel = new BroadcastChannel('304_room_sync');
    channel.postMessage({ type: 'ROOM_UPDATED', room });
    channel.close();
  } catch (e) {}
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  currentRoom: DEFAULT_ROOM,
  activeRoomsList: [DEFAULT_ROOM],

  createRoom: async (name, isPrivate, hostUser) => {
    let newCode = generateRoomCode();
    let dbRoomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Try server API room creation if connected to Supabase
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', hostId: hostUser.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.room) {
          newCode = data.room.room_code;
          dbRoomId = data.room.id;
        }
      }
    } catch (e) {}

    const hostPlayer = createInitialPlayer(hostUser.id, hostUser.name, hostUser.avatar, 0);
    hostPlayer.isReady = true;

    const newRoom: RoomDetails = {
      id: dbRoomId,
      roomCode: newCode,
      name: name.trim() || 'Friday 304 Match',
      hostId: hostUser.id,
      isPrivate,
      maxPlayers: 4,
      status: 'waiting',
      players: [hostPlayer],
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      currentRoom: newRoom,
      activeRoomsList: [newRoom, ...state.activeRoomsList.filter((r) => r.roomCode !== newCode)],
    }));

    broadcastRoomUpdate(newRoom);
    notify.success(`Room created! Match Code: ${newCode}`, 'ROOM CREATED');
    return newRoom;
  },

  joinRoomByCode: async (code, user) => {
    const cleanCode = code.trim().toUpperCase();

    if (!cleanCode || cleanCode.length < 3) {
      notify.warning('Please enter a valid 6-character room code.', 'INVALID CODE');
      return null;
    }

    // 1. Check activeRoomsList in memory
    let room: RoomDetails | undefined = get().activeRoomsList.find((r) => r.roomCode === cleanCode);

    // 2. Check fresh localStorage shared rooms
    if (!room) {
      const stored = getSharedRoomsFromStorage();
      room = stored.find((r) => r.roomCode === cleanCode);
    }

    // 3. Check currentRoom if code matches
    if (!room && get().currentRoom?.roomCode === cleanCode) {
      room = get().currentRoom || undefined;
    }

    // 4. Fallback to API if room not found locally
    if (!room) {
      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'join', roomCode: cleanCode, userId: user.id }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.room) {
            const apiRoom: RoomDetails = {
              id: data.room.id,
              roomCode: data.room.room_code,
              name: `Match ${data.room.room_code}`,
              hostId: data.room.host_id,
              isPrivate: true,
              maxPlayers: 4,
              status: 'waiting',
              players: (data.members || []).map((m: any, idx: number) =>
                createInitialPlayer(m.user_id || `user_${idx}`, `Player ${idx + 1}`, 'https://api.dicebear.com/7.x/bottts/svg?seed=' + idx, m.seat || idx)
              ),
              createdAt: data.room.created_at || new Date().toISOString(),
            };
            room = apiRoom;
          }
        }
      } catch (e) {}
    }

    if (!room) {
      notify.error(`Room code "${cleanCode}" not found. Please verify the code and try again.`, 'ROOM NOT FOUND');
      return null;
    }

    // Check if player is already in room
    const existingPlayer = room.players.find((p) => p.id === user.id);
    if (existingPlayer) {
      set({ currentRoom: room });
      notify.info(`Rejoined match room: ${room.name}`, 'ROOM REJOINED');
      return room;
    }

    if (room.players.length >= 4) {
      notify.warning(`Room ${room.roomCode} is full (maximum 4 players allowed).`, 'ROOM FULL');
      return null;
    }

    // Find first available seat number (0-3)
    const takenSeats = room.players.map((p) => p.seat);
    let freeSeat = 0;
    for (let s = 0; s < 4; s++) {
      if (!takenSeats.includes(s)) {
        freeSeat = s;
        break;
      }
    }

    const newPlayer = createInitialPlayer(user.id, user.name, user.avatar, freeSeat);
    const updatedRoom: RoomDetails = {
      ...room,
      players: [...room.players, newPlayer],
    };

    set((state) => ({
      currentRoom: updatedRoom,
      activeRoomsList: [updatedRoom, ...state.activeRoomsList.filter((r) => r.id !== room.id)],
    }));

    broadcastRoomUpdate(updatedRoom);
    notify.success(`Joined match room: ${room.name}`, 'SUCCESS');
    return updatedRoom;
  },

  togglePlayerReady: (userId) => {
    const room = get().currentRoom;
    if (!room) return;

    const updatedPlayers = room.players.map((p) =>
      p.id === userId ? { ...p, isReady: !p.isReady } : p
    );

    const updatedRoom = { ...room, players: updatedPlayers };

    set((state) => ({
      currentRoom: updatedRoom,
      activeRoomsList: state.activeRoomsList.map((r) => (r.id === room.id ? updatedRoom : r)),
    }));

    broadcastRoomUpdate(updatedRoom);
  },

  kickPlayer: (seatNumber) => {
    const room = get().currentRoom;
    if (!room) return;

    const playerToKick = room.players.find((p) => p.seat === seatNumber);
    const updatedPlayers = room.players.filter((p) => p.seat !== seatNumber);
    const updatedRoom = { ...room, players: updatedPlayers };

    set({ currentRoom: updatedRoom });
    broadcastRoomUpdate(updatedRoom);
    if (playerToKick) {
      notify.info(`${playerToKick.name} was removed from the table.`, 'PLAYER KICKED');
    }
  },

  fillWithBots: () => {
    const room = get().currentRoom;
    if (!room) return;

    const currentSeats = room.players.map((p) => p.seat);
    const botNames = ['Kavin', 'Ahmed', 'Sajith', 'Nimal'];
    const botAvatars = ['kavin', 'ahmed', 'sajith', 'nimal'];

    const newPlayers = [...room.players];

    for (let s = 0; s < 4; s++) {
      if (!currentSeats.includes(s)) {
        const botId = `bot_${s}_${Date.now()}`;
        const botPlayer = createInitialPlayer(
          botId,
          botNames[s % botNames.length],
          `https://api.dicebear.com/7.x/bottts/svg?seed=${botAvatars[s % botAvatars.length]}`,
          s
        );
        botPlayer.isReady = true;
        newPlayers.push(botPlayer);
      }
    }

    newPlayers.sort((a, b) => a.seat - b.seat);
    const updatedRoom = { ...room, players: newPlayers };

    set({ currentRoom: updatedRoom });
    broadcastRoomUpdate(updatedRoom);
    notify.success('Table filled with AI bots!', 'BOTS ADDED');
  },

  leaveRoom: () => set({ currentRoom: null }),
}));

// Real-time listener for cross-tab window synchronization
if (typeof window !== 'undefined') {
  // 1. Storage Event Listener
  window.addEventListener('storage', (e) => {
    if (e.key === '304_shared_rooms' && e.newValue) {
      try {
        const rooms: RoomDetails[] = JSON.parse(e.newValue);
        useRoomStore.setState((state) => {
          const updatedCurrent = state.currentRoom
            ? rooms.find((r) => r.id === state.currentRoom?.id) || state.currentRoom
            : null;
          return {
            activeRoomsList: rooms,
            currentRoom: updatedCurrent,
          };
        });
      } catch (err) {}
    }
  });

  // 2. BroadcastChannel Listener
  try {
    const channel = new BroadcastChannel('304_room_sync');
    channel.onmessage = (event) => {
      if (event.data?.type === 'ROOM_UPDATED' && event.data.room) {
        const updated: RoomDetails = event.data.room;
        useRoomStore.setState((state) => {
          const exists = state.activeRoomsList.some((r) => r.id === updated.id);
          const nextList = exists
            ? state.activeRoomsList.map((r) => (r.id === updated.id ? updated : r))
            : [updated, ...state.activeRoomsList];
          const updatedCurrent = state.currentRoom?.id === updated.id ? updated : state.currentRoom;
          return {
            activeRoomsList: nextList,
            currentRoom: updatedCurrent,
          };
        });
      }
    };
  } catch (e) {}
}
