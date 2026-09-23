'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { X, Mic, Volume2, Key, SlidersHorizontal } from 'lucide-react';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { PlayerState } from '../../lib/game-engine/types';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: PlayerState[];
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
  players,
}) => {
  const {
    isPushToTalkEnabled,
    togglePushToTalk,
    playerVolumes,
    setPlayerVolume,
  } = useVoiceStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl text-slate-100"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-5 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-amber-400" />
            <h3 className="font-extrabold text-base text-slate-100">Voice Chat Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Push To Talk Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800">
            <div>
              <span className="font-bold text-xs text-slate-200 block">Push To Talk Mode</span>
              <span className="text-[10px] text-slate-400 block">Hold 'V' key to speak</span>
            </div>
            <button
              onClick={() => togglePushToTalk()}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all ${
                isPushToTalkEnabled
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isPushToTalkEnabled ? 'ON' : 'OFF'}
            </button>
          </div>

          {/* Per-Player Volume Control Sliders */}
          <div>
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-3">
              Per-Player Volume Mix
            </span>

            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {players.map((p) => {
                const vol = playerVolumes[p.id] ?? 0.8;

                return (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-slate-950/40 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-[120px]">
                      <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700"
                      />
                      <span className="text-xs font-bold text-slate-200 truncate">{p.name}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-1 max-w-[180px]">
                      <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={vol}
                        onChange={(e) => setPlayerVolume(p.id, parseFloat(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer"
                      />
                      <span className="text-[10px] font-mono text-amber-400 font-bold w-8 text-right">
                        {Math.round(vol * 100)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
