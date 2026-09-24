'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, AlertTriangle, CheckCircle, Play } from 'lucide-react';

interface FinishGameConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFinish: () => void;
}

export const FinishGameConfirmModal: React.FC<FinishGameConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirmFinish,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 15 }}
        className="w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center text-slate-100 relative overflow-hidden"
      >
        {/* Glow Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500" />

        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400">
          <Trophy className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-black text-amber-400 uppercase tracking-wide mb-2">
          Finish Game?
        </h3>

        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          The target has been reached. Are you sure you want to finish this game?
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onClose}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <Play className="w-4 h-4 text-slate-400" />
            <span>Continue Playing</span>
          </button>

          <button
            onClick={() => {
              onConfirmFinish();
              onClose();
            }}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
          >
            <CheckCircle className="w-4 h-4 text-slate-950" />
            <span>Finish Game</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
