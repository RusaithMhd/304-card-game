'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameEngineState, PlayedCard, PlayerState } from '../../lib/game-engine/types';
import { PlayingCard } from '../cards/PlayingCard';

interface TrickAreaProps {
  gameState: GameEngineState;
  getPlayedCardForSeat: (seatNumber?: number) => PlayedCard | undefined;
  relativeSeats: Record<'south' | 'east' | 'north' | 'west', PlayerState | undefined>;
}

export const TrickArea: React.FC<TrickAreaProps> = ({
  gameState,
  getPlayedCardForSeat,
  relativeSeats,
}) => {
  if (!gameState.currentTrick) return null;

  const currentTrick = gameState.currentTrick;
  const cardsPlayed = currentTrick.cardsPlayed;

  return (
    <div className="relative w-44 h-44 sm:w-60 sm:h-60 flex items-center justify-center">
      <AnimatePresence>
        {/* SOUTH PLAYED CARD (Bottom) */}
        {relativeSeats.south && getPlayedCardForSeat(relativeSeats.south.seat) && (
          <motion.div
            key={`trick_south_${relativeSeats.south.seat}`}
            initial={{ y: 80, opacity: 0, scale: 0.8 }}
            animate={{
              y: 28,
              x: 0,
              opacity: 1,
              scale: 1,
              rotateY: getPlayedCardForSeat(relativeSeats.south.seat)?.isFaceDown ? 180 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="absolute z-20"
          >
            <PlayingCard
              card={getPlayedCardForSeat(relativeSeats.south.seat)?.card}
              faceDown={getPlayedCardForSeat(relativeSeats.south.seat)?.isFaceDown}
              size="md"
              isWinningCard={currentTrick.winnerSeat === relativeSeats.south.seat}
            />
          </motion.div>
        )}

        {/* NORTH PLAYED CARD (Top) */}
        {relativeSeats.north && getPlayedCardForSeat(relativeSeats.north.seat) && (
          <motion.div
            key={`trick_north_${relativeSeats.north.seat}`}
            initial={{ y: -80, opacity: 0, scale: 0.8 }}
            animate={{
              y: -28,
              x: 0,
              opacity: 1,
              scale: 1,
              rotateY: getPlayedCardForSeat(relativeSeats.north.seat)?.isFaceDown ? 180 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="absolute z-10"
          >
            <PlayingCard
              card={getPlayedCardForSeat(relativeSeats.north.seat)?.card}
              faceDown={getPlayedCardForSeat(relativeSeats.north.seat)?.isFaceDown}
              size="md"
              isWinningCard={currentTrick.winnerSeat === relativeSeats.north.seat}
            />
          </motion.div>
        )}

        {/* WEST PLAYED CARD (Left) */}
        {relativeSeats.west && getPlayedCardForSeat(relativeSeats.west.seat) && (
          <motion.div
            key={`trick_west_${relativeSeats.west.seat}`}
            initial={{ x: -80, opacity: 0, scale: 0.8 }}
            animate={{
              x: -32,
              y: 0,
              opacity: 1,
              scale: 1,
              rotateY: getPlayedCardForSeat(relativeSeats.west.seat)?.isFaceDown ? 180 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="absolute z-15"
          >
            <PlayingCard
              card={getPlayedCardForSeat(relativeSeats.west.seat)?.card}
              faceDown={getPlayedCardForSeat(relativeSeats.west.seat)?.isFaceDown}
              size="md"
              isWinningCard={currentTrick.winnerSeat === relativeSeats.west.seat}
            />
          </motion.div>
        )}

        {/* EAST PLAYED CARD (Right) */}
        {relativeSeats.east && getPlayedCardForSeat(relativeSeats.east.seat) && (
          <motion.div
            key={`trick_east_${relativeSeats.east.seat}`}
            initial={{ x: 80, opacity: 0, scale: 0.8 }}
            animate={{
              x: 32,
              y: 0,
              opacity: 1,
              scale: 1,
              rotateY: getPlayedCardForSeat(relativeSeats.east.seat)?.isFaceDown ? 180 : 0,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="absolute z-15"
          >
            <PlayingCard
              card={getPlayedCardForSeat(relativeSeats.east.seat)?.card}
              faceDown={getPlayedCardForSeat(relativeSeats.east.seat)?.isFaceDown}
              size="md"
              isWinningCard={currentTrick.winnerSeat === relativeSeats.east.seat}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty Trick Table Surface Placeholder */}
      {cardsPlayed.length === 0 && (
        <div className="w-24 h-24 rounded-full border border-dashed border-emerald-500/20 flex flex-col items-center justify-center text-center p-2 opacity-50">
          <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
            TRICK {currentTrick.trickNumber}
          </span>
          <span className="text-[8px] text-slate-400 font-bold mt-0.5">LEAD CARD</span>
        </div>
      )}
    </div>
  );
};
