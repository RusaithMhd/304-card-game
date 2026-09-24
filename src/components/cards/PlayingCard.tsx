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
  // Dimensions based on size optimized for clear visibility & legibility on all viewports
  const sizeClasses = {
    sm: 'w-12 h-18 min-w-[48px] sm:w-16 sm:h-22 text-xs sm:text-sm rounded-lg',
    md: 'w-[clamp(52px,14vw,76px)] h-[clamp(76px,20vw,108px)] sm:w-20 sm:h-28 text-xs sm:text-sm rounded-xl min-w-[52px]',
    lg: 'w-20 h-28 min-w-[80px] sm:w-24 sm:h-36 text-sm sm:text-base rounded-2xl',
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
        'relative bg-slate-50 text-slate-900 border border-slate-300 card-shadow transition-all flex flex-col justify-between p-1 sm:p-1.5 cursor-pointer select-none overflow-hidden',
        isSelected && 'ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-950 card-shadow-hover scale-105 z-30',
        isWinningCard && 'ring-2 ring-emerald-400 ring-offset-2 ring-offset-slate-950 shadow-emerald-500/50 shadow-lg',
        isDisabled && 'cursor-not-allowed brightness-95 border-slate-300/70 opacity-90',
        className
      )}
    >
      {/* Top Left Rank & Suit */}
      <div className="flex flex-col items-center leading-none self-start z-10">
        <span className={clsx('font-black tracking-tight text-xs sm:text-sm', isRed ? 'text-rose-600' : 'text-slate-900')}>
          {card.rank}
        </span>
        <span className={clsx('text-xs sm:text-sm leading-none', isRed ? 'text-rose-600' : 'text-slate-900')}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>

      {/* Center Large Suit Icon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-85 pointer-events-none">
        <span className={clsx('text-2xl sm:text-4xl font-serif', isRed ? 'text-rose-600' : 'text-slate-900')}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>

      {/* 304 Card Points Badge (Positioned safely at bottom-center without overlapping rank/suit) */}
      {points > 0 && (
        <div
          className="absolute bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[8px] sm:text-[9px] shadow-md border border-amber-500/80 flex items-center justify-center leading-none z-20 whitespace-nowrap"
        >
          <span>{points}pt{points > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Bottom Right Rank & Suit (Inverted, positioned safely inside card boundaries) */}
      <div className="flex flex-col items-center leading-none self-end rotate-180 z-10 pb-0.5">
        <span className={clsx('font-black tracking-tight text-xs sm:text-sm', isRed ? 'text-rose-600' : 'text-slate-900')}>
          {card.rank}
        </span>
        <span className={clsx('text-xs sm:text-sm leading-none', isRed ? 'text-rose-600' : 'text-slate-900')}>
          {SUIT_SYMBOLS[card.suit]}
        </span>
      </div>
    </motion.div>
  );
};
