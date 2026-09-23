'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Suit } from '../../lib/game-engine/types';
import { PlayingCard } from '../cards/PlayingCard';
import { getLegalCards } from '../../lib/game-engine/trickRules';

interface CardHandProps {
  cards: Card[];
  selectedCardId: string | null;
  isMyTurn: boolean;
  leadSuit: Suit | null;
  trumpSuit: Suit | null;
  trumpRevealed: boolean;
  isGambleSelectMode?: boolean;
  isTrumpSelectMode?: boolean;
  onSelectCard: (cardId: string) => void;
  onPlayCard: (cardId: string) => void;
}

export const CardHand: React.FC<CardHandProps> = ({
  cards,
  selectedCardId,
  isMyTurn,
  leadSuit,
  trumpSuit,
  trumpRevealed,
  isGambleSelectMode = false,
  isTrumpSelectMode = false,
  onSelectCard,
  onPlayCard,
}) => {
  const legalCards = isMyTurn
    ? (isGambleSelectMode || isTrumpSelectMode)
      ? cards // All cards selectable for gamble flip or trump selection!
      : getLegalCards(cards, leadSuit, trumpSuit, trumpRevealed)
    : [];

  const handleCardClick = (card: Card) => {
    if (!isMyTurn) return;

    const isLegal = legalCards.some((c) => c.id === card.id);
    if (!isLegal) {
      onSelectCard(card.id);
      return;
    }

    if (isTrumpSelectMode) {
      onSelectCard(card.id);
    } else if (selectedCardId === card.id) {
      onPlayCard(card.id);
    } else {
      onSelectCard(card.id);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto flex flex-col items-center">
      {/* Trump Select Mode Prompt Banner */}
      {isTrumpSelectMode && isMyTurn && (
        <div className="mb-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/70 text-amber-300 font-extrabold text-xs uppercase tracking-wider shadow-lg animate-bounce flex items-center gap-2">
          <span>🃏 TAP A CARD FROM YOUR HAND TO SELECT TRUMP</span>
        </div>
      )}

      {/* Gamble Select Mode Prompt Banner */}
      {isGambleSelectMode && isMyTurn && !isTrumpSelectMode && (
        <div className="mb-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 font-extrabold text-xs uppercase tracking-wider shadow-lg animate-pulse flex items-center gap-2">
          <span>🃏 SELECT ONE CARD TO GAMBLE FLIP</span>
        </div>
      )}

      {/* Play Action Button when card selected */}
      {isMyTurn && selectedCardId && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: -8, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          className="mb-2 z-30"
        >
          <button
            onClick={() => onPlayCard(selectedCardId)}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-sm shadow-lg hover:from-amber-400 hover:to-yellow-300 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <span>{isGambleSelectMode ? 'FLIP THIS CARD 🃏' : 'PLAY CARD'}</span>
            <span className="text-xs bg-slate-950/20 px-2 py-0.5 rounded-full font-bold">↵</span>
          </button>
        </motion.div>
      )}

      {/* Fan layout of cards */}
      <div className="relative flex items-center justify-center h-24 sm:h-32 w-full px-2 max-w-full overflow-hidden">
        <AnimatePresence>
          {cards.map((card, index) => {
            const total = cards.length;
            // Dynamic arc rotation & overlap offset calculation based on card count & mobile screen constraint
            const maxSpan = total > 6 ? 260 : 200; // max horizontal span in px for small mobile
            const step = total > 1 ? maxSpan / (total - 1) : 0;
            const xOffset = (index - (total - 1) / 2) * Math.min(step, 32);
            const angleStep = total > 6 ? 3 : 4;
            const rotation = (index - (total - 1) / 2) * angleStep;

            const isSelected = selectedCardId === card.id;
            const isLegal = !isMyTurn || legalCards.some((c) => c.id === card.id);

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 50, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1, rotate: rotation, x: xOffset }}
                exit={{ opacity: 0, y: -40, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24, delay: index * 0.03 }}
                className="absolute touch-manipulation"
                style={{ zIndex: isSelected ? 40 : index + 10 }}
              >
                <PlayingCard
                  card={card}
                  isSelected={isSelected}
                  isDisabled={!isMyTurn || !isLegal}
                  size="md"
                  onClick={() => handleCardClick(card)}
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
