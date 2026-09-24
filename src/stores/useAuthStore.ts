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
  listenerInitialized: boolean;

  initializeAuth: () => Promise<void>;
  signUp: (email: string, pass: string, username: string, displayName: string) => Promise<boolean>;
  signIn: (email: string, pass: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<boolean>;
  clearError: () => void;
}

function buildUserFromSupabaseSession(sessionUser: any, profile: any): UserProfile {
  const metadata = sessionUser.user_metadata || {};
  const emailPrefix = sessionUser.email ? sessionUser.email.split('@')[0] : 'player';
  const username = profile?.username || metadata.username || emailPrefix;
  const displayName = profile?.display_name || metadata.display_name || (username.charAt(0).toUpperCase() + username.slice(1));
  const avatarUrl = profile?.avatar_url || metadata.avatar_url || AVATAR_OPTIONS[0];

  return {
    id: sessionUser.id,
    username,
    displayName,
    display_name: displayName,
    avatarUrl,
    avatar_url: avatarUrl,
    bio: profile?.bio || metadata.bio,
    country: profile?.country || metadata.country,
    role: profile?.role || metadata.role || 'USER',
    isOnline: true,
    gamesPlayed: profile?.games_played || 0,
    games_played: profile?.games_played || 0,
    gamesWon: profile?.games_won || 0,
    games_won: profile?.games_won || 0,
    gamesLost: profile?.games_lost || 0,
    games_lost: profile?.games_lost || 0,
    tokensWon: profile?.tokens_won || 0,
    tokensLost: profile?.tokens_lost || 0,
    winStreak: profile?.win_streak || 0,
    bestWinStreak: profile?.best_win_streak || 0,
  };
}

function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, ms: number = 1500): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Auth request timeout')), ms)
    ),
  ]);
}

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  user: null,
  sessionToken: null,
  isAuthenticated: false,
  isLoading: true,
  errorMessage: null,
  listenerInitialized: false,

  initializeAuth: async () => {
    set({ isLoading: true });

    // Global Auth State Change Listener (Subscribed once)
    if (!get().listenerInitialized) {
      set({ listenerInitialized: true });
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('304_local_session');
            sessionStorage.removeItem('304_active_view');
          }
          set({ user: null, sessionToken: null, isAuthenticated: false, isLoading: false });
        } else if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          let profile = null;
          try {
            const { data } = await withTimeout(
              supabase.from('profiles').select('*').eq('id', session.user.id).single(),
              1000
            );
            profile = data;
          } catch (e) {
            // ignore profile query errors
          }
          const userObj = buildUserFromSupabaseSession(session.user, profile);
          set({
            user: userObj,
            sessionToken: session.access_token,
            isAuthenticated: true,
            isLoading: false,
          });
        }
      });
    }

    try {
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 1500);

      if (session?.user) {
        let profile = null;
        try {
          const { data } = await withTimeout(
            supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single(),
            1000
          );
          profile = data;
        } catch (e) {
          // ignore profile fetch failure
        }

        const userObj = buildUserFromSupabaseSession(session.user, profile);
        set({
          user: userObj,
          sessionToken: session.access_token,
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      }
    } catch (e: any) {
      console.warn('Supabase auth session check timeout or error:', e.message);
    }

    // Check persistent fallback local session if Supabase session is not present
    if (typeof window !== 'undefined') {
      const localSaved = localStorage.getItem('304_local_session');
      if (localSaved) {
        try {
          const parsed = JSON.parse(localSaved);
          if (parsed?.user) {
            set({
              user: parsed.user,
              sessionToken: parsed.token || 'local_session_token',
              isAuthenticated: true,
              isLoading: false,
            });
            return;
          }
        } catch (err) {
          localStorage.removeItem('304_local_session');
        }
      }
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

      if (data.isFallback && data.user) {
        const mockUser: UserProfile = {
          id: data.user.id,
          username: data.user.username,
          displayName: data.user.displayName,
          display_name: data.user.displayName,
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
        const localToken = `local_token_${Date.now()}`;
        if (typeof window !== 'undefined') {
          localStorage.setItem('304_local_session', JSON.stringify({ user: mockUser, token: localToken }));
        }
        set({ user: mockUser, sessionToken: localToken, isAuthenticated: true, isLoading: false });
        return true;
      }

      return await get().signIn(email, password);
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

      if (error) {
        console.warn('Supabase signInWithPassword error:', error.status, error.message);
        if (error.message.includes('Invalid login credentials') || error.message.includes('User not found')) {
          set({ errorMessage: 'Invalid email or password. Please check your credentials or create an account.', isLoading: false });
          return false;
        }
        set({ errorMessage: error.message, isLoading: false });
        return false;
      }
    } catch (e: any) {
      console.warn('Supabase Auth network error, falling back to local session:', e.message);
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

    const localToken = `local_token_${Date.now()}`;
    if (typeof window !== 'undefined') {
      localStorage.setItem('304_local_session', JSON.stringify({ user: mockUser, token: localToken }));
    }

    set({
      user: mockUser,
      sessionToken: localToken,
      isAuthenticated: true,
      isLoading: false,
    });
    return true;
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut warning:', e);
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('304_local_session');
      sessionStorage.removeItem('304_active_view');
      sessionStorage.removeItem('304_active_room');
      sessionStorage.removeItem('304_active_game');
    }
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
      // Local optimistic update fallback
      set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null,
      }));
      return true;
    }
  },

  clearError: () => set({ errorMessage: null }),
}));
