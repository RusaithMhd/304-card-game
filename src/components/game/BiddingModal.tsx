'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MIN_BID, MAX_BID, BID_STEP } from '../../lib/game-engine/bidding';

interface BiddingModalProps {
  currentHighBid: number;
  bidderName?: string;
  isMyTurnToBid: boolean;
  onPlaceBid: (amount: number) => void;
  onPass: () => void;
  onDeclareHonestGame?: () => void;
}

export const BiddingModal: React.FC<BiddingModalProps> = ({
  currentHighBid,
  bidderName,
  isMyTurnToBid,
  onPlaceBid,
  onPass,
  onDeclareHonestGame,
}) => {
  const minAllowed = currentHighBid > 0 ? Math.ceil((currentHighBid + 1) / BID_STEP) * BID_STEP : MIN_BID;
  const [selectedBid, setSelectedBid] = useState<number>(minAllowed);

  if (!isMyTurnToBid) {
    return (
      <div className="fixed inset-x-4 top-20 z-40 max-w-sm mx-auto bg-slate-900/90 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-2xl text-center">
        <h4 className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">Bidding Phase</h4>
        <p className="text-slate-200 text-sm font-medium">
          Waiting for bidding... {currentHighBid > 0 ? `Current Bid: ${currentHighBid} (${bidderName})` : 'No bids placed yet.'}
        </p>
      </div>
    );
  }

  const bidOptions: number[] = [];
  for (let b = Math.max(MIN_BID, minAllowed); b <= MAX_BID; b += BID_STEP) {
    bidOptions.push(b);
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-x-4 top-20 z-50 max-w-md mx-auto bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-5 shadow-2xl text-center text-slate-100"
    >
      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
        <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">Your Turn To Bid</span>
        <span className="text-xs text-slate-400 font-medium">Target: 304 Points</span>
      </div>

      <p className="text-xs text-slate-300 mb-3">
        {currentHighBid > 0
          ? `Current highest bid is ${currentHighBid} by ${bidderName}.`
          : 'Place an opening bid (minimum 160) or Pass.'}
      </p>

      {/* Honest Game Special Bid Option */}
      {onDeclareHonestGame && (
        <button
          onClick={onDeclareHonestGame}
          className="w-full mb-3 py-2 rounded-xl bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-slate-950 font-black text-xs uppercase tracking-wider hover:brightness-110 shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
        >
          <span>🔥 DECLARE HONEST GAME (250+ COMMITMENT)</span>
        </button>
      )}

      {/* Bid selector grid */}
      <div className="grid grid-cols-4 gap-2 mb-4 max-h-36 overflow-y-auto pr-1">
        {bidOptions.map((amount) => (
          <button
            key={amount}
            onClick={() => setSelectedBid(amount)}
            className={`py-2 rounded-xl font-bold text-xs transition-all ${
              selectedBid === amount
                ? 'bg-amber-500 text-slate-950 shadow-md scale-105 ring-2 ring-amber-300'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {amount}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onPass}
          className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700 transition-all cursor-pointer"
        >
          PASS
        </button>

        <button
          onClick={() => onPlaceBid(selectedBid)}
          className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-yellow-300 transition-all cursor-pointer"
        >
          BID {selectedBid}
        </button>
      </div>
    </motion.div>
  );
};
