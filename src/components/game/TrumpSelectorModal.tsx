'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Suit } from '../../lib/game-engine/types';
import { SUIT_SYMBOLS, SUIT_NAMES, SUIT_COLORS } from '../../lib/game-engine/cardValues';

interface TrumpSelectorModalProps {
  isMyTurnToSelect: boolean;
  bidderName: string;
  winningBid: number;
  onSelectTrump: (suit: Suit, mode: 'OPEN' | 'CLOSED') => void;
}

export const TrumpSelectorModal: React.FC<TrumpSelectorModalProps> = ({
  isMyTurnToSelect,
  bidderName,
  winningBid,
  onSelectTrump,
}) => {
  const [selectedSuit, setSelectedSuit] = useState<Suit>('H');
  const [mode, setMode] = useState<'OPEN' | 'CLOSED'>('OPEN');

  if (!isMyTurnToSelect) {
    return (
      <div className="fixed inset-x-4 top-20 z-40 max-w-sm mx-auto bg-slate-900/90 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-2xl text-center">
        <h4 className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">Trump Selection</h4>
        <p className="text-slate-200 text-sm font-medium">
          {bidderName} won bid ({winningBid}). Waiting for trump selection...
        </p>
      </div>
    );
  }

  const suits: Suit[] = ['H', 'D', 'C', 'S'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-x-4 top-20 z-50 max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-5 shadow-2xl text-center text-slate-100"
    >
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">Select Trump Suit</span>
        <span className="text-xs text-slate-400">Winning Bid: {winningBid}</span>
      </div>

      <p className="text-xs text-slate-300 mb-4">
        You won the bid! Choose the Trump suit for this round.
      </p>

      {/* Suit Options Grid */}
      <div className="grid grid-cols-4 gap-2.5 mb-5">
        {suits.map((suit) => {
          const isRed = SUIT_COLORS[suit] === 'red';
          const isSelected = selectedSuit === suit;

          return (
            <button
              key={suit}
              onClick={() => setSelectedSuit(suit)}
              className={`p-3 rounded-2xl flex flex-col items-center justify-center border transition-all cursor-pointer ${isSelected
                  ? 'bg-slate-800 border-amber-400 ring-2 ring-amber-400 shadow-lg scale-105'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                }`}
            >
              <span className={`text-3xl mb-1 ${isRed ? 'text-rose-500' : 'text-slate-100'}`}>
                {SUIT_SYMBOLS[suit]}
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase">{SUIT_NAMES[suit]}</span>
            </button>
          );
        })}
      </div>

      {/* Mode Selection: Open vs Closed Trump */}
      <div className="flex items-center bg-slate-950/80 rounded-xl p-1 mb-5 border border-slate-800">
        <button
          onClick={() => setMode('OPEN')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'OPEN' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          OPEN TRUMP
        </button>
        <button
          onClick={() => setMode('CLOSED')}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'CLOSED' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
        >
          CLOSED TRUMP
        </button>
      </div>

      <button
        onClick={() => onSelectTrump(selectedSuit, mode)}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-yellow-300 transition-all cursor-pointer"
      >
        CONFIRM TRUMP ({SUIT_NAMES[selectedSuit]} - {mode})
      </button>
    </motion.div>
  );
};
