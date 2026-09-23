'use client';

import React from 'react';
import { Home, Users, History, User, Plus, KeyRound } from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

export type NavTab = 'home' | 'friends' | 'history' | 'profile';

interface LobbyHeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export const LobbyHeader: React.FC<LobbyHeaderProps> = ({
  activeTab,
  onTabChange,
  onCreateRoom,
  onJoinRoom,
}) => {
  const { user } = useAuthStore();

  const navItems = [
    { id: 'home', label: 'Lobby', icon: Home },
    { id: 'friends', label: 'Friends', icon: Users },
    { id: 'history', label: 'History', icon: History },
    { id: 'profile', label: 'Profile', icon: User },
  ] as const;

  return (
    <>
      {/* Desktop Top Header Bar */}
      <header className="w-full bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-40">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center font-black text-slate-950 text-base shadow-md">
            304
          </div>
          <div>
            <h1 className="text-sm font-black text-slate-100 tracking-wider">304 FRIENDS</h1>
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest block">
              REALTIME MULTIPLAYER CARD TABLE
            </span>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-full p-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Profile & Primary Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onJoinRoom}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 hover:bg-slate-800 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">JOIN CODE</span>
          </button>

          <button
            onClick={onCreateRoom}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-yellow-300 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>CREATE ROOM</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-3 py-2 flex items-center justify-around pb-safe">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition-all cursor-pointer ${
                isActive ? 'text-amber-400 font-extrabold' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
