'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { useNotificationStore, NotificationItem } from '../../stores/useNotificationStore';

const iconMap = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
  error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
  info: <Info className="w-5 h-5 text-cyan-400 shrink-0" />,
};

const borderMap = {
  success: 'border-emerald-500/40 bg-emerald-950/40 text-emerald-100',
  error: 'border-rose-500/40 bg-rose-950/40 text-rose-100',
  warning: 'border-amber-500/40 bg-amber-950/40 text-amber-100',
  info: 'border-cyan-500/40 bg-cyan-950/40 text-cyan-100',
};

const barMap = {
  success: 'bg-emerald-400',
  error: 'bg-rose-400',
  warning: 'bg-amber-400',
  info: 'bg-cyan-400',
};

export const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotificationStore();

  return (
    <div className="fixed top-4 right-4 sm:right-6 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0">
      <AnimatePresence mode="sync">
        {notifications.map((n) => (
          <ToastCard key={n.id} notification={n} onClose={() => removeNotification(n.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
};

const ToastCard: React.FC<{ notification: NotificationItem; onClose: () => void }> = ({
  notification,
  onClose,
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`pointer-events-auto relative overflow-hidden rounded-2xl border backdrop-blur-xl p-3.5 shadow-2xl flex items-start gap-3 ${
        borderMap[notification.type]
      }`}
    >
      {iconMap[notification.type]}

      <div className="flex-1 pr-2">
        {notification.title && (
          <h4 className="text-xs font-black uppercase tracking-wider mb-0.5">{notification.title}</h4>
        )}
        <p className="text-xs font-medium text-slate-200 leading-snug">{notification.message}</p>
      </div>

      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/60 transition-all cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Timer Bar */}
      <motion.div
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: (notification.duration || 4500) / 1000, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-0.5 ${barMap[notification.type]}`}
      />
    </motion.div>
  );
};
