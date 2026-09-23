'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Award, Flame, Check, Edit2 } from 'lucide-react';
import { useAuthStore, AVATAR_OPTIONS } from '../../stores/useAuthStore';

export const ProfileView: React.FC = () => {
  const { user, updateProfile } = useAuthStore();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar_url || AVATAR_OPTIONS[0]);
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const winRate = user.games_played > 0
    ? Math.round((user.games_won / user.games_played) * 100)
    : 0;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      display_name: displayName.trim() || user.username,
      avatar_url: selectedAvatar,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
          <User className="w-5 h-5 text-amber-400" />
          <span>Player Profile & Stats</span>
        </h2>
        <p className="text-xs text-slate-400">Customize your avatar and view your 304 match performance.</p>
      </div>

      {/* Profile Overview Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row items-center gap-6">
        <div className="relative">
          <img
            src={selectedAvatar}
            alt={user.display_name}
            className="w-24 h-24 rounded-full bg-slate-800 border-2 border-amber-400 object-cover shadow-lg"
          />
        </div>

        <div className="flex-1 text-center sm:text-left">
          <h3 className="text-2xl font-black text-slate-100">{user.display_name}</h3>
          <span className="text-xs text-amber-400 font-bold block mb-3">@{user.username}</span>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">PLAYED</span>
              <span className="text-lg font-black text-slate-100">{user.games_played}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">WON</span>
              <span className="text-lg font-black text-emerald-400">{user.games_won}</span>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">WIN RATE</span>
              <span className="text-lg font-black text-amber-400">{winRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Customize Avatar & Name</h4>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            Choose Avatar Icon
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
            {AVATAR_OPTIONS.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setSelectedAvatar(url)}
                className={`p-1.5 rounded-2xl border transition-all cursor-pointer ${
                  selectedAvatar === url
                    ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400 scale-105'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <img src={url} alt="Avatar" className="w-full h-auto rounded-full bg-slate-800" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs shadow-lg hover:from-amber-400 hover:to-yellow-300 transition-all cursor-pointer"
          >
            SAVE CHANGES
          </button>
          {saved && <span className="text-xs text-emerald-400 font-bold">✓ Profile updated successfully!</span>}
        </div>
      </form>
    </div>
  );
};
