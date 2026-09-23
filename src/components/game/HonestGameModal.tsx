'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Flame, X, Check } from 'lucide-react';

interface HonestGameModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const HonestGameModal: React.FC<HonestGameModalProps> = ({
  isOpen,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-slate-900 border-2 border-amber-500/80 p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden select-none"
        >
          {/* Top Decorative Banner */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />

          {/* Badge Icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center mb-4 shadow-inner">
            <Flame className="w-8 h-8 text-amber-400 fill-amber-400/20 animate-bounce" />
          </div>

          <h3 className="text-xl font-black text-amber-400 tracking-wide uppercase mb-1">
            HONEST GAME
          </h3>
          <p className="text-xs font-extrabold text-amber-300/80 uppercase tracking-widest mb-4">
            250+ POINT COMMITMENT
          </p>

          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs leading-relaxed font-semibold mb-6">
            Your team commits to scoring <span className="text-amber-400 font-bold">at least 250 points</span> out of 304.
            You will get the right to select the Trump. Normal 304 game rules remain unchanged.
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-700 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <X className="w-4 h-4" />
              <span>CANCEL</span>
            </button>

            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>CONFIRM</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
