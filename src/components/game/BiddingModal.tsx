'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MIN_BID, MIN_BID_8_CARD, MAX_BID, BID_STEP, getMinimumBidForPlayer } from '../../lib/game-engine/bidding';
import { RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';

interface BiddingModalProps {
  currentHighBid: number;
  bidderName?: string;
  isMyTurnToBid: boolean;
  bidStage?: '4_CARD' | '8_CARD';
  isPartnerHighBidder?: boolean;
  playerTurnCount?: number;
  isRedealEligible?: boolean;
  onPlaceBid: (amount: number) => void;
  onPass: () => void;
  onRequestRedeal?: () => void;
  onSkipRedeal?: () => void;
  onDeclarePartnerCloseCaps?: () => void;
  onDeclareHonestGame?: () => void;
}

export const BiddingModal: React.FC<BiddingModalProps> = ({
  currentHighBid,
  bidderName,
  isMyTurnToBid,
  bidStage = '4_CARD',
  isPartnerHighBidder = false,
  playerTurnCount = 0,
  isRedealEligible = false,
  onPlaceBid,
  onPass,
  onRequestRedeal,
  onSkipRedeal,
  onDeclarePartnerCloseCaps,
  onDeclareHonestGame,
}) => {
  const minAllowed = getMinimumBidForPlayer(bidStage, currentHighBid, isPartnerHighBidder, playerTurnCount);
  const [selectedBid, setSelectedBid] = useState<number>(minAllowed);

  useEffect(() => {
    setSelectedBid(minAllowed);
  }, [minAllowed]);

  if (isRedealEligible) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-x-4 top-20 z-50 max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-5 shadow-2xl text-center text-slate-100"
      >
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
          <span className="text-amber-400 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>Weak Hand Redeal Option</span>
          </span>
          <span className="text-xs text-slate-400">Hand &lt; 15 Pts</span>
        </div>
        <p className="text-xs text-slate-300 mb-4">
          You are the player to the dealer's right and your initial 4 cards total less than 15 points. You may demand a redeal before making a bid or pass!
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={onSkipRedeal}
            className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
          >
            CONTINUE WITH HAND
          </button>
          <button
            onClick={onRequestRedeal}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-yellow-300 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>REQUEST REDEAL</span>
          </button>
        </div>
      </motion.div>
    );
  }

  if (!isMyTurnToBid) {
    return (
      <div className="fixed inset-x-4 top-14 z-40 max-w-xs mx-auto bg-slate-900/90 backdrop-blur-md border border-amber-500/30 rounded-full px-4 py-2 shadow-xl text-center flex items-center justify-center gap-2 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
        <span className="text-slate-200 text-xs font-bold truncate">
          {currentHighBid > 0
            ? `BID: ${currentHighBid} (${bidderName || 'Player'})`
            : `${bidStage === '8_CARD' ? '8-CARD' : '4-CARD'} BIDDING...`}
        </span>
      </div>
    );
  }

  const bidOptions: number[] = [];
  for (let b = minAllowed; b <= MAX_BID; b += BID_STEP) {
    bidOptions.push(b);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      className="fixed inset-x-0 bottom-0 top-auto sm:top-20 sm:bottom-auto z-50 max-w-lg mx-auto bg-slate-900/98 backdrop-blur-xl border-t sm:border border-amber-500/40 rounded-t-3xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl text-center text-slate-100 max-h-[85vh] overflow-y-auto"
    >
      {/* Mobile Top Drag Indicator */}
      <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <span className="text-amber-400 font-extrabold text-xs uppercase tracking-widest flex items-center gap-1.5">
          <span>{bidStage === '8_CARD' ? '8-Card Bidding Turn' : 'Initial 4-Card Bidding Turn'}</span>
        </span>
        <span className="text-[10px] sm:text-xs text-slate-400 font-semibold bg-slate-800/80 px-2 py-0.5 rounded-full">
          Min Bid: <strong className="text-amber-300">{minAllowed}</strong>
        </span>
      </div>

      <p className="text-xs text-slate-300 mb-3 leading-tight">
        {currentHighBid > 0
          ? `Current high bid: ${currentHighBid} (${bidderName}). Your bid must be at least ${minAllowed}.`
          : bidStage === '8_CARD'
          ? 'Place an 8-card bid (minimum 250) or Pass.'
          : 'Place an opening 4-card bid (minimum 160) or Pass.'}
      </p>

      {/* Special Bid Buttons */}
      <div className="flex flex-col gap-2 mb-3">
        {bidStage === '8_CARD' && onDeclarePartnerCloseCaps && (
          <button
            onClick={onDeclarePartnerCloseCaps}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 text-white font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>🔥 DECLARE PARTNER CLOSE CAPS (304)</span>
          </button>
        )}

        {onDeclareHonestGame && (
          <button
            onClick={onDeclareHonestGame}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span>🔥 DECLARE HONEST GAME (250+ COMMITMENT)</span>
          </button>
        )}
      </div>

      {/* Bid selector grid */}
      {isPartnerHighBidder && bidStage === '8_CARD' ? (
        <div className="p-3 mb-3 bg-slate-950/80 rounded-xl border border-slate-800 text-amber-400 text-xs font-bold">
          Your partner holds the highest bid ({currentHighBid}). Under 8-card bidding rules, you must pass!
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 sm:gap-2 mb-4 max-h-36 overflow-y-auto pr-1">
          {bidOptions.map((amount) => {
            const isLegal = amount >= minAllowed;

            return (
              <button
                key={amount}
                disabled={!isLegal}
                onClick={() => setSelectedBid(amount)}
                className={`py-2.5 rounded-xl font-bold text-xs transition-all touch-manipulation min-h-[44px] ${
                  !isLegal
                    ? 'bg-slate-900/50 text-slate-600 border border-slate-800 cursor-not-allowed line-through opacity-40'
                    : selectedBid === amount
                    ? 'bg-amber-500 text-slate-950 shadow-md scale-105 ring-2 ring-amber-300 font-extrabold'
                    : 'bg-slate-800 text-slate-200 hover:bg-slate-700 active:scale-95'
                }`}
              >
                {amount}
              </button>
            );
          })}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center gap-3 pt-1 border-t border-slate-800/80">
        <button
          onClick={onPass}
          className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer active:scale-95 min-h-[44px]"
        >
          PASS
        </button>

        {!(isPartnerHighBidder && bidStage === '8_CARD') && (
          <button
            disabled={selectedBid < minAllowed}
            onClick={() => onPlaceBid(selectedBid)}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-yellow-300 transition-all cursor-pointer disabled:opacity-50 active:scale-95 min-h-[44px]"
          >
            BID {selectedBid}
          </button>
        )}
      </div>
    </motion.div>
  );
};

