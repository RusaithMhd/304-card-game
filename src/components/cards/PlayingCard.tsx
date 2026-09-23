'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../../lib/game-engine/types';
import { SUIT_SYMBOLS, SUIT_COLORS, CARD_VALUES } from '../../lib/game-engine/cardValues';
import { clsx } from 'clsx';

interface PlayingCardProps {
  card?: Card;
  faceDown?: boolean;
  isSelected?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  isWinningCard?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  faceDown = false,
  isSelected = false,
  isDisabled = false,
  isInvalid = false,
  isWinningCard = false,
  size = 'md',
  onClick,
  className,
}) => {
  // Dimensions based on size
  const sizeClasses = {
    sm: 'w-12 h-16 text-xs rounded-md',
    md: 'w-16 h-24 sm:w-20 sm:h-28 text-sm rounded-lg',
    lg: 'w-20 h-28 sm:w-24 sm:h-36 text-base rounded-xl',
  }[size];

  if (faceDown || !card) {
    return (
      <motion.div
        whileHover={!isDisabled ? { y: -4, scale: 1.02 } : undefined}
        onClick={!isDisabled ? onClick : undefined}
        className={clsx(
          sizeClasses,
          'relative border border-emerald-700/50 bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-900 card-shadow flex items-center justify-center overflow-hidden cursor-pointer select-none',
          isDisabled && 'opacity-60 cursor-not-allowed',
          className
        )}
      >
        {/* Card Back Decorative Pattern */}
        <div className="absolute inset-1 border border-amber-500/30 rounded-md bg-[radial-gradient(#2d5e4b_1px,transparent_1px)] [background-size:8px_8px] flex items-center justify-center opacity-80">
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-amber-400/40 flex items-center justify-center bg-emerald-950/80">
            <span className="text-amber-400 font-bold text-[10px] sm:text-xs tracking-tighter">304</span>
          </div>
        </div>
      </motion.div>
    );
  }

  const isRed = SUIT_COLORS[card.suit] === 'red';
  const points = CARD_VALUES[card.rank] ?? 0;

  return (
    <motion.div
      layout
      whileHover={!isDisabled ? { y: isSelected ? -18 : -10, scale: 1.04 } : undefined}
      whileTap={!isDisabled ? { scale: 0.96 } : undefined}
      animate={
        isInvalid
          ? { x: [-6, 6, -6, 6, 0], transition: { duration: 0.3 } }
          : { y: isSelected ? -16 : 0 }
      }
      onClick={!isDisabled ? onClick : undefined}
      className={clsx(
        sizeClasses,
        'relative bg-slate-50 text-slate-900 border border-slate-300 card-shadow transition-shadow flex flex-col justify-between p-1.5 cursor-pointer select-none overflow-hidden',
        isSelected && 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-slate-900 card-shadow-hover',
        isWinningCard && 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-900 shadow-emerald-500/50 shadow-lg',
        isDisabled && 'opacity-50 cursor-not-allowed grayscale',
        className
      )}
    >
      {/* Top Left Rank & Suit */}
      <div className="flex flex-col items-center leading-none self-start">
        <span className={clsx('font-black tracking-tight', isRed ? 'text-rose-600' : 'text-slate-900')}>
          {card.rank}
        </span>
        <span className={clsx('text-xs sm:text-sm', isRed ? 'text-rose-600' : 'text-slate-900')}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>

      {/* Center Large Suit Icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-85 pointer-events-none">
        <span className={clsx('text-2xl sm:text-4xl font-serif', isRed ? 'text-rose-600' : 'text-slate-900')}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>

      {/* 304 Card Points Badge */}
      {points > 0 && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded bg-amber-100 border border-amber-300 shadow-sm flex items-center justify-center">
          <span className="text-[9px] sm:text-[10px] font-bold text-amber-900 leading-none">
            {points} pts
          </span>
        </div>
      )}

      {/* Bottom Right Rank & Suit (Inverted) */}
      <div className="flex flex-col items-center leading-none self-end rotate-180">
        <span className={clsx('font-black tracking-tight', isRed ? 'text-rose-600' : 'text-slate-900')}>
          {card.rank}
        </span>
        <span className={clsx('text-xs sm:text-sm', isRed ? 'text-rose-600' : 'text-slate-900')}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>
    </motion.div>
  );
};
