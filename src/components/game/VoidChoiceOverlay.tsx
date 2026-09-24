'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Suit } from '../../lib/game-engine/types';
import { SUIT_SYMBOLS } from '../../lib/game-engine/cardValues';
import { Lock, Megaphone, Dices } from 'lucide-react';

interface VoidChoiceOverlayProps {
  isOpen: boolean;
  leadSuit: Suit | null;
  isTrumpMaker: boolean;
  onChooseOption: (option: 'USE_TRUMP' | 'FLIP_CARD' | 'REVEAL_TRUMP') => void;
}

export const VoidChoiceOverlay: React.FC<VoidChoiceOverlayProps> = ({
  isOpen,
  leadSuit,
  isTrumpMaker,
  onChooseOption,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            className="bg-slate-900 border-2 border-amber-500/80 p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />

            <h3 className="text-sm font-black text-amber-400 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
              <span>YOU DON'T HAVE {leadSuit ? SUIT_SYMBOLS[leadSuit] : ''}</span>
            </h3>
            <p className="text-xs text-slate-300 font-bold tracking-wide mb-6">
              CHOOSE YOUR PLAY
            </p>

            <div className="flex flex-col gap-3">
              {/* USE TRUMP option is strictly reserved for the Trump Maker */}
              {isTrumpMaker ? (
                <button
                  onClick={() => onChooseOption('USE_TRUMP')}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black text-sm uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4 stroke-[3]" />
                  <span>USE TRUMP (MY TRUMP CARD)</span>
                </button>
              ) : (
                <button
                  onClick={() => onChooseOption('REVEAL_TRUMP')}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-slate-950 font-black text-sm uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  <Megaphone className="w-4 h-4 fill-current" />
                  <span>REVEAL TRUMP TO ALL</span>
                </button>
              )}

              <button
                onClick={() => onChooseOption('FLIP_CARD')}
                className="w-full py-3 rounded-2xl bg-slate-800 border border-slate-600 text-slate-100 font-black text-sm uppercase tracking-wider hover:bg-slate-700 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <Dices className="w-4 h-4" />
                <span>FLIP A CARD</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
