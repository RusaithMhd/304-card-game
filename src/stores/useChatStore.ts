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
  toggleChat: (isOpen?: boolean) => void;
  clearUnread: () => void;
}

export const QUICK_REACTIONS = ['😂', '😮', '👏', '🔥', '👍', '😅', 'GG'];

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
      id: `msg_${Date.now()}`,
      sender_id: senderId,
      sender_name: senderName,
      sender_avatar: senderAvatar,
      message: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    set((state) => ({
      messages: [...state.messages, newMsg],
      unreadCount: state.isChatOpen ? 0 : state.unreadCount + 1,
    }));
  },

  sendReaction: (seat, emoji) => {
    const reactionId = `react_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
    const newReaction: FloatingReaction = { id: reactionId, seat, emoji };

    set((state) => ({
      activeReactions: [...state.activeReactions, newReaction],
    }));

    // Auto cleanup reaction after 2.5 seconds
    setTimeout(() => {
      set((state) => ({
        activeReactions: state.activeReactions.filter((r) => r.id !== reactionId),
      }));
    }, 2500);
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
