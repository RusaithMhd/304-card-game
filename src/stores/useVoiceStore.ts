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
  requestMicPermission: (seat?: number) => Promise<boolean>;
  toggleMute: (forceState?: boolean, seat?: number) => void;
  setPttActive: (active: boolean, seat?: number) => void;
  togglePushToTalk: (enabled?: boolean) => void;
  setPlayerVolume: (userId: string, volume: number) => void;
  setSpeakingState: (seat: number, speaking: boolean) => void;
  toggleVoicePanel: (isOpen?: boolean) => void;
}

let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let mediaStreamSource: MediaStreamAudioSourceNode | null = null;
let mediaStream: MediaStream | null = null;
let mediaRecorder: MediaRecorder | null = null;
let vadTimer: any = null;
let voiceAudioChannel: BroadcastChannel | null = null;

function getActiveRoomCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const code = sessionStorage.getItem('304_active_room_code');
    if (code) return code;
    const rawRoom = sessionStorage.getItem('304_current_room');
    if (rawRoom) {
      const parsed = JSON.parse(rawRoom);
      if (parsed?.roomCode) return parsed.roomCode;
      if (parsed?.room_code) return parsed.room_code;
    }
  } catch (e) {}
  return null;
}

function getLocalSeat(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const savedSeat = sessionStorage.getItem('304_saved_local_seat');
    if (savedSeat !== null) return parseInt(savedSeat, 10) || 0;
  } catch (e) {}
  return 0;
}

function initVoiceAudioReceiver() {
  if (typeof window === 'undefined') return;
  const roomCode = getActiveRoomCode();
  if (!roomCode) return;

  if (voiceAudioChannel) {
    try { voiceAudioChannel.close(); } catch (e) {}
  }

  try {
    voiceAudioChannel = new BroadcastChannel(`304_voice_stream_${roomCode}`);
    voiceAudioChannel.onmessage = async (event) => {
      const data = event.data;
      if (data && data.type === 'VOICE_AUDIO_CHUNK' && data.seat !== undefined && data.chunk) {
        const localSeat = getLocalSeat();
        if (data.seat === localSeat) return; // Don't play back own mic to prevent local feedback echo

        try {
          const blob = new Blob([data.chunk], { type: data.mimeType || 'audio/webm;codecs=opus' });
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audio.volume = 1.0;
          
          useVoiceStore.getState().setSpeakingState(data.seat, true);
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            useVoiceStore.getState().setSpeakingState(data.seat, false);
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            useVoiceStore.getState().setSpeakingState(data.seat, false);
          };

          await audio.play().catch(() => {});
        } catch (e) {}
      }
    };
  } catch (e) {}
}

function broadcastSpeakingState(seat: number, isSpeaking: boolean) {
  const roomCode = getActiveRoomCode();
  if (roomCode && typeof window !== 'undefined') {
    try {
      const channel = new BroadcastChannel(`304_chat_${roomCode}`);
      channel.postMessage({ type: 'VOICE_SPEAKING_UPDATE', seat, isSpeaking });
      channel.close();
    } catch (e) {}
  }
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  permissionState: 'none',
  isMuted: false,
  isPushToTalkEnabled: false,
  isPttActive: false,
  isSpeakingMap: { 0: false, 1: false, 2: false, 3: false },
  playerVolumes: {},
  isVoicePanelOpen: false,

  requestMicPermission: async (providedSeat) => {
    set({ permissionState: 'requesting' });
    try {
      if (typeof window !== 'undefined' && navigator.mediaDevices) {
        mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        set({ permissionState: 'allowed', isMuted: false });

        // 1. Initialize Web Audio API Real-time Voice Activity Detection
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            if (audioContext && audioContext.state !== 'closed') {
              audioContext.close();
            }
            audioContext = new AudioCtx();
            analyserNode = audioContext.createAnalyser();
            analyserNode.fftSize = 512;
            mediaStreamSource = audioContext.createMediaStreamSource(mediaStream);
            mediaStreamSource.connect(analyserNode);

            const bufferLength = analyserNode.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            if (vadTimer) clearInterval(vadTimer);
            vadTimer = setInterval(() => {
              const state = get();
              const currentSeat = providedSeat !== undefined ? providedSeat : getLocalSeat();
              if (state.isMuted || state.permissionState !== 'allowed') {
                if (state.isSpeakingMap[currentSeat]) {
                  set((s) => ({ isSpeakingMap: { ...s.isSpeakingMap, [currentSeat]: false } }));
                  broadcastSpeakingState(currentSeat, false);
                }
                return;
              }

              if (analyserNode) {
                analyserNode.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                  sum += dataArray[i];
                }
                const averageVolume = sum / bufferLength;
                const isSpeakingNow = averageVolume > 15;

                if (state.isSpeakingMap[currentSeat] !== isSpeakingNow) {
                  set((s) => ({ isSpeakingMap: { ...s.isSpeakingMap, [currentSeat]: isSpeakingNow } }));
                  broadcastSpeakingState(currentSeat, isSpeakingNow);
                }
              }
            }, 150);
          }
        } catch (vadErr) {
          console.warn('[VAD INIT WARN]', vadErr);
        }

        // 2. Initialize MediaRecorder audio chunk broadcasting for live audio playback
        try {
          const roomCode = getActiveRoomCode();
          if (roomCode) {
            initVoiceAudioReceiver();
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
              ? 'audio/ogg;codecs=opus'
              : 'audio/webm';

            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
            mediaRecorder = new MediaRecorder(mediaStream, { mimeType });
            mediaRecorder.ondataavailable = async (e) => {
              const state = get();
              if (e.data.size > 0 && !state.isMuted && state.permissionState === 'allowed') {
                const currentSeat = providedSeat !== undefined ? providedSeat : getLocalSeat();
                const arrayBuffer = await e.data.arrayBuffer();
                if (voiceAudioChannel) {
                  voiceAudioChannel.postMessage({
                    type: 'VOICE_AUDIO_CHUNK',
                    seat: currentSeat,
                    chunk: arrayBuffer,
                    mimeType,
                  });
                }
              }
            };
            mediaRecorder.start(250);
          }
        } catch (recErr) {
          console.warn('[RECORDER INIT WARN]', recErr);
        }

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

  toggleMute: (forceState, providedSeat) => {
    const seat = providedSeat !== undefined ? providedSeat : getLocalSeat();
    set((state) => {
      const nextMuted = forceState !== undefined ? forceState : !state.isMuted;
      const updatedSpeaking = { ...state.isSpeakingMap, [seat]: nextMuted ? false : state.isSpeakingMap[seat] };
      broadcastSpeakingState(seat, nextMuted ? false : !!updatedSpeaking[seat]);
      return {
        isMuted: nextMuted,
        isSpeakingMap: updatedSpeaking,
      };
    });
  },

  setPttActive: (active, providedSeat) => {
    const seat = providedSeat !== undefined ? providedSeat : getLocalSeat();
    set({ isPttActive: active, isMuted: !active });
    broadcastSpeakingState(seat, active);
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
