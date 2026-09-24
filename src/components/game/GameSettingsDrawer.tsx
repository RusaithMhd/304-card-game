'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Volume2,
  VolumeX,
  Bot,
  Copy,
  Check,
  LogOut,
  ShieldAlert,
  Info,
  Sliders,
  Sparkles,
  Layers,
  Award,
  Mic,
  MicOff,
} from 'lucide-react';
import { GameEngineState } from '../../lib/game-engine/types';
import { useVoiceStore } from '../../stores/useVoiceStore';

interface GameSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameEngineState;
  isMuted: boolean;
  onToggleMute: () => void;
  isBotModeEnabled: boolean;
  onToggleBotMode: () => void;
  onLeaveMatch: () => void;
}

export const GameSettingsDrawer: React.FC<GameSettingsDrawerProps> = ({
  isOpen,
  onClose,
  gameState,
  isMuted,
  onToggleMute,
  isBotModeEnabled,
  onToggleBotMode,
  onLeaveMatch,
}) => {
  const [copied, setCopied] = React.useState(false);
  const { permissionState, isMuted: isMicMuted, requestMicPermission, toggleMute: toggleMicMute } = useVoiceStore();

  const handleCopyRoomCode = () => {
    if (!gameState.roomId) return;
    navigator.clipboard.writeText(gameState.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Right Slide-in Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 250 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col justify-between overflow-hidden select-none"
          >
            {/* Header Section */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-100 tracking-wider">GAME SETTINGS</h2>
                  <p className="text-[11px] text-amber-400 font-extrabold uppercase tracking-widest">
                    304 Match Preferences
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer active:scale-95"
                title="Close Settings"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 no-scrollbar">
              {/* 1. ROOM INFO CARD */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                    ROOM CODE
                  </span>
                  <span className="text-lg font-black text-amber-400 tracking-wider">
                    #{gameState.roomId}
                  </span>
                </div>

                <button
                  onClick={handleCopyRoomCode}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400 font-extrabold">COPIED</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-400" />
                      <span>COPY CODE</span>
                    </>
                  )}
                </button>
              </div>

              {/* 2. MATCH STATUS & TEAM SCORES */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  MATCH SCORE BOARD
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center">
                    <span className="text-[10px] font-black text-amber-400 uppercase">TEAM A</span>
                    <span className="text-2xl font-black text-amber-300">{gameState.teamAScore}</span>
                    <span className="text-[9px] text-slate-400 font-bold mt-0.5">
                      Tokens: {gameState.teamATokens}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center">
                    <span className="text-[10px] font-black text-emerald-400 uppercase">TEAM B</span>
                    <span className="text-2xl font-black text-emerald-300">{gameState.teamBScore}</span>
                    <span className="text-[9px] text-slate-400 font-bold mt-0.5">
                      Tokens: {gameState.teamBTokens}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. AUDIO & SOUND TOGGLE */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
                    {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">GAME AUDIO</span>
                    <span className="text-[10px] text-slate-400">
                      {isMuted ? 'Sound effects muted' : 'Sound effects enabled'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onToggleMute}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    isMuted
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  {isMuted ? 'UNMUTE' : 'MUTED'}
                </button>
              </div>

              {/* 3.5. LIVE VOICE CHAT & TALKING */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
                    {permissionState !== 'allowed' ? (
                      <Mic className="w-5 h-5 text-amber-400" />
                    ) : isMicMuted ? (
                      <MicOff className="w-5 h-5 text-rose-400" />
                    ) : (
                      <Mic className="w-5 h-5 text-emerald-400 animate-pulse" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">LIVE VOICE TALKING</span>
                    <span className="text-[10px] text-slate-400">
                      {permissionState !== 'allowed'
                        ? 'Microphone disabled'
                        : isMicMuted
                        ? 'Microphone muted'
                        : 'Live voice active'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (permissionState !== 'allowed') {
                      requestMicPermission();
                    } else {
                      toggleMicMute();
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    permissionState !== 'allowed'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      : isMicMuted
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 hover:bg-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30'
                  }`}
                >
                  {permissionState !== 'allowed'
                    ? 'ENABLE'
                    : isMicMuted
                    ? 'UNMUTE'
                    : 'TALKING'}
                </button>
              </div>

              {/* 4. BOT AUTO-PLAY ASSIST (Practice / Testing) */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300">
                    <Bot className={`w-5 h-5 ${isBotModeEnabled ? 'text-amber-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">BOT AUTO-ASSIST</span>
                    <span className="text-[10px] text-slate-400">
                      {isBotModeEnabled ? 'Bots take turns automatically' : 'Manual gameplay'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onToggleBotMode}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                    isBotModeEnabled
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {isBotModeEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* 5. SRI LANKAN 304 POINT HIERARCHY REFERENCE */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase">
                  <Info className="w-4 h-4" />
                  <span>304 CARD POINT HIERARCHY</span>
                </div>

                <div className="grid grid-cols-4 gap-1.5 text-center text-[10px] font-bold">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-amber-500/30 text-amber-300">
                    <div className="font-black text-xs text-amber-400">Jack (J)</div>
                    <div>30 Points</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">
                    <div className="font-black text-xs text-emerald-400">Nine (9)</div>
                    <div>20 Points</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">
                    <div className="font-black text-xs text-slate-100">Ace (A)</div>
                    <div>11 Points</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200">
                    <div className="font-black text-xs text-slate-100">Ten (10)</div>
                    <div>10 Points</div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  Kings = 3 pts, Queens = 2 pts. 8s & 7s = 0 pts. Total available per hand = 304 points.
                </p>
              </div>
            </div>

            {/* Footer Section: Leave Match */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950/80">
              <button
                onClick={() => {
                  onClose();
                  onLeaveMatch();
                }}
                className="w-full py-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-400 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 shadow-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>LEAVE MATCH</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
