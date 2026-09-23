'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, KeyRound, LogIn } from 'lucide-react';
import { useRoomStore } from '../../stores/useRoomStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined: () => void;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoined,
}) => {
  const [code, setCode] = useState('');
  const { joinRoomByCode } = useRoomStore();
  const { user } = useAuthStore();

  if (!isOpen || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const joined = joinRoomByCode(code, {
      id: user.id,
      name: user.display_name,
      avatar: user.avatar_url,
    });

    if (joined) {
      onJoined();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-100"
      >
        <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-slate-100">Join Room by Code</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              6-Digit Room Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. A7K29P"
              maxLength={6}
              className="w-full tracking-widest text-center text-xl font-mono uppercase bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-amber-400 focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-yellow-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>JOIN MATCH TABLE</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};
