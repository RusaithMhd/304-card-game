'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, X } from 'lucide-react';
import { useChatStore, QUICK_REACTIONS } from '../../stores/useChatStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface ChatSheetProps {
  localSeat: number;
}

export const ChatSheet: React.FC<ChatSheetProps> = ({ localSeat }) => {
  const { messages, isChatOpen, toggleChat, sendMessage, sendReaction } = useChatStore();
  const { user } = useAuthStore();
  const [text, setText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    sendMessage(user.id, user.display_name, user.avatar_url, text);
    setText('');
  };

  const handleQuickReaction = (emoji: string) => {
    sendReaction(localSeat, emoji);
    sendMessage(user?.id || 'guest', user?.display_name || 'Player', user?.avatar_url || '', emoji);
  };

  return (
    <AnimatePresence>
      {isChatOpen && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="fixed inset-x-2 bottom-2 sm:bottom-4 sm:right-4 sm:left-auto sm:w-96 z-50 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] sm:max-h-[500px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-xs text-slate-200 uppercase tracking-wider">Room Chat</span>
            </div>
            <button
              onClick={() => toggleChat(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Emoji Reaction Buttons */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950/40 border-b border-slate-800/60 overflow-x-auto no-scrollbar">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleQuickReaction(emoji)}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-base transition-transform active:scale-125 cursor-pointer shrink-0"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-72">
            {messages.map((m) => {
              const isMine =
                (user?.id && m.sender_id === user.id) ||
                (user?.display_name && m.sender_name.trim().toLowerCase() === user.display_name.trim().toLowerCase());

              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <img
                    src={m.sender_avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                    alt={m.sender_name}
                    className="w-7 h-7 rounded-full border border-slate-700 bg-slate-800 shrink-0"
                  />
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                      isMine
                        ? 'bg-amber-500 text-slate-950 rounded-tr-none font-medium'
                        : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                    }`}
                  >
                    {!isMine && (
                      <span className="block text-[10px] font-bold text-amber-400 mb-0.5">
                        {m.sender_name}
                      </span>
                    )}
                    <p className="break-words leading-relaxed">{m.message}</p>
                    <span
                      className={`block text-[9px] mt-1 text-right ${
                        isMine ? 'text-slate-900/60' : 'text-slate-400'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="p-2 rounded-full bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
