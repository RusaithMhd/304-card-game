'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Suit } from '../../lib/game-engine/types';
import { SUIT_SYMBOLS, SUIT_NAMES, SUIT_COLORS } from '../../lib/game-engine/cardValues';
import { PlayingCard } from '../cards/PlayingCard';
import { Check, RefreshCw } from 'lucide-react';

interface TrumpCardSelectorConfirmModalProps {
  selectedCard: Card | null;
  winningBid: number;
  mode: 'OPEN' | 'CLOSED';
  onModeChange: (mode: 'OPEN' | 'CLOSED') => void;
  onChangeCard: () => void;
  onConfirmTrump: () => void;
}

export const TrumpCardSelectorConfirmModal: React.FC<TrumpCardSelectorConfirmModalProps> = ({
  selectedCard,
  winningBid,
  mode,
  onModeChange,
  onChangeCard,
  onConfirmTrump,
}) => {
  if (!selectedCard) return null;

  const suitName = SUIT_NAMES[selectedCard.suit];
  const suitSymbol = SUIT_SYMBOLS[selectedCard.suit];
  const isRed = SUIT_COLORS[selectedCard.suit] === 'red';

  return (
    <AnimatePresence>
      <div className="fixed inset-x-4 top-20 z-50 max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border border-amber-500/50 rounded-3xl p-5 shadow-2xl text-center text-slate-100 select-none">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-extrabold text-xs uppercase tracking-widest">
            SELECTED TRUMP CARD
          </span>
          <span className="text-xs text-slate-400 font-bold">BID: {winningBid}</span>
        </div>

        {/* Selected Card Visual Preview & Derived Suit */}
        <div className="flex items-center justify-center gap-4 my-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
          <PlayingCard card={selectedCard} isSelected size="md" />

          <div className="text-left flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
              DERIVED TRUMP SUIT:
            </span>
            <span className={`text-2xl font-black flex items-center gap-1.5 ${isRed ? 'text-rose-500' : 'text-slate-100'}`}>
              <span className="text-3xl">{suitSymbol}</span>
              <span>{suitName}</span>
            </span>
            <span className="text-[10px] text-amber-400 font-semibold mt-1">
              Card: {selectedCard.rank} of {suitName}
            </span>
          </div>
        </div>

        {/* Mode Selector: Open vs Closed Trump (Default CLOSED) */}
        <div className="flex items-center bg-slate-950 rounded-xl p-1 mb-5 border border-slate-800">
          <button
            onClick={() => onModeChange('CLOSED')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              mode === 'CLOSED'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔒 CLOSED TRUMP (PRIORITY)
          </button>
          <button
            onClick={() => onModeChange('OPEN')}
            className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
              mode === 'OPEN'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            🔓 OPEN TRUMP
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onChangeCard}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>CHANGE CARD</span>
          </button>

          <button
            onClick={onConfirmTrump}
            className="flex-[1.5] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>CONFIRM TRUMP</span>
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
};
