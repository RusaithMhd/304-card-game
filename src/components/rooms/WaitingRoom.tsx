'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, Share2, Users, Bot, Play, ShieldAlert, ArrowLeft, UserMinus } from 'lucide-react';
import { useRoomStore } from '../../stores/useRoomStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useGameStore } from '../../stores/useGameStore';
import { PlayerState } from '../../lib/game-engine/types';

import { supabase } from '../../lib/supabase/client';

interface WaitingRoomProps {
  onStartGame: () => void;
  onLeaveRoom: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({ onStartGame, onLeaveRoom }) => {
  const { currentRoom, togglePlayerReady, fillWithBots, kickPlayer, fetchRoomDetails, startMatch } = useRoomStore();
  const { user } = useAuthStore();
  const { initRoomGame, dispatchAction } = useGameStore();

  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!currentRoom) {
      const timer = setTimeout(() => {
        onLeaveRoom();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [currentRoom, onLeaveRoom]);

  // Auto-transition all connected clients to game view when room status changes to playing
  React.useEffect(() => {
    if (currentRoom?.status === 'playing' || currentRoom?.status === 'bidding') {
      const localP = currentRoom.players.find((p) => p.id === user?.id || (user?.display_name && p.name === user.display_name));
      const seat = localP?.seat ?? 0;
      initRoomGame(currentRoom.roomCode, currentRoom.players, seat);
      dispatchAction({ type: 'START_GAME' });
      onStartGame();
    }
  }, [currentRoom?.status, currentRoom?.roomCode, currentRoom?.players, user?.id, user?.display_name, initRoomGame, dispatchAction, onStartGame]);

  // Realtime subscription + 1.5s polling interval for multi-browser room sync
  React.useEffect(() => {
    if (!currentRoom?.roomCode) return;

    const syncRoom = () => {
      if (currentRoom?.roomCode) {
        fetchRoomDetails(currentRoom.roomCode);
      }
    };

    // Initial refresh
    syncRoom();

    // 1.5s polling loop for cross-browser synchronization
    const pollInterval = setInterval(syncRoom, 1500);

    // Supabase Realtime listener
    const channel = supabase
      .channel(`room:${currentRoom.id || currentRoom.roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
        },
        () => {
          syncRoom();
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [currentRoom?.id, currentRoom?.roomCode, fetchRoomDetails]);

  if (!currentRoom || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-amber-400 font-bold uppercase tracking-wider">
            Loading Room Session...
          </p>
        </div>
      </div>
    );
  }

  const hostPlayer = currentRoom.players.find((p) => p.seat === 0) || currentRoom.players[0];
  const isHost = currentRoom.hostId === user.id || hostPlayer?.id === user.id;
  const localPlayer = currentRoom.players.find((p) => p.id === user.id || (user.display_name && p.name === user.display_name));
  const isReady = localPlayer?.isReady ?? false;
  const canStart = currentRoom.players.length === 4 && currentRoom.players.every((p) => p.isReady);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(currentRoom.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    if (!canStart) return;

    // Signal start match to server API & broadcast channel for all connected players
    await startMatch(currentRoom.roomCode);

    // Initialize game store with current room players & user seat
    initRoomGame(currentRoom.roomCode, currentRoom.players, localPlayer?.seat ?? 0);
    dispatchAction({ type: 'START_GAME' });
    onStartGame();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 sm:p-6 select-none">
      {/* Top Header */}
      <header className="w-full max-w-4xl flex items-center justify-between border-b border-slate-800 pb-4">
        <button
          onClick={onLeaveRoom}
          className="p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>LEAVE ROOM</span>
        </button>

        <div className="text-center">
          <span className="text-[10px] font-black text-amber-400 tracking-widest uppercase block">
            PRIVATE 304 WAITING LOBBY
          </span>
          <h2 className="text-lg font-black text-slate-100">{currentRoom.name}</h2>
        </div>

        <button
          onClick={fillWithBots}
          className="p-2 rounded-xl bg-amber-500/10 border border-amber-400/40 text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer text-xs font-bold flex items-center gap-1.5"
          title="Fill remaining empty seats with AI Bots"
        >
          <Bot className="w-4 h-4" />
          <span className="hidden sm:inline">ADD BOTS</span>
        </button>
      </header>

      {/* Center 6-Character Room Code Card */}
      <div className="w-full max-w-md my-4 bg-slate-900/90 border border-amber-500/30 rounded-3xl p-6 shadow-2xl text-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
          ROOM CODE
        </span>
        <div className="flex items-center justify-center gap-3 my-2">
          <span className="text-4xl font-mono font-black tracking-widest text-amber-400">
            {currentRoom.roomCode}
          </span>
          <button
            onClick={handleCopyCode}
            className="p-2.5 rounded-2xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-amber-400 transition-all cursor-pointer"
            title="Copy Code"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Share this code with 3 friends to join your match table.
        </p>
      </div>

      {/* 4 Player Seats Grid */}
      <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-4 my-4">
        {[0, 1, 2, 3].map((seatNum) => {
          const player = currentRoom.players.find((p) => p.seat === seatNum);
          const isPlayerSelf = player && (player.id === user.id || (localPlayer && player.seat === localPlayer.seat));
          const canKick = player && ((isHost && !isPlayerSelf) || player.id.startsWith('bot_'));
          const isHostSeat = player && ((hostPlayer && player.seat === hostPlayer.seat) || player.id === currentRoom.hostId);

          return (
            <motion.div
              key={seatNum}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-3xl border flex flex-col items-center justify-center text-center min-h-[160px] relative transition-all ${
                player
                  ? 'bg-slate-900/80 border-slate-700 shadow-xl'
                  : 'bg-slate-950/60 border-slate-800/80 border-dashed'
              }`}
            >
              {player ? (
                <>
                  {/* Remove / Kick Participant Button */}
                  {canKick && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        kickPlayer(player.seat);
                      }}
                      className="absolute top-3 right-3 p-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all cursor-pointer shadow-md"
                      title={`Remove ${player.name} from room`}
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <div className="relative mb-2">
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className="w-14 h-14 rounded-full bg-slate-800 border-2 border-slate-700 object-cover"
                    />
                    {isHostSeat && (
                      <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px]">
                        HOST
                      </span>
                    )}
                  </div>

                  <span className="font-bold text-xs text-slate-200 truncate max-w-[120px] block">
                    {player.name}
                  </span>

                  <span
                    className={`mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                      player.isReady
                        ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {player.isReady ? '✓ READY' : 'WAITING...'}
                  </span>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-600">
                  <Users className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs font-bold">Seat {seatNum + 1}</span>
                  <span className="text-[10px] text-slate-500">Waiting for player...</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Footer Controls: Ready & Start */}
      <footer className="w-full max-w-md flex flex-col gap-3 pb-safe">
        <button
          onClick={() => togglePlayerReady(user.id)}
          className={`w-full py-3.5 rounded-2xl font-black text-xs tracking-wider uppercase transition-all cursor-pointer border shadow-lg ${
            isReady
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 hover:bg-emerald-500/30'
              : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
          }`}
        >
          {isReady ? '✓ READY (CLICK TO UNREADY)' : 'PRESS WHEN READY'}
        </button>

        {isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl ${
              canStart
                ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 hover:brightness-110 active:scale-95'
                : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START 304 MATCH</span>
          </button>
        )}
      </footer>
    </div>
  );
};
