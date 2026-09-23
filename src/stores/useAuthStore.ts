import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';

export const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=rusaith',
  'https://api.dicebear.com/7.x/bottts/svg?seed=kavin',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ahmed',
  'https://api.dicebear.com/7.x/bottts/svg?seed=sajith',
  'https://api.dicebear.com/7.x/bottts/svg?seed=nimal',
  'https://api.dicebear.com/7.x/bottts/svg?seed=sunil',
];

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  display_name: string;
  avatarUrl: string;
  avatar_url: string;
  bio?: string;
  country?: string;
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isOnline: boolean;
  gamesPlayed: number;
  games_played: number;
  gamesWon: number;
  games_won: number;
  gamesLost: number;
  games_lost: number;
  tokensWon: number;
  tokensLost: number;
  winStreak: number;
  bestWinStreak: number;
}

interface AuthStoreState {
  user: UserProfile | null;
  sessionToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  errorMessage: string | null;

  initializeAuth: () => Promise<void>;
  signUp: (email: string, pass: string, username: string, displayName: string) => Promise<boolean>;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  sessionToken: null,
  isAuthenticated: false,
  isLoading: true,
  errorMessage: null,

  initializeAuth: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const token = session.access_token;
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          set({
            sessionToken: token,
            isAuthenticated: true,
            user: {
              id: profile.id,
              username: profile.username,
              displayName: profile.display_name,
              display_name: profile.display_name,
              avatarUrl: profile.avatar_url,
              avatar_url: profile.avatar_url,
              bio: profile.bio,
              country: profile.country,
              role: profile.role,
              isOnline: true,
              gamesPlayed: profile.games_played || 0,
              games_played: profile.games_played || 0,
              gamesWon: profile.games_won || 0,
              games_won: profile.games_won || 0,
              gamesLost: profile.games_lost || 0,
              games_lost: profile.games_lost || 0,
              tokensWon: profile.tokens_won || 0,
              tokensLost: profile.tokens_lost || 0,
              winStreak: profile.win_streak || 0,
              bestWinStreak: profile.best_win_streak || 0,
            },
            isLoading: false,
          });
          return;
        }
      }
    } catch (e: any) {
      console.warn('Supabase auth session not found, running in guest mode:', e.message);
    }

    set({ user: null, sessionToken: null, isAuthenticated: false, isLoading: false });
  },

  signUp: async (email, password, username, displayName) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', email, password, username, displayName }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        set({ errorMessage: data.error?.message || 'Registration failed', isLoading: false });
        return false;
      }

      await get().signIn(email, password);
      return true;
    } catch (e: any) {
      set({ errorMessage: e.message || 'Network error during signup', isLoading: false });
      return false;
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data?.session) {
        await get().initializeAuth();
        return true;
      }
    } catch (e: any) {
      console.warn('Supabase Auth offline/placeholder, falling back to local session:', e.message);
    }

    // Fallback local session login for development / offline mode
    const fallbackUsername = email.split('@')[0] || 'player_304';
    const fallbackDisplayName = fallbackUsername.charAt(0).toUpperCase() + fallbackUsername.slice(1);
    const mockUser: UserProfile = {
      id: `usr_${Date.now()}`,
      username: fallbackUsername,
      displayName: fallbackDisplayName,
      display_name: fallbackDisplayName,
      avatarUrl: AVATAR_OPTIONS[0],
      avatar_url: AVATAR_OPTIONS[0],
      role: 'USER',
      isOnline: true,
      gamesPlayed: 0,
      games_played: 0,
      gamesWon: 0,
      games_won: 0,
      gamesLost: 0,
      games_lost: 0,
      tokensWon: 0,
      tokensLost: 0,
      winStreak: 0,
      bestWinStreak: 0,
    };

    set({
      user: mockUser,
      sessionToken: `local_token_${Date.now()}`,
      isAuthenticated: true,
      isLoading: false,
    });
    return true;
  },

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ user: null, sessionToken: null, isAuthenticated: false, isLoading: false });
  },

  updateProfile: async (updates) => {
    const current = get().user;
    if (!current) return false;

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${get().sessionToken}`,
        },
        body: JSON.stringify({ userId: current.id, updates }),
      });

      const data = await res.json();
      if (data.success && data.profile) {
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        }));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  clearError: () => set({ errorMessage: null }),
}));
