import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserProfile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  games_played: number;
  games_won: number;
}

interface AuthStore {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  loginAsGuest: (username: string, displayName?: string, avatarUrl?: string) => void;
  logout: () => void;
}

export const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=rusaith',
  'https://api.dicebear.com/7.x/bottts/svg?seed=kavin',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ahmed',
  'https://api.dicebear.com/7.x/bottts/svg?seed=sajith',
  'https://api.dicebear.com/7.x/bottts/svg?seed=champion',
  'https://api.dicebear.com/7.x/bottts/svg?seed=legend',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ace',
  'https://api.dicebear.com/7.x/bottts/svg?seed=joker',
];

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: {
        id: 'usr_default_host',
        username: 'rusaith',
        display_name: 'Rusaith (Host)',
        avatar_url: AVATAR_OPTIONS[0],
        games_played: 12,
        games_won: 8,
      },
      isAuthenticated: true,
      isLoading: false,

      setUser: (user) => set({ user, isAuthenticated: !!user }),

      updateProfile: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      loginAsGuest: (username, displayName, avatarUrl) => {
        const cleanName = username.trim() || 'Player_' + Math.floor(1000 + Math.random() * 9000);
        const newUser: UserProfile = {
          id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          username: cleanName.toLowerCase().replace(/\s+/g, '_'),
          display_name: displayName || cleanName,
          avatar_url: avatarUrl || AVATAR_OPTIONS[Math.floor(Math.random() * AVATAR_OPTIONS.length)],
          games_played: 0,
          games_won: 0,
        };
        set({ user: newUser, isAuthenticated: true });
      },

      logout: () => set({ user: null, isAuthenticated: false }),
    }),
    {
      name: '304_auth_storage',
    }
  )
);
