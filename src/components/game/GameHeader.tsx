'use client';

import React from 'react';
import { ArrowLeft, Coins, MessageSquare, Volume2, VolumeX, Settings, Megaphone } from 'lucide-react';
import { GameEngineState } from '../../lib/game-engine/types';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../../lib/game-engine/cardValues';

interface GameHeaderProps {
  gameState: GameEngineState;
  unreadCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onToggleChat: () => void;
  onToggleDrawer: () => void;
  onLeaveMatch: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  gameState,
  unreadCount,
  isMuted,
  onToggleMute,
  onToggleChat,
  onToggleDrawer,
  onLeaveMatch,
}) => {
  const currentTrickNum = gameState.currentTrick?.trickNumber ?? (gameState.tricks.length + 1);
  const targetLimit = gameState.targetScore ?? 22;

  return (
    <header className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-1.5 sm:py-2 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-2 z-40 select-none">
      {/* Left Section: Leave Match & Compact Team Score */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          onClick={onLeaveMatch}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer active:scale-95 shrink-0"
          title="Leave Match"
        >
          <ArrowLeft className="w-4 h-4 sm:w-4 sm:h-4" />
        </button>

        {/* Team Score Badge */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-full shadow-md shrink-0">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-[11px] sm:text-xs font-black text-amber-400">
              A: {gameState.teamAScore}
            </span>
          </div>
          <span className="text-slate-600 font-bold text-xs">:</span>
          <div className="flex items-center gap-1">
            <span className="text-[11px] sm:text-xs font-black text-emerald-400">
              {gameState.teamBScore} :B
            </span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </div>
        </div>

        {/* Tokens indicator (Tablet/Desktop) */}
        <div
          onClick={onToggleDrawer}
          className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[11px] font-extrabold text-amber-300 cursor-pointer hover:bg-amber-500/20 transition-all"
        >
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span>TOKENS: A:{gameState.teamATokens} | B:{gameState.teamBTokens}</span>
        </div>
      </div>

      {/* Center Section: Match Status Pills (Bid, Trump, Trick) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5">
        {/* Room Code */}
        <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-400 font-black text-[10px] sm:text-xs tracking-wider uppercase shrink-0">
          304 #{gameState.roomId}
        </div>

        {/* High Bid */}
        {gameState.bidding.currentHighBid > 0 && (
          <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-200 font-extrabold text-[10px] sm:text-xs shrink-0 flex items-center gap-1">
            <span className="text-slate-400 font-medium">BID</span>
            <span className="text-amber-400 font-black">{gameState.bidding.currentHighBid}</span>
          </div>
        )}

        {/* Active Trick Count */}
        <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-200 font-extrabold text-[10px] sm:text-xs shrink-0 flex items-center gap-1">
          <span className="text-slate-400 font-medium">TRICK</span>
          <span className="text-slate-100 font-black">{Math.min(currentTrickNum, 8)}/8</span>
        </div>

        {/* Trump Quick Badge in Header */}
        <div className="px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-200 font-extrabold text-[10px] sm:text-xs shrink-0 flex items-center gap-1">
          <span className="text-slate-400 font-medium">TRUMP</span>
          {gameState.trumpRevealed || gameState.trumpMode === 'OPEN' ? (
            <span className={`font-black text-xs ${SUIT_COLORS[gameState.trumpSuit || 'H'] === 'red' ? 'text-rose-500' : 'text-slate-100'}`}>
              {SUIT_SYMBOLS[gameState.trumpSuit || 'H']}
            </span>
          ) : (
            <span className="text-amber-400 font-black">🔒 HIDDEN</span>
          )}
        </div>
      </div>

      {/* Right Section: Action Controls (Sound, Chat, Drawer) */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        <button
          onClick={onToggleMute}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer active:scale-95 shrink-0"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          onClick={onToggleChat}
          className="relative p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer active:scale-95 shrink-0"
          title="Open Chat"
        >
          <MessageSquare className="w-4 h-4 text-amber-400" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-600 text-white font-black text-[9px] animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={onToggleDrawer}
          className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer active:scale-95 shrink-0"
          title="Match Drawer"
        >
          <Settings className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </header>
  );
};
