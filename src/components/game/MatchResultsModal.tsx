'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { GameEngineState } from '../../lib/game-engine/types';
import { Trophy, RotateCcw, Home, Sparkles, Coins } from 'lucide-react';
import { evaluateRoundResult } from '../../lib/game-engine/scoring';

interface MatchResultsModalProps {
  gameState: GameEngineState;
  onRematch: () => void;
  onBackToLobby: () => void;
}

export const MatchResultsModal: React.FC<MatchResultsModalProps> = ({
  gameState,
  onRematch,
  onBackToLobby,
}) => {
  const result = evaluateRoundResult(
    gameState.teamAScore,
    gameState.teamBScore,
    gameState.bidding.bidderSeat ?? 0,
    gameState.bidding.currentHighBid,
    gameState.isPartnerCloseCaps || false,
    gameState.capsDeclared || false,
    gameState.capsDeclaredBeforeTrick7 || false,
    gameState.capsTrickLost || false
  );

  useEffect(() => {
    // Fire celebratory confetti on game completion
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#facc15', '#10b981', '#3b82f6', '#ec4899'],
    });
  }, []);

  const teamAPlayers = gameState.players.filter((p) => p.seat % 2 === 0);
  const teamBPlayers = gameState.players.filter((p) => p.seat % 2 === 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center text-slate-100 overflow-hidden relative"
      >
        {/* Glow Header */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-500" />

        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
          <Trophy className="w-8 h-8" />
        </div>

        <h2 className="text-2xl font-black text-amber-400 uppercase tracking-wide mb-1">
          {gameState.status === 'GAME_COMPLETE' ? 'MATCH COMPLETED' : 'ROUND COMPLETED'}
        </h2>
        <p className="text-xs text-slate-400 mb-3">{result.summary}</p>

        {/* Target Score & Completed Timestamp */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 font-semibold text-[11px]">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Target: <strong className="text-amber-400">{gameState.targetScore ?? 22} Tokens</strong></span>
          </div>
          {gameState.finishedAt && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-[11px]">
              <span>Completed: {new Date(gameState.finishedAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Token Transfer Summary Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-300 font-extrabold text-xs mb-4 shadow-md">
          <Coins className="w-4 h-4 text-amber-400" />
          <span>
            TOKEN TRANSFERS: Team A ({result.tokensAwarded.teamA > 0 ? `+${result.tokensAwarded.teamA}` : result.tokensAwarded.teamA}) | Team B ({result.tokensAwarded.teamB > 0 ? `+${result.tokensAwarded.teamB}` : result.tokensAwarded.teamB})
          </span>
        </div>

        {/* Marley / Cap Bonus Badge */}
        {result.isCapOrMarley && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-bold text-xs mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MARLEY CAP BONUS (304 POINTS!)</span>
          </div>
        )}

        {/* Honest Game Result Badge */}
        {gameState.honestGame && (
          <div className={`mb-5 p-3 rounded-2xl border flex items-center justify-between text-xs font-bold shadow-md ${
            gameState.honestGameResult === 'SUCCESS'
              ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300'
              : 'bg-rose-500/15 border-rose-400/50 text-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-base font-black">{gameState.honestGameResult === 'SUCCESS' ? '✓' : '✕'}</span>
              <span>HONEST GAME COMMITMENT (250+)</span>
            </div>
            <span className="font-black uppercase tracking-wider">
              {gameState.honestGameResult === 'SUCCESS' ? 'SUCCESS' : 'FAILED'}
            </span>
          </div>
        )}

        {/* Score Comparison Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Team A Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              result.winningTeam === 0
                ? 'bg-amber-500/10 border-amber-400/60 ring-1 ring-amber-400'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              TEAM A (South & North)
            </span>
            <span className="text-3xl font-black text-slate-100 block mb-1">{gameState.teamAScore} Pts</span>
            <span className="text-xs font-bold text-amber-400 block mb-2">{gameState.teamATokens} Tokens</span>
            <div className="flex justify-center -space-x-2">
              {teamAPlayers.map((p) => (
                <img
                  key={p.id}
                  src={p.avatar}
                  alt={p.name}
                  className="w-7 h-7 rounded-full border border-slate-700 bg-slate-800"
                  title={p.name}
                />
              ))}
            </div>
          </div>

          {/* Team B Card */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              result.winningTeam === 1
                ? 'bg-amber-500/10 border-amber-400/60 ring-1 ring-amber-400'
                : 'bg-slate-950/60 border-slate-800'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              TEAM B (East & West)
            </span>
            <span className="text-3xl font-black text-slate-100 block mb-1">{gameState.teamBScore} Pts</span>
            <span className="text-xs font-bold text-emerald-400 block mb-2">{gameState.teamBTokens} Tokens</span>
            <div className="flex justify-center -space-x-2">
              {teamBPlayers.map((p) => (
                <img
                  key={p.id}
                  src={p.avatar}
                  alt={p.name}
                  className="w-7 h-7 rounded-full border border-slate-700 bg-slate-800"
                  title={p.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLobby}
            className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>LOBBY</span>
          </button>

          <button
            onClick={onRematch}
            className="flex-[2] py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-yellow-300 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>PLAY AGAIN (NEXT DEAL)</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

