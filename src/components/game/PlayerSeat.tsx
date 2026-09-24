'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PlayerState } from '../../lib/game-engine/types';
import { clsx } from 'clsx';
import { Shield, Mic } from 'lucide-react';

interface PlayerSeatProps {
  player: PlayerState;
  isTurn: boolean;
  isDealer: boolean;
  isSpeaking?: boolean;
  position: 'south' | 'east' | 'north' | 'west';
  isMe?: boolean;
}

export const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isTurn,
  isDealer,
  isSpeaking = false,
  position,
  isMe = false,
}) => {
  const isTeamA = player.team === 0;
  const teamColorClass = isTeamA ? 'border-amber-400 text-amber-300' : 'border-emerald-400 text-emerald-300';
  const teamBadgeBg = isTeamA
    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

  // Position-specific container positioning
  const positionClasses = {
    north: 'top-2 sm:top-4 left-1/2 -translate-x-1/2 flex-col items-center',
    south: 'bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex-col items-center',
    west: 'left-2 sm:left-4 top-1/2 -translate-y-1/2 flex-row items-center gap-2',
    east: 'right-2 sm:right-4 top-1/2 -translate-y-1/2 flex-row-reverse items-center gap-2',
  }[position];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={clsx('absolute z-30 flex select-none pointer-events-none', positionClasses)}
    >
      {/* Player Avatar Container */}
      <div className="relative group">
        <div
          className={clsx(
            'w-11 h-11 sm:w-14 sm:h-14 rounded-full border-2 p-0.5 bg-slate-950 transition-all duration-300 shadow-xl flex items-center justify-center relative overflow-hidden',
            teamColorClass,
            isTurn && 'ring-4 ring-amber-400/90 shadow-amber-500/50 shadow-2xl scale-105'
          )}
        >
          {/* Avatar Image */}
          <img
            src={player.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.seat}`}
            alt={player.name}
            className="w-full h-full rounded-full object-cover bg-slate-900"
          />

          {/* Turn Overlay Pulse Glow */}
          {isTurn && (
            <div className="absolute inset-0 rounded-full bg-amber-400/10 animate-ping pointer-events-none" />
          )}
        </div>

        {/* Dealer Badge (D) */}
        {isDealer && (
          <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500 border border-slate-950 text-slate-950 font-black text-[9px] sm:text-[10px] flex items-center justify-center shadow-md">
            D
          </div>
        )}

        {/* Voice Speaking Mic Badge */}
        {isSpeaking && (
          <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border border-slate-950 text-slate-950 flex items-center justify-center shadow-md animate-bounce">
            <Mic className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        )}
      </div>

      {/* Player Identity Info Panel */}
      <div
        className={clsx(
          'flex flex-col max-w-[96px] sm:max-w-[130px]',
          position === 'west' ? 'items-start text-left' : position === 'east' ? 'items-end text-right' : 'items-center text-center'
        )}
      >
        <div className="flex items-center gap-1 flex-wrap justify-center">
          <span className="font-black text-xs sm:text-sm text-slate-100 truncate drop-shadow-md">
            {isMe ? 'YOU' : player.name}
          </span>
        </div>

        {/* Team Pill & Status Badge */}
        <div className="flex items-center gap-1 mt-0.5">
          <span
            className={clsx(
              'px-1.5 py-0.2 rounded-full border font-bold text-[9px] sm:text-[10px] uppercase tracking-wide shadow-sm',
              teamBadgeBg
            )}
          >
            {isTeamA ? '• A' : '• B'}
          </span>

          {/* Turn Text Status (Accessibility + Clarity) */}
          {isTurn && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] sm:text-[10px] uppercase tracking-wider animate-pulse shadow-md">
              TURN
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
