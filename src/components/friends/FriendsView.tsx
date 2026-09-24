'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, Check, X, Gamepad2, Search } from 'lucide-react';
import { useFriendStore } from '../../stores/useFriendStore';
import { notify } from '../../stores/useNotificationStore';

export const FriendsView: React.FC = () => {
  const { friends, pendingRequests, sendFriendRequest, acceptRequest, declineRequest } = useFriendStore();
  const [inputName, setInputName] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;

    const ok = sendFriendRequest(inputName);
    if (ok) {
      setRequestSent(true);
      setInputName('');
      setTimeout(() => setRequestSent(false), 2500);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>Friends & Social</span>
          </h2>
          <p className="text-xs text-slate-400">Play private 304 matches with online friends.</p>
        </div>
      </div>

      {/* Add Friend Input Card */}
      <form onSubmit={handleSend} className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            placeholder="Enter friend's username..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
          />
        </div>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>ADD FRIEND</span>
        </button>
      </form>

      {requestSent && (
        <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 font-bold text-xs text-center">
          ✓ Friend request sent!
        </div>
      )}

      {/* Pending Requests Section */}
      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
            Pending Friend Requests ({pendingRequests.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={req.sender_avatar}
                    alt={req.sender_name}
                    className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700"
                  />
                  <div>
                    <span className="font-bold text-xs text-slate-100 block">{req.sender_name}</span>
                    <span className="text-[10px] text-slate-400">{req.created_at}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => acceptRequest(req.id)}
                    className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all cursor-pointer"
                    title="Accept"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => declineRequest(req.id)}
                    className="p-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-all cursor-pointer"
                    title="Decline"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends List Grid */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Your Friends ({friends.length})
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {friends.map((f) => (
            <motion.div
              key={f.id}
              whileHover={{ y: -2 }}
              className="p-4 rounded-3xl bg-slate-900 border border-slate-800/80 flex items-center justify-between shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={f.avatar_url}
                    alt={f.display_name}
                    className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 object-cover"
                  />
                  {/* Status Indicator Dot */}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                      f.status === 'online'
                        ? 'bg-emerald-400'
                        : f.status === 'away'
                        ? 'bg-amber-400'
                        : 'bg-slate-600'
                    }`}
                  />
                </div>

                <div>
                  <span className="font-bold text-xs text-slate-100 block">{f.display_name}</span>
                  <span className="text-[10px] text-slate-400 block">@{f.username}</span>

                  {f.in_game ? (
                    <span className="text-[9px] font-extrabold text-amber-400 flex items-center gap-1 mt-0.5">
                      <Gamepad2 className="w-3 h-3" />
                      <span>PLAYING 304 ({f.game_room_code})</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-500 capitalize">{f.status}</span>
                  )}
                </div>
              </div>

              {/* Invite Action */}
              <button
                onClick={() => notify.success(`Invite sent to ${f.display_name}!`, 'INVITE SENT')}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 font-bold text-[10px] transition-all cursor-pointer"
              >
                INVITE
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
