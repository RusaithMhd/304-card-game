import { create } from 'zustand';
import { PlayerState } from '../lib/game-engine/types';
import { createInitialPlayer } from '../lib/game-engine/gameEngine';

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
  createRoom: (name: string, isPrivate: boolean, hostUser: { id: string; name: string; avatar: string }) => RoomDetails;
  joinRoomByCode: (code: string, user: { id: string; name: string; avatar: string }) => RoomDetails | null;
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

export const useRoomStore = create<RoomStore>((set, get) => ({
  currentRoom: DEFAULT_ROOM,
  activeRoomsList: [DEFAULT_ROOM],

  createRoom: (name, isPrivate, hostUser) => {
    const newCode = generateRoomCode();
    const hostPlayer = createInitialPlayer(hostUser.id, hostUser.name, hostUser.avatar, 0);
    hostPlayer.isReady = true;

    const newRoom: RoomDetails = {
      id: `room_${Date.now()}`,
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
      activeRoomsList: [newRoom, ...state.activeRoomsList],
    }));

    return newRoom;
  },

  joinRoomByCode: (code, user) => {
    const cleanCode = code.trim().toUpperCase();
    const room = get().activeRoomsList.find((r) => r.roomCode === cleanCode) || get().currentRoom;

    if (!room) return null;

    // Check if already in room
    const existingIndex = room.players.findIndex((p) => p.id === user.id);
    if (existingIndex !== -1) {
      set({ currentRoom: room });
      return room;
    }

    if (room.players.length >= 4) {
      alert('Room is full (max 4 players)');
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
      activeRoomsList: state.activeRoomsList.map((r) => (r.id === room.id ? updatedRoom : r)),
    }));

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
  },

  kickPlayer: (seatNumber) => {
    const room = get().currentRoom;
    if (!room) return;

    const updatedPlayers = room.players.filter((p) => p.seat !== seatNumber);
    const updatedRoom = { ...room, players: updatedPlayers };

    set({ currentRoom: updatedRoom });
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

    // Sort players by seat
    newPlayers.sort((a, b) => a.seat - b.seat);

    const updatedRoom = { ...room, players: newPlayers };
    set({ currentRoom: updatedRoom });
  },

  leaveRoom: () => set({ currentRoom: null }),
}));
