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
  createRoom: (name: string, isPrivate: boolean, hostUser: { id: string; name: string; avatar: string }) => Promise<RoomDetails | null>;
  joinRoomByCode: (code: string, user: { id: string; name: string; avatar: string }) => Promise<RoomDetails | null>;
  fetchRoomDetails: (code: string) => Promise<RoomDetails | null>;
  togglePlayerReady: (userId: string) => void;
  kickPlayer: (seatNumber: number) => void;
  fillWithBots: () => void;
  startMatch: (code: string) => Promise<boolean>;
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
  if (typeof window === 'undefined') return [DEFAULT_ROOM];
  try {
    const raw = localStorage.getItem('304_shared_rooms');
    const rooms = raw ? JSON.parse(raw) : [];
    return rooms.length > 0 ? rooms : [DEFAULT_ROOM];
  } catch (e) {
    return [DEFAULT_ROOM];
  }
}

function getCurrentRoomFromStorage(): RoomDetails | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('304_current_room');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return null;
}

function saveCurrentRoomToStorage(room: RoomDetails | null) {
  if (typeof window === 'undefined') return;
  try {
    if (room) {
      sessionStorage.setItem('304_current_room', JSON.stringify(room));
      sessionStorage.setItem('304_active_view', 'waiting');
    } else {
      sessionStorage.removeItem('304_current_room');
      sessionStorage.removeItem('304_active_view');
    }
  } catch (e) {}
}

