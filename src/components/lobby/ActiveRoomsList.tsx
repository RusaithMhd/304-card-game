'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Users, Lock, Globe, Play, Plus, KeyRound } from 'lucide-react';
import { useRoomStore, RoomDetails } from '../../stores/useRoomStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface ActiveRoomsListProps {
  onJoinRoom: (roomCode: string) => void;
  onCreateRoom: () => void;
  onJoinCodeModal: () => void;
}

export const ActiveRoomsList: React.FC<ActiveRoomsListProps> = ({
  onJoinRoom,
  onCreateRoom,
  onJoinCodeModal,
}) => {
  const { activeRoomsList } = useRoomStore();

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-800/40 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-xl space-y-3">
          <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/40 text-amber-300 font-extrabold text-[10px] uppercase tracking-widest inline-block">
            AUTHENTIC SRI LANKAN & SOUTH INDIAN 304 CARD GAME
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-100 leading-tight">
            Play 304 Card Matches Online With Friends
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Create private tables, invite friends with 6-digit room codes, choose open or closed trumps, and bid up to 304 points with real-time card physics!
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onCreateRoom}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-yellow-300 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>CREATE NEW ROOM</span>
            </button>

            <button
              onClick={onJoinCodeModal}
              className="px-5 py-3 rounded-2xl bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>ENTER ROOM CODE</span>
            </button>
          </div>
        </div>

        {/* Decorative Watermark Suits */}
        <div className="absolute right-4 bottom-4 text-emerald-900/30 text-8xl font-serif select-none pointer-events-none">
          ♠ ♥ ♦ ♣
        </div>
      </div>

      {/* Active Rooms Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
            Active Match Tables ({activeRoomsList.length})
          </h3>
        </div>
      </div>

      {/* Rooms Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activeRoomsList.map((room) => {
          const isFull = room.players.length >= 4;

          return (
            <motion.div
              key={room.id}
              whileHover={{ y: -2 }}
              className="p-5 rounded-3xl bg-slate-900 border border-slate-800/80 shadow-xl flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-sm text-slate-100">{room.name}</span>
                    {room.isPrivate ? (
                      <span title="Private Room">
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      </span>
                    ) : (
                      <span title="Public Room">
                        <Globe className="w-3.5 h-3.5 text-emerald-400" />
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono font-bold text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    CODE: {room.roomCode}
                  </span>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                    isFull
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {room.players.length} / 4 SEATS
                </span>
              </div>

              {/* Player Avatars */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <div className="flex -space-x-2">
                  {room.players.map((p) => (
                    <img
                      key={p.id}
                      src={p.avatar}
                      alt={p.name}
                      className="w-8 h-8 rounded-full border border-slate-700 bg-slate-800"
                      title={p.name}
                    />
                  ))}
                </div>

                <button
                  onClick={() => onJoinRoom(room.roomCode)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>JOIN MATCH</span>
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
