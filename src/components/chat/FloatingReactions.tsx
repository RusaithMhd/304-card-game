'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FloatingReaction } from '../../stores/useChatStore';

interface FloatingReactionsProps {
  reactions: FloatingReaction[];
  getRelativeSeatPosition: (actualSeat: number) => 'south' | 'east' | 'north' | 'west';
}

export const FloatingReactions: React.FC<FloatingReactionsProps> = ({
  reactions,
  getRelativeSeatPosition,
}) => {
  // Seat positions mapped to percentage coordinates on card table
  const seatCoords: Record<'south' | 'east' | 'north' | 'west', { x: string; y: string }> = {
    south: { x: '50%', y: '82%' },
    east: { x: '86%', y: '48%' },
    north: { x: '50%', y: '16%' },
    west: { x: '14%', y: '48%' },
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r, idx) => {
          const relPos = getRelativeSeatPosition(r.seat);
          const coords = seatCoords[relPos];
          const itemKey = `${r.id || 'react'}_${idx}`;

          return (
            <motion.div
              key={itemKey}
              initial={{ opacity: 0, scale: 0.5, y: 0 }}
              animate={{ opacity: 1, scale: 1.4, y: -45 }}
              exit={{ opacity: 0, scale: 0.8, y: -70 }}
              transition={{ duration: 2, ease: 'easeOut' }}
              style={{ left: coords.x, top: coords.y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 text-3xl sm:text-4xl filter drop-shadow-lg"
            >
              {r.emoji}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
