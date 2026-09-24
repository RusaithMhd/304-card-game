'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Lock, Globe, Users, Play } from 'lucide-react';
import { useRoomStore } from '../../stores/useRoomStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: () => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const [name, setName] = useState('Friday Night 304');
  const [isPrivate, setIsPrivate] = useState(true);
  const { createRoom } = useRoomStore();
  const { user } = useAuthStore();

  if (!isOpen) return null;

  const currentUser = user || {
    id: `guest_${Date.now()}`,
    display_name: 'Guest Player',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=guest',
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRoom(name, isPrivate, {
      id: currentUser.id,
      name: currentUser.display_name,
      avatar: currentUser.avatar_url,
    });
    onRoomCreated();
    onClose();
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
            <Users className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-slate-100">Create Private Room</h3>
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
              Room Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friday Night 304"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Privacy Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  isPrivate
                    ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <span className="block text-xs font-bold">Private</span>
                  <span className="text-[10px] text-slate-400">Invite Code Only</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`p-3 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                  !isPrivate
                    ? 'bg-amber-500/10 border-amber-400 text-amber-300 ring-1 ring-amber-400'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Globe className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <span className="block text-xs font-bold">Public</span>
                  <span className="text-[10px] text-slate-400">Listed in Lobby</span>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-yellow-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>CREATE ROOM & ENTER TABLE</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
