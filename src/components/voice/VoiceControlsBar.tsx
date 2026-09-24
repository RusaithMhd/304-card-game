'use client';

import React, { useEffect } from 'react';
import { Mic, MicOff, Settings, Volume2, ShieldCheck } from 'lucide-react';
import { useVoiceStore } from '../../stores/useVoiceStore';

interface VoiceControlsBarProps {
  onOpenSettings: () => void;
}

export const VoiceControlsBar: React.FC<VoiceControlsBarProps> = ({ onOpenSettings }) => {
  const {
    permissionState,
    isMuted,
    isPushToTalkEnabled,
    isPttActive,
    requestMicPermission,
    toggleMute,
    setPttActive,
  } = useVoiceStore();

  // Keyboard shortcut listener ('M' for Mute toggle, 'V' for Push to talk)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing inside input fields
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key.toLowerCase() === 'm') {
        toggleMute();
      } else if (e.key.toLowerCase() === 'v' && isPushToTalkEnabled && !isPttActive) {
        setPttActive(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (e.key.toLowerCase() === 'v' && isPushToTalkEnabled) {
        setPttActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [toggleMute, setPttActive, isPushToTalkEnabled, isPttActive]);

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-900/90 border border-slate-700/80 px-2 sm:px-3 py-1 sm:py-1.5 rounded-2xl shadow-lg text-slate-100 shrink-0">
      {/* 1. Mic Permission Button */}
      {permissionState !== 'allowed' ? (
        <button
          onClick={() => requestMicPermission()}
          className="px-2.5 sm:px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] sm:text-xs transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
        >
          <Mic className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">{permissionState === 'requesting' ? 'CONNECTING...' : 'ENABLE MIC'}</span>
          <span className="xs:hidden">{permissionState === 'requesting' ? '...' : 'MIC'}</span>
        </button>
      ) : (
        /* 2. Mute / Unmute Button */
        <button
          onClick={() => toggleMute()}
          className={`px-2.5 sm:px-3 py-1 rounded-xl font-bold text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 transition-all cursor-pointer border shrink-0 ${
            isMuted
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 hover:bg-rose-500/30'
              : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/30 ring-1 ring-emerald-400'
          }`}
          title="Toggle Mute (Shortcut 'M')"
        >
          {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 animate-pulse" />}
          <span>{isMuted ? 'MUTED' : 'MIC ON'}</span>
        </button>
      )}

      {/* PTT Active Indicator */}
      {isPushToTalkEnabled && (
        <span
          className={`hidden sm:inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
            isPttActive ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
          }`}
        >
          PTT (V)
        </span>
      )}

      {/* Voice Settings Button */}
      <button
        onClick={onOpenSettings}
        className="p-1 sm:p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer shrink-0"
        title="Voice Chat Settings"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
