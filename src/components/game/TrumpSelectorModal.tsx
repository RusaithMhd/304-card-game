'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, Suit } from '../../lib/game-engine/types';
import { PlayingCard } from '../cards/PlayingCard';
import { SUIT_NAMES, SUIT_SYMBOLS } from '../../lib/game-engine/cardValues';

interface TrumpSelectorModalProps {
  isMyTurnToSelect: boolean;
  bidderName: string;
  winningBid: number;
  playerCards?: Card[];
  onSelectTrumpCard: (cardId: string, mode: 'OPEN' | 'CLOSED') => void;
}

export const TrumpSelectorModal: React.FC<TrumpSelectorModalProps> = ({
  isMyTurnToSelect,
  bidderName,
  winningBid,
  playerCards = [],
  onSelectTrumpCard,
}) => {
  const [selectedCardId, setSelectedCardId] = useState<string>(playerCards[0]?.id || '');
  const [mode, setMode] = useState<'OPEN' | 'CLOSED'>('CLOSED'); // Default priority CLOSED

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

  const selectedCard = playerCards.find((c) => c.id === (selectedCardId || playerCards[0]?.id));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-x-4 top-20 z-50 max-w-lg mx-auto bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-5 shadow-2xl text-center text-slate-100"
    >
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">Select Trump Indicator Card</span>
        <span className="text-xs text-slate-400">Winning Bid: {winningBid}</span>
      </div>

      <p className="text-xs text-slate-300 mb-4">
        Select one physical card from your hand to serve as the Trump Indicator. Its suit will become the Trump suit.
      </p>

      {/* Cards Selection Row */}
      <div className="flex items-center justify-center gap-2 mb-5 overflow-x-auto p-2 bg-slate-950/70 rounded-2xl border border-slate-800">
        {playerCards.map((card) => {
          const isSelected = selectedCard?.id === card.id;

          return (
            <div
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
              className={`cursor-pointer transition-all transform hover:-translate-y-1 ${
                isSelected ? 'scale-105 ring-4 ring-amber-400 rounded-xl shadow-lg' : 'opacity-80 hover:opacity-100'
              }`}
            >
              <PlayingCard card={card} size="sm" isSelected={isSelected} />
            </div>
          );
        })}
      </div>

      {selectedCard && (
        <div className="mb-4 text-xs font-semibold text-amber-300">
          Selected: <span className="font-bold text-white">{selectedCard.rank} of {SUIT_NAMES[selectedCard.suit]} ({SUIT_SYMBOLS[selectedCard.suit]})</span>
        </div>
      )}

      {/* Mode Selection: Open vs Closed Trump (Default CLOSED) */}
      <div className="flex items-center bg-slate-950/80 rounded-xl p-1 mb-5 border border-slate-800">
        <button
          onClick={() => setMode('CLOSED')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            mode === 'CLOSED' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🔒 CLOSED TRUMP (PRIORITY)
        </button>
        <button
          onClick={() => setMode('OPEN')}
          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
            mode === 'OPEN' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🔓 OPEN TRUMP
        </button>
      </div>

      <button
        disabled={!selectedCard}
        onClick={() => selectedCard && onSelectTrumpCard(selectedCard.id, mode)}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-yellow-300 transition-all cursor-pointer disabled:opacity-50"
      >
        CONFIRM TRUMP CARD ({selectedCard ? `${selectedCard.rank}${SUIT_SYMBOLS[selectedCard.suit]}` : ''} - {mode})
      </button>
    </motion.div>
  );
};

