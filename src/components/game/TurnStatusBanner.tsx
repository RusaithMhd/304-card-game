'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface TurnStatusBannerProps {
  isMyTurn: boolean;
  currentTurnPlayerName?: string;
  lastActionMessage?: string;
}

export const TurnStatusBanner: React.FC<TurnStatusBannerProps> = ({
  isMyTurn,
  currentTurnPlayerName,
  lastActionMessage,
}) => {
  return (
    <div className="absolute top-[76px] sm:top-20 inset-x-0 flex flex-col items-center justify-center pointer-events-none z-20 px-2">
      <motion.div
        key={isMyTurn ? 'my_turn' : currentTurnPlayerName}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-center"
      >
        {isMyTurn ? (
          <div className="px-3 sm:px-4 py-1 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl flex items-center gap-1.5 animate-pulse border border-amber-300">
            <span>⭐ YOUR TURN • SELECT A CARD TO PLAY</span>
          </div>
        ) : (
          <div className="px-3 sm:px-4 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-200 font-extrabold text-[10px] sm:text-xs tracking-wide shadow-md flex items-center gap-1.5 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              {currentTurnPlayerName ? `${currentTurnPlayerName.toUpperCase()} IS PLAYING...` : 'WAITING FOR PLAY...'}
            </span>
          </div>
        )}

        {/* Action Message Ticker */}
        {lastActionMessage && (
          <span className="text-[9px] sm:text-[10px] text-amber-300/80 font-bold mt-1 max-w-xs truncate text-center drop-shadow">
            {lastActionMessage}
          </span>
        )}
      </motion.div>
    </div>
  );
};
