'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, Megaphone } from 'lucide-react';
import { Card, Suit } from '../../lib/game-engine/types';
import { PlayingCard } from '../cards/PlayingCard';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../../lib/game-engine/cardValues';

interface PrivateTrumpModalProps {
  isOpen: boolean;
  trumpCard: Card | null;
  trumpSuit: Suit | null;
  onClose: () => void;
  onRevealToAll: () => void;
}

export const PrivateTrumpModal: React.FC<PrivateTrumpModalProps> = ({
  isOpen,
  trumpCard,
  trumpSuit,
  onClose,
  onRevealToAll,
}) => {
  if (!isOpen) return null;

  const suit = trumpCard?.suit || trumpSuit;
  const isRed = suit ? SUIT_COLORS[suit] === 'red' : false;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-slate-900 border-2 border-amber-500/80 p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
        >
          {/* Top Decorative Line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Badge */}
          <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center mb-3 shadow-inner">
            <Eye className="w-6 h-6 text-amber-400" />
          </div>

          <h3 className="text-lg font-black text-amber-400 tracking-wide uppercase mb-1">
            YOUR PRIVATE TRUMP CARD
          </h3>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-4">
            CONFIDENTIAL — VISIBLE ONLY TO YOU
          </p>

          {/* Display Card Preview */}
          <div className="flex flex-col items-center justify-center my-4 p-4 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner">
            {trumpCard ? (
              <div className="scale-110 my-2">
                <PlayingCard card={trumpCard} isSelected={false} size="lg" />
              </div>
            ) : suit ? (
              <div className="flex flex-col items-center gap-1 my-2">
                <span className={`text-4xl font-black ${isRed ? 'text-rose-500' : 'text-slate-100'}`}>
                  {SUIT_SYMBOLS[suit]}
                </span>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Trump Suit: {suit}
                </span>
              </div>
            ) : null}

            <p className="text-[11px] text-slate-400 font-semibold mt-3 text-center">
              🔒 This Trump card is currently hidden from all other players.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 mt-4">
            <button
              onClick={() => {
                onRevealToAll();
                onClose();
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2 active:scale-95"
            >
              <Megaphone className="w-4 h-4 fill-current" />
              <span>REVEAL TRUMP TO EVERYONE</span>
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-700 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>KEEP TRUMP HIDDEN</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
