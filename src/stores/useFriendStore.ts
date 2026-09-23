import { create } from 'zustand';

export interface Friend {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  status: 'online' | 'away' | 'offline';
  in_game: boolean;
  game_room_code?: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string;
  created_at: string;
}

interface FriendStore {
  friends: Friend[];
  pendingRequests: FriendRequest[];
  sendFriendRequest: (username: string) => boolean;
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  removeFriend: (friendId: string) => void;
}

const DEFAULT_FRIENDS: Friend[] = [
  {
    id: 'usr_kavin',
    username: 'kavin_p',
    display_name: 'Kavin',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=kavin',
    status: 'online',
    in_game: true,
    game_room_code: 'A7K29P',
  },
  {
    id: 'usr_ahmed',
    username: 'ahmed_s',
    display_name: 'Ahmed',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=ahmed',
    status: 'online',
    in_game: false,
  },
  {
    id: 'usr_sajith',
    username: 'sajith_m',
    display_name: 'Sajith',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sajith',
    status: 'away',
    in_game: false,
  },
  {
    id: 'usr_nathan',
    username: 'nathan_304',
    display_name: 'Nathan',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=nathan',
    status: 'offline',
    in_game: false,
  },
];

const DEFAULT_REQUESTS: FriendRequest[] = [
  {
    id: 'req_1',
    sender_id: 'usr_dilshan',
    sender_name: 'Dilshan',
    sender_avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=dilshan',
    created_at: '10m ago',
  },
];

export const useFriendStore = create<FriendStore>((set, get) => ({
  friends: DEFAULT_FRIENDS,
  pendingRequests: DEFAULT_REQUESTS,

  sendFriendRequest: (username) => {
    const clean = username.trim().toLowerCase();
    if (!clean) return false;
    const existing = get().friends.find((f) => f.username.toLowerCase() === clean);
    if (existing) return false;

    // Simulate sending request
    return true;
  },

  acceptRequest: (requestId) => {
    const req = get().pendingRequests.find((r) => r.id === requestId);
    if (!req) return;

    const newFriend: Friend = {
      id: req.sender_id,
      username: req.sender_name.toLowerCase(),
      display_name: req.sender_name,
      avatar_url: req.sender_avatar,
      status: 'online',
      in_game: false,
    };

    set((state) => ({
      friends: [...state.friends, newFriend],
      pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId),
    }));
  },

  declineRequest: (requestId) => {
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId),
    }));
  },

  removeFriend: (friendId) => {
    set((state) => ({
      friends: state.friends.filter((f) => f.id !== friendId),
    }));
  },
}));