function broadcastRoomUpdate(room: RoomDetails) {
  if (typeof window === 'undefined') return;

  // 1. Store in global window memory object
  if (!(window as any).__304_SHARED_ROOMS__) {
    (window as any).__304_SHARED_ROOMS__ = [];
  }
  const inMem: RoomDetails[] = (window as any).__304_SHARED_ROOMS__;
  (window as any).__304_SHARED_ROOMS__ = [room, ...inMem.filter((r) => r.id !== room.id)];

  // 2. Save to localStorage
  try {
    const stored = getSharedRoomsFromStorage();
    const nextShared = [room, ...stored.filter((r) => r.id !== room.id)];
    localStorage.setItem('304_shared_rooms', JSON.stringify(nextShared));
  } catch (e) {}

  // 3. Broadcast via BroadcastChannel across tabs/windows
  try {
    const channel = new BroadcastChannel('304_room_sync');
    channel.postMessage({ type: 'ROOM_UPDATED', room });
    channel.close();
  } catch (e) {}
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  currentRoom: getCurrentRoomFromStorage(),
  activeRoomsList: getSharedRoomsFromStorage(),

  createRoom: async (name, isPrivate, hostUser) => {
    let newCode = generateRoomCode();
    let dbRoomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', hostId: hostUser.id, hostName: hostUser.name }),
      });

      const data = await res.json();
      console.log('[CREATE ROOM DB RESULT]', data);

      if (!res.ok || !data.success || !data.room) {
        notify.error(`Database Error: ${data.error?.message || 'Could not persist room to database.'}`, 'CREATE FAILED');
        return null;
      }

      newCode = data.room.room_code;
      dbRoomId = data.room.id;
    } catch (e: any) {
      console.error('[CREATE ROOM ERROR]', e);
      notify.error(`Network Error: ${e.message || 'Could not connect to database.'}`, 'CREATE FAILED');
      return null;
    }

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

    saveCurrentRoomToStorage(newRoom);
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

    console.log('[JOIN ROOM INITIATED]', {
      input: code,
      normalized: cleanCode,
      user: user.id,
    });

    let room: RoomDetails | undefined;

    // 1. Try server API first so rooms created on server or other windows are fetched instantly
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomCode: cleanCode, userId: user.id, userName: user.name }),
      });
      const data = await res.json();
      console.log('[JOIN ROOM DB RESULT]', { status: res.status, data });

      if (res.ok && data.success && data.room) {
        const membersList = data.members || [];
        const players: PlayerState[] = membersList.map((m: any, idx: number) => {
          const profileName = m.profiles?.display_name || m.profiles?.username || `Player ${m.seat + 1}`;
          const profileAvatar = m.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.seat}`;
          const p = createInitialPlayer(m.user_id || `usr_${m.seat}`, profileName, profileAvatar, m.seat ?? idx);
          p.isReady = m.is_ready ?? false;
          return p;
        });

        room = {
          id: data.room.id,
          roomCode: data.room.room_code,
          name: `Match ${data.room.room_code}`,
          hostId: data.room.host_id,
          isPrivate: true,
          maxPlayers: 4,
          status: (data.room.status as any) || 'waiting',
          players: players.length > 0 ? players : [createInitialPlayer(user.id, user.name, user.avatar, 0)],
          createdAt: data.room.created_at || new Date().toISOString(),
        };
      } else if (data.error?.code === 'ROOM_FULL') {
        notify.warning(`Room "${cleanCode}" is full (maximum 4 players allowed).`, 'ROOM FULL');
        return null;
      } else if (data.error?.code === 'ROOM_IN_PROGRESS') {
        notify.warning(`Match in room "${cleanCode}" is already in progress.`, 'ROOM IN PROGRESS');
        return null;
      }
    } catch (e: any) {
      console.error('[JOIN ROOM API ERROR]', e);
    }

    // 2. Check window global shared rooms memory object
    if (!room && typeof window !== 'undefined' && (window as any).__304_SHARED_ROOMS__) {
      room = (window as any).__304_SHARED_ROOMS__.find((r: RoomDetails) => r.roomCode === cleanCode);
    }

    // 3. Check fresh shared rooms in localStorage for multi-window/tab sync
    if (!room) {
      const sharedRooms = getSharedRoomsFromStorage();
      room = sharedRooms.find((r) => r.roomCode === cleanCode);
    }

    // 4. Check activeRoomsList in memory
    if (!room) {
      room = get().activeRoomsList.find((r) => r.roomCode === cleanCode);
    }

    // 5. Check currentRoom if code matches
    if (!room && get().currentRoom?.roomCode === cleanCode) {
      room = get().currentRoom || undefined;
    }

    if (!room) {
      notify.error(`Room code "${cleanCode}" does not exist. Please verify the code and try again.`, 'ROOM DOES NOT EXIST');
      return null;
    }

    // Check if player is already in room
    const existingPlayer = room.players.find((p) => p.id === user.id);
    if (existingPlayer) {
      set({ currentRoom: room });
      saveCurrentRoomToStorage(room);
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

    saveCurrentRoomToStorage(updatedRoom);
    broadcastRoomUpdate(updatedRoom);
    notify.success(`Joined match room: ${room.name}`, 'SUCCESS');
    return updatedRoom;
  },

  togglePlayerReady: async (userId) => {
    const room = get().currentRoom;
    if (!room) return;

    const targetPlayer = room.players.find((p) => p.id === userId);
    const nextReady = !targetPlayer?.isReady;

    const updatedPlayers = room.players.map((p) =>
      p.id === userId ? { ...p, isReady: nextReady } : p
    );

    const updatedRoom = { ...room, players: updatedPlayers };

    set((state) => ({
      currentRoom: updatedRoom,
      activeRoomsList: state.activeRoomsList.map((r) => (r.id === room.id ? updatedRoom : r)),
    }));

    saveCurrentRoomToStorage(updatedRoom);
    broadcastRoomUpdate(updatedRoom);

    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_ready', roomCode: room.roomCode, userId, isReady: nextReady }),
      });
    } catch (e) {}
  },

  kickPlayer: async (seatNumber) => {
    const room = get().currentRoom;
    if (!room) return;

    const playerToKick = room.players.find((p) => p.seat === seatNumber);
    const updatedPlayers = room.players.filter((p) => p.seat !== seatNumber);
    const updatedRoom = { ...room, players: updatedPlayers };

    set({ currentRoom: updatedRoom });
    saveCurrentRoomToStorage(updatedRoom);
    broadcastRoomUpdate(updatedRoom);
    if (playerToKick) {
      notify.info(`${playerToKick.name} was removed from the table.`, 'PLAYER KICKED');
    }

    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'kick', roomCode: room.roomCode, seat: seatNumber }),
      });
    } catch (e) {}
  },

  fillWithBots: async () => {
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
    saveCurrentRoomToStorage(updatedRoom);
    broadcastRoomUpdate(updatedRoom);
    notify.success('Table filled with AI bots!', 'BOTS ADDED');

    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'fill_bots', roomCode: room.roomCode }),
      });
    } catch (e) {}
  },

  startMatch: async (code) => {
    const cleanCode = code.trim().toUpperCase();
    const room = get().currentRoom;
    if (!room) return false;

    const updatedRoom: RoomDetails = {
      ...room,
      status: 'playing',
    };

    set({ currentRoom: updatedRoom });
    saveCurrentRoomToStorage(updatedRoom);
    broadcastRoomUpdate(updatedRoom);

    try {
      await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start_game', roomCode: cleanCode }),
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  leaveRoom: () => {
    saveCurrentRoomToStorage(null);
    set({ currentRoom: null });
  },

  fetchRoomDetails: async (code) => {
    const cleanCode = code.trim().toUpperCase();
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get', roomCode: cleanCode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.room) {
          const membersList = data.members || [];
          const players: PlayerState[] = membersList.map((m: any, idx: number) => {
            const profileName = m.profiles?.display_name || m.profiles?.username || `Player ${m.seat + 1}`;
            const profileAvatar = m.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.seat}`;
            const p = createInitialPlayer(m.user_id || `usr_${m.seat}`, profileName, profileAvatar, m.seat ?? idx);
            p.isReady = m.is_ready ?? false;
            return p;
          });

          const updatedRoom: RoomDetails = {
            id: data.room.id,
            roomCode: data.room.room_code,
            name: `Match ${data.room.room_code}`,
            hostId: data.room.host_id,
            isPrivate: true,
            maxPlayers: 4,
            status: (data.room.status as any) || 'waiting',
            players: players,
            createdAt: data.room.created_at || new Date().toISOString(),
          };

          set((state) => ({
            currentRoom: updatedRoom,
            activeRoomsList: [updatedRoom, ...state.activeRoomsList.filter((r) => r.id !== updatedRoom.id)],
          }));

          saveCurrentRoomToStorage(updatedRoom);
          return updatedRoom;
        }
      }
    } catch (e) {}
    return null;
  },
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
          if (updatedCurrent) {
            saveCurrentRoomToStorage(updatedCurrent);
          }
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
          if (updatedCurrent) {
            saveCurrentRoomToStorage(updatedCurrent);
          }
          return {
            activeRoomsList: nextList,
            currentRoom: updatedCurrent,
          };
        });
      }
    };
  } catch (e) {}
}
