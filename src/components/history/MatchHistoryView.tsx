'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { History, Trophy, Sparkles, Calendar } from 'lucide-react';
import { useHistoryStore } from '../../stores/useHistoryStore';

export const MatchHistoryView: React.FC = () => {
  const { matches } = useHistoryStore();

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <span>Match History</span>
          </h2>
          <p className="text-xs text-slate-400">View past 304 friendship match results and Marley caps.</p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-3xl">
          <History className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h4 className="font-bold text-sm text-slate-300">No matches played yet</h4>
          <p className="text-xs text-slate-500 mt-1">Create or join a room to play your first 304 match!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span className="font-black text-sm text-slate-100">{m.roomName}</span>
                  <span className="text-[10px] font-mono font-bold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {m.roomCode}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {m.isMarleyOrCap && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> MARLEY CAP
                    </span>
                  )}
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {m.date}
                  </span>
                </div>
              </div>

              {/* Team Scores Comparison */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`p-3 rounded-2xl border ${m.winningTeam === 0 ? 'bg-amber-500/10 border-amber-400/40 text-amber-300' : 'bg-slate-950/60 border-slate-800'}`}>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">TEAM A ({m.teamAPlayers.join(', ')})</span>
                  <span className="text-2xl font-black">{m.teamAScore} pts</span>
                </div>

                <div className={`p-3 rounded-2xl border ${m.winningTeam === 1 ? 'bg-amber-500/10 border-amber-400/40 text-amber-300' : 'bg-slate-950/60 border-slate-800'}`}>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase">TEAM B ({m.teamBPlayers.join(', ')})</span>
                  <span className="text-2xl font-black">{m.teamBScore} pts</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
