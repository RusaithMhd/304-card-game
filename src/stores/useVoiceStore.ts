import { create } from 'zustand';

export type MicPermissionState = 'none' | 'requesting' | 'allowed' | 'denied';

interface VoiceStore {
  permissionState: MicPermissionState;
  isMuted: boolean;
  isPushToTalkEnabled: boolean;
  isPttActive: boolean;
  isSpeakingMap: Record<number, boolean>; // seat -> isSpeaking
  playerVolumes: Record<string, number>; // userId -> volume 0.0 to 1.0
  isVoicePanelOpen: boolean;
  
  // Actions
  requestMicPermission: () => Promise<boolean>;
  toggleMute: (forceState?: boolean) => void;
  setPttActive: (active: boolean) => void;
  togglePushToTalk: (enabled?: boolean) => void;
  setPlayerVolume: (userId: string, volume: number) => void;
  setSpeakingState: (seat: number, speaking: boolean) => void;
  toggleVoicePanel: (isOpen?: boolean) => void;
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  permissionState: 'none',
  isMuted: false,
  isPushToTalkEnabled: false,
  isPttActive: false,
  isSpeakingMap: { 0: false, 1: false, 2: false, 3: false },
  playerVolumes: {},
  isVoicePanelOpen: false,

  requestMicPermission: async () => {
    set({ permissionState: 'requesting' });
    try {
      if (typeof window !== 'undefined' && navigator.mediaDevices) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Permission granted
        set({ permissionState: 'allowed', isMuted: false });

        // Simulate voice activity detection on local stream
        setInterval(() => {
          const isSpeaking = !get().isMuted && Math.random() > 0.65;
          set((state) => ({
            isSpeakingMap: { ...state.isSpeakingMap, 0: isSpeaking },
          }));
        }, 1200);

        return true;
      }
      set({ permissionState: 'denied' });
      return false;
    } catch (err) {
      console.warn('Microphone permission error:', err);
      set({ permissionState: 'denied' });
      return false;
    }
  },

  toggleMute: (forceState) => {
    set((state) => {
      const nextMuted = forceState !== undefined ? forceState : !state.isMuted;
      return {
        isMuted: nextMuted,
        isSpeakingMap: { ...state.isSpeakingMap, 0: nextMuted ? false : state.isSpeakingMap[0] },
      };
    });
  },

  setPttActive: (active) => {
    set({ isPttActive: active, isMuted: !active });
  },

  togglePushToTalk: (enabled) => {
    set((state) => ({
      isPushToTalkEnabled: enabled !== undefined ? enabled : !state.isPushToTalkEnabled,
      isMuted: enabled ? true : state.isMuted,
    }));
  },

  setPlayerVolume: (userId, volume) => {
    set((state) => ({
      playerVolumes: { ...state.playerVolumes, [userId]: Math.max(0, Math.min(1, volume)) },
    }));
  },

  setSpeakingState: (seat, speaking) => {
    set((state) => ({
      isSpeakingMap: { ...state.isSpeakingMap, [seat]: speaking },
    }));
  },

  toggleVoicePanel: (isOpen) => {
    set((state) => ({
      isVoicePanelOpen: isOpen !== undefined ? isOpen : !state.isVoicePanelOpen,
    }));
  },
}));
