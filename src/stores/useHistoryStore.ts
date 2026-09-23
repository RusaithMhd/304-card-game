import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MatchRecord {
  id: string;
  roomName: string;
  roomCode: string;
  date: string;
  teamAPlayers: string[];
  teamBPlayers: string[];
  teamAScore: number;
  teamBScore: number;
  winningTeam: number; // 0 for Team A, 1 for Team B
  bidAmount: number;
  bidderName: string;
  isMarleyOrCap: boolean;
}

interface HistoryStore {
  matches: MatchRecord[];
  addMatchRecord: (record: Omit<MatchRecord, 'id'>) => void;
  clearHistory: () => void;
}

const DEFAULT_MATCHES: MatchRecord[] = [
  {
    id: 'm_hist_1',
    roomName: 'Friday Night 304',
    roomCode: 'A7K29P',
    date: 'Today at 11:45 AM',
    teamAPlayers: ['Rusaith', 'Ahmed'],
    teamBPlayers: ['Kavin', 'Sajith'],
    teamAScore: 180,
    teamBScore: 124,
    winningTeam: 0,
    bidAmount: 170,
    bidderName: 'Rusaith',
    isMarleyOrCap: false,
  },
  {
    id: 'm_hist_2',
    roomName: 'Weekend Championship',
    roomCode: 'X9B42L',
    date: 'Yesterday at 9:30 PM',
    teamAPlayers: ['Rusaith', 'Ahmed'],
    teamBPlayers: ['Kavin', 'Nathan'],
    teamAScore: 304,
    teamBScore: 0,
    winningTeam: 0,
    bidAmount: 200,
    bidderName: 'Ahmed',
    isMarleyOrCap: true,
  },
];

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      matches: DEFAULT_MATCHES,

      addMatchRecord: (record) => {
        const newMatch: MatchRecord = {
          ...record,
          id: `match_${Date.now()}`,
        };
        set((state) => ({
          matches: [newMatch, ...state.matches],
        }));
      },

      clearHistory: () => set({ matches: [] }),
    }),
    {
      name: '304_match_history',
    }
  )
);
