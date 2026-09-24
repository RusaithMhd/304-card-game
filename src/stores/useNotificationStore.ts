import { create } from 'zustand';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number; // ms, default 4000
}

interface NotificationStore {
  notifications: NotificationItem[];
  addNotification: (item: Omit<NotificationItem, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],

  addNotification: (item) => {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const duration = item.duration ?? 4500;

    const newItem: NotificationItem = {
      ...item,
      id,
      duration,
    };

    set((state) => ({
      notifications: [newItem, ...state.notifications.slice(0, 4)], // Keep at most 5 active toasts
    }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      }, duration);
    }

    return id;
  },

  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  clearAll: () => set({ notifications: [] }),
}));

// Quick helper utilities for components and stores
export const notify = {
  success: (message: string, title?: string) =>
    useNotificationStore.getState().addNotification({ type: 'success', title, message }),
  error: (message: string, title?: string) =>
    useNotificationStore.getState().addNotification({ type: 'error', title, message }),
  warning: (message: string, title?: string) =>
    useNotificationStore.getState().addNotification({ type: 'warning', title, message }),
  info: (message: string, title?: string) =>
    useNotificationStore.getState().addNotification({ type: 'info', title, message }),
};
