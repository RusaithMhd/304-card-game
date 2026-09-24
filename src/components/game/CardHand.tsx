'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, Suit } from '../../lib/game-engine/types';
import { PlayingCard } from '../cards/PlayingCard';
import { getLegalCards } from '../../lib/game-engine/trickRules';
import { Eye, LayoutGrid, Layers } from 'lucide-react';

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
  // Toggle for Hand View Mode: Fan vs Spread (View All)
  const [isSpreadView, setIsSpreadView] = useState(false);

  const legalCards = isMyTurn
    ? isGambleSelectMode || isTrumpSelectMode
      ? cards // All cards selectable for gamble flip or trump selection!
      : getLegalCards(cards, leadSuit, trumpSuit, trumpRevealed)
    : [];

  const handleCardClick = (card: Card) => {
    const isLegal = legalCards.some((c) => c.id === card.id);
    if (!isMyTurn || !isLegal) {
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
    <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center px-1">
      {/* Control Banner & Mode Toggle */}
      <div className="w-full flex items-center justify-between gap-2 px-3 mb-1.5 z-30">
        {/* Left: Mode Prompts */}
        <div className="flex items-center gap-1.5">
          {isTrumpSelectMode && isMyTurn && (
            <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/70 text-amber-300 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider shadow-lg animate-bounce flex items-center gap-1.5">
              <span>🃏 TAP A CARD FROM YOUR HAND TO SELECT TRUMP</span>
            </div>
          )}
          {isGambleSelectMode && isMyTurn && !isTrumpSelectMode && (
            <div className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 font-extrabold text-[10px] sm:text-xs uppercase tracking-wider shadow-lg animate-pulse flex items-center gap-1.5">
              <span>🃏 SELECT ONE CARD TO GAMBLE FLIP</span>
            </div>
          )}
          {!isTrumpSelectMode && !isGambleSelectMode && (
            <span className="text-[10px] sm:text-xs font-bold text-slate-400">
              YOUR HAND ({cards.length})
            </span>
          )}
        </div>

        {/* Right: View All / Spread Cards Toggle Button */}
        <button
          onClick={() => setIsSpreadView(!isSpreadView)}
          className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-amber-400 hover:text-amber-300 hover:bg-slate-850 text-[10px] sm:text-xs font-extrabold flex items-center gap-1 shadow-md transition-all cursor-pointer active:scale-95 shrink-0"
          title={isSpreadView ? 'Switch to Compact Fan View' : 'Spread out all cards to see every detail clearly'}
        >
          {isSpreadView ? (
            <>
              <Layers className="w-3 h-3 text-amber-400" />
              <span>FAN VIEW</span>
            </>
          ) : (
            <>
              <LayoutGrid className="w-3 h-3 text-amber-400" />
              <span>SPREAD / SEE CARDS</span>
            </>
          )}
        </button>
      </div>

      {/* Play Action Button when card selected */}
      {isMyTurn && selectedCardId && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: -4, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          className="mb-2 z-40"
        >
          <button
            onClick={() => onPlayCard(selectedCardId)}
            className="px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs sm:text-sm shadow-xl hover:from-amber-400 hover:to-yellow-300 transition-all flex items-center gap-2 cursor-pointer active:scale-95 border border-amber-300"
          >
            <span>{isGambleSelectMode ? 'FLIP THIS CARD 🃏' : 'PLAY CARD'}</span>
            <span className="text-[10px] bg-slate-950/20 px-2 py-0.5 rounded-full font-bold">↵</span>
          </button>
        </motion.div>
      )}

      {/* SPREAD VIEW MODE (Side-by-side grid, 100% visible, zero obscuring) */}
      {isSpreadView ? (
        <div className="w-full overflow-x-auto no-scrollbar py-2 px-2 flex items-center justify-center gap-1.5 sm:gap-2.5 max-w-full">
          <AnimatePresence>
            {cards.map((card) => {
              const isSelected = selectedCardId === card.id;
              const isLegal = !isMyTurn || legalCards.some((c) => c.id === card.id);

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: isSelected ? 1.08 : 1, y: isSelected ? -14 : 0 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  className="shrink-0 touch-manipulation"
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
      ) : (
        /* FAN VIEW MODE (Arc layout with generous spacing) */
        <div className="relative flex items-center justify-center h-24 sm:h-32 w-full px-2 max-w-full overflow-hidden">
          <AnimatePresence>
            {cards.map((card, index) => {
              const total = cards.length;
              const maxSpan = total > 6 ? 340 : 260; // Generous span so cards are clearly readable
              const step = total > 1 ? maxSpan / (total - 1) : 0;
              const xOffset = (index - (total - 1) / 2) * Math.min(step, 42);
              const angleStep = total > 6 ? 2.5 : 3.5;
              const rotation = (index - (total - 1) / 2) * angleStep;

              const isSelected = selectedCardId === card.id;
              const isLegal = !isMyTurn || legalCards.some((c) => c.id === card.id);

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 50, scale: 0.8 }}
                  animate={{
                    opacity: 1,
                    y: isSelected ? -24 : 0,
                    scale: isSelected ? 1.08 : 1,
                    rotate: isSelected ? 0 : rotation,
                    x: xOffset,
                  }}
                  exit={{ opacity: 0, y: -40, scale: 0.6 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24, delay: index * 0.02 }}
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
      )}
    </div>
  );
};
