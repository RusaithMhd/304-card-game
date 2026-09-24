'use client';

import React from 'react';
import { Eye, Megaphone, Lock } from 'lucide-react';
import { GameEngineState } from '../../lib/game-engine/types';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../../lib/game-engine/cardValues';

interface TrumpStatusProps {
  gameState: GameEngineState;
  userSeat: number;
  canManageTrump: boolean;
  onSeeTrump: () => void;
  onRevealTrump: () => void;
}

export const TrumpStatus: React.FC<TrumpStatusProps> = ({
  gameState,
  userSeat,
  canManageTrump,
  onSeeTrump,
  onRevealTrump,
}) => {
  const trumpMakerSeat = gameState.honestGamePlacedBySeat ?? gameState.bidding.bidderSeat;
  const trumpMakerPlayer = trumpMakerSeat !== undefined && trumpMakerSeat !== null ? gameState.players[trumpMakerSeat] : null;

  // 1. CLOSED TRUMP STATE
  if (gameState.trumpMode === 'CLOSED' && !gameState.trumpRevealed) {
    return (
      <div className="absolute top-2 left-2 sm:top-3 sm:left-4 z-30 flex flex-col items-start gap-1 max-w-[140px] sm:max-w-[180px]">
        {/* Closed Trump Badge */}
        <div className="px-2.5 py-1 rounded-xl bg-slate-950/90 border border-amber-500/50 flex items-center gap-1.5 shadow-xl">
          <div className="w-4 h-6 rounded bg-gradient-to-br from-amber-700 to-amber-950 border border-amber-400/80 flex items-center justify-center text-[9px] text-amber-200 shrink-0">
            🂠
          </div>
          <div className="flex flex-col text-[8px] sm:text-[9px] leading-tight truncate">
            <span className="font-extrabold text-amber-400 truncate flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              CLOSED TRUMP
            </span>
            <span className="text-slate-300 font-bold truncate">
              {trumpMakerPlayer ? `MAKER: ${trumpMakerPlayer.name}` : `BID: ${gameState.bidding.currentHighBid}`}
            </span>
          </div>
        </div>

        {/* TRUMP MAKER ONLY: SEE TRUMP (Private Peek) & REVEAL TRUMP (Public Reveal) */}
        {canManageTrump ? (
          <div className="flex items-center gap-1 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSeeTrump();
              }}
              className="px-2 py-0.5 rounded-lg bg-amber-500/20 border border-amber-400/60 hover:bg-amber-500/30 text-amber-300 font-extrabold text-[8px] uppercase tracking-wider flex items-center gap-1 cursor-pointer active:scale-95"
              title="Peek at your secret trump card privately (hidden from other players)"
            >
              <Eye className="w-2.5 h-2.5 stroke-[3]" />
              <span>SEE TRUMP</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRevealTrump();
              }}
              className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-slate-950 font-black text-[8px] uppercase tracking-wider shadow-md hover:brightness-110 flex items-center gap-1 cursor-pointer active:scale-95"
              title="Reveal trump suit to all players on the table"
            >
              <Megaphone className="w-2.5 h-2.5 fill-current" />
              <span>REVEAL TRUMP</span>
            </button>
          </div>
        ) : (
          /* NON-TRUMP MAKERS: Passive non-blocking status pill ONLY */
          <div className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/60 text-[8px] font-bold text-slate-400 flex items-center gap-1">
            <span>Waiting for Trump Maker to reveal...</span>
          </div>
        )}
      </div>
    );
  }

  // 2. REVEALED / OPEN TRUMP STATE
  if (gameState.trumpSuit && (gameState.trumpMode === 'OPEN' || gameState.trumpRevealed)) {
    return (
      <div className="absolute top-2 left-2 sm:top-3 sm:left-4 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-amber-500/50 text-[9px] font-bold text-slate-200 flex items-center gap-1.5 shadow-xl z-30">
        <span className="text-[8px] sm:text-[9px] text-amber-400 font-extrabold uppercase">TRUMP:</span>
        <span className={`text-base sm:text-lg font-black ${SUIT_COLORS[gameState.trumpSuit] === 'red' ? 'text-rose-500' : 'text-slate-100'}`}>
          {SUIT_SYMBOLS[gameState.trumpSuit]}
        </span>
        <span className="text-[8px] sm:text-[9px] text-slate-400 border-l border-slate-800 pl-1.5">
          BID: {gameState.bidding.currentHighBid}
        </span>
      </div>
    );
  }

  return null;
};
