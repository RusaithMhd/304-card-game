import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  message: string;
  timestamp: string;
}

export interface FloatingReaction {
  id: string;
  seat: number;
  emoji: string;
}

interface ChatStore {
  messages: ChatMessage[];
  unreadCount: number;
  isChatOpen: boolean;
  activeReactions: FloatingReaction[];
  sendMessage: (senderId: string, senderName: string, senderAvatar: string, text: string) => void;
  sendReaction: (seat: number, emoji: string) => void;
  syncRoomMessages: (incoming: ChatMessage[]) => void;
  toggleChat: (isOpen?: boolean) => void;
  clearUnread: () => void;
}

export const QUICK_REACTIONS = ['😂', '😮', '👏', '🔥', '👍', '😅', 'GG'];

function getActiveRoomCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const code = sessionStorage.getItem('304_active_room_code');
    if (code) return code;
    const rawRoom = sessionStorage.getItem('304_current_room');
    if (rawRoom) {
      const parsed = JSON.parse(rawRoom);
      if (parsed?.roomCode) return parsed.roomCode;
    }
  } catch (e) {}
  return null;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [
    {
      id: 'm1',
      sender_id: 'usr_kavin',
      sender_name: 'Kavin',
      sender_avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=kavin',
      message: 'Ready for 304! Good luck everyone 🔥',
      timestamp: '12:00 PM',
    },
  ],
  unreadCount: 0,
  isChatOpen: false,
  activeReactions: [],

  sendMessage: (senderId, senderName, senderAvatar, text) => {
    if (!text.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar,
      message: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set((state) => ({
      messages: state.messages.some((m) => m.id === newMsg.id) ? state.messages : [...state.messages, newMsg],
      unreadCount: state.isChatOpen ? 0 : state.unreadCount + 1,
    }));

    const roomCode = getActiveRoomCode();
    if (roomCode) {
      // 1. Broadcast to local tabs/windows
      try {
        const channel = new BroadcastChannel(`304_chat_${roomCode}`);
        channel.postMessage({ type: 'CHAT_MESSAGE', message: newMsg });
        channel.close();
      } catch (e) {}

      // 2. Persist to server API
      try {
        fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'send_chat', roomCode, message: newMsg }),
        });
      } catch (e) {}
    }
  },

  sendReaction: (seat, emoji) => {
    const reactionId = `react_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newReaction: FloatingReaction = { id: reactionId, seat, emoji };

    set((state) => ({
      activeReactions: [...state.activeReactions, newReaction],
    }));

    const roomCode = getActiveRoomCode();
    if (roomCode) {
      try {
        const channel = new BroadcastChannel(`304_chat_${roomCode}`);
        channel.postMessage({ type: 'FLOATING_REACTION', reaction: newReaction });
        channel.close();
      } catch (e) {}
    }

    // Auto cleanup reaction after 2.5 seconds
    setTimeout(() => {
      set((state) => ({
        activeReactions: state.activeReactions.filter((r) => r.id !== reactionId),
      }));
    }, 2500);
  },

  syncRoomMessages: (incoming) => {
    if (!incoming || incoming.length === 0) return;
    set((state) => {
      const existingIds = new Set(state.messages.map((m) => m.id));
      const newMessages = incoming.filter((m) => !existingIds.has(m.id));
      if (newMessages.length === 0) return state;

      return {
        messages: [...state.messages, ...newMessages],
        unreadCount: state.isChatOpen ? 0 : state.unreadCount + newMessages.length,
      };
    });
  },

  toggleChat: (isOpen) => {
    set((state) => {
      const nextOpen = isOpen !== undefined ? isOpen : !state.isChatOpen;
      return {
        isChatOpen: nextOpen,
        unreadCount: nextOpen ? 0 : state.unreadCount,
      };
    });
  },

  clearUnread: () => set({ unreadCount: 0 }),
}));
