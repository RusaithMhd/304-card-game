'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore, AVATAR_OPTIONS } from '../../stores/useAuthStore';
import { ShieldCheck, Mail, Lock, User, Sparkles, LogIn, UserPlus, Eye, EyeOff, Play } from 'lucide-react';

interface AuthPortalModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onGuestPlay?: () => void;
}

export const AuthPortalModal: React.FC<AuthPortalModalProps> = ({
  isOpen,
  onClose,
  onGuestPlay,
}) => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(AVATAR_OPTIONS[0]);

  const { signIn, signUp, isLoading, errorMessage, clearError } = useAuthStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (tab === 'login') {
      const success = await signIn(email, password);
      if (success && onClose) onClose();
    } else {
      const success = await signUp(email, password, username, displayName || username);
      if (success && onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-100 overflow-hidden my-auto"
      >
        {/* Top Gold Accent Glow */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />

        {/* 304 Card Game Branding Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-300 font-extrabold text-[11px] tracking-wider uppercase mb-2 shadow-inner">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>OFFICIAL SRI LANKAN 304 GAME</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 tracking-tight">
            304 CARD PORTAL
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Sign in to track tokens, save stats, and play online matches
          </p>
        </div>

        {/* Tab Selector: Login vs Signup */}
        <div className="flex bg-slate-950/80 rounded-2xl p-1 mb-5 border border-slate-800">
          <button
            onClick={() => { setTab('login'); clearError(); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'login'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>SIGN IN</span>
          </button>

          <button
            onClick={() => { setTab('signup'); clearError(); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'signup'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>CREATE ACCOUNT</span>
          </button>
        </div>

        {/* Error Feedback Banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/50 text-rose-300 text-xs font-bold text-center shadow-md flex items-center justify-between"
            >
              <span>⚠️ {errorMessage}</span>
              <button onClick={clearError} className="text-slate-400 hover:text-white font-black text-sm">×</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {tab === 'signup' && (
            <>
              {/* Username Field */}
              <div>
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  Username (3–20 characters, unique)
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="rusaith_304"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Display Name Field */}
              <div>
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
                  Display Name
                </label>
                <div className="relative">
                  <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Rusaith Muhammath"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1.5">
                  Choose Player Avatar
                </label>
                <div className="flex items-center justify-between gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                  {AVATAR_OPTIONS.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="Avatar option"
                      onClick={() => setAvatarUrl(url)}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 cursor-pointer transition-all ${
                        avatarUrl === url
                          ? 'border-amber-400 ring-2 ring-amber-400/50 scale-110 bg-slate-800'
                          : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="player@304game.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-all font-medium"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 transition-all font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{tab === 'login' ? 'SIGN IN TO PORTAL' : 'CREATE 304 ACCOUNT'}</span>
                <span className="text-xs">↵</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
          <span className="relative px-3 bg-slate-900 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            OR PLAY INSTANTLY
          </span>
        </div>

        {/* Guest Play Button */}
        <button
          type="button"
          onClick={() => {
            if (onGuestPlay) onGuestPlay();
            if (onClose) onClose();
          }}
          className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-850 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          <Play className="w-3.5 h-3.5 text-amber-400 fill-current" />
          <span>CONTINUE AS GUEST (BOT MATCH)</span>
        </button>
      </motion.div>
    </div>
  );
};
