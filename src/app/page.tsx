'use client';

import React, { useState, useEffect } from 'react';
import { LobbyHeader, NavTab } from '../components/lobby/LobbyHeader';
import { ActiveRoomsList } from '../components/lobby/ActiveRoomsList';
import { FriendsView } from '../components/friends/FriendsView';
import { MatchHistoryView } from '../components/history/MatchHistoryView';
import { ProfileView } from '../components/profile/ProfileView';
import { CreateRoomModal } from '../components/lobby/CreateRoomModal';
import { JoinRoomModal } from '../components/lobby/JoinRoomModal';
import { AuthPortalModal } from '../components/auth/AuthPortalModal';
import { WaitingRoom } from '../components/rooms/WaitingRoom';
import { CardTable } from '../components/game/CardTable';
import { useRoomStore } from '../stores/useRoomStore';
import { useAuthStore } from '../stores/useAuthStore';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [currentView, setCurrentView] = useState<'lobby' | 'waiting' | 'game'>('lobby');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isAuthPortalOpen, setIsAuthPortalOpen] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  const { joinRoomByCode } = useRoomStore();
  const { user, initializeAuth, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Restore saved view (game or room) after auth finishes loading
  useEffect(() => {
    if (!isLoading && (isAuthenticated || isGuestMode)) {
      const savedView = sessionStorage.getItem('304_active_view') as 'lobby' | 'waiting' | 'game' | null;
      if (savedView && (savedView === 'game' || savedView === 'waiting')) {
        setCurrentView(savedView);
      }
    }
  }, [isLoading, isAuthenticated, isGuestMode]);

  const handleSetView = (view: 'lobby' | 'waiting' | 'game') => {
    setCurrentView(view);
    if (typeof window !== 'undefined') {
      if (view === 'lobby') {
        sessionStorage.removeItem('304_active_view');
      } else {
        sessionStorage.setItem('304_active_view', view);
      }
    }
  };

  // 1. AUTH LOADING STATE — Splash / Loader while checking persistent auth session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center font-black text-slate-950 text-2xl shadow-xl shadow-amber-500/20 animate-pulse">
            304
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100 tracking-wider">304 FRIENDS</h2>
            <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mt-1">
              Restoring Session...
            </p>
          </div>
          <div className="w-36 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-full animate-pulse w-full" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Determine if Auth Portal should be shown
  const showAuthPortal = !isAuthenticated && !isGuestMode;

  const handleJoinRoom = (code: string) => {
    const playerProfile = user || {
      id: 'guest_user',
      display_name: 'Guest Player',
      avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=guest',
    };

    const room = joinRoomByCode(code, {
      id: playerProfile.id,
      name: playerProfile.display_name,
      avatar: playerProfile.avatar_url,
    });
    if (room) {
      handleSetView('waiting');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {currentView === 'game' ? (
        <CardTable onBackToLobby={() => handleSetView('lobby')} />
      ) : currentView === 'waiting' ? (
        <WaitingRoom
          onStartGame={() => handleSetView('game')}
          onLeaveRoom={() => handleSetView('lobby')}
        />
      ) : (
        <>
          <LobbyHeader
            activeTab={activeTab}
            onTabChange={(tab) => setActiveTab(tab)}
            onCreateRoom={() => {
              if (!isAuthenticated && !isGuestMode) {
                setIsAuthPortalOpen(true);
              } else {
                setIsCreateModalOpen(true);
              }
            }}
            onJoinRoom={() => {
              if (!isAuthenticated && !isGuestMode) {
                setIsAuthPortalOpen(true);
              } else {
                setIsJoinModalOpen(true);
              }
            }}
          />

          <main className="flex-1 pb-20 md:pb-6">
            {activeTab === 'home' && (
              <ActiveRoomsList
                onJoinRoom={handleJoinRoom}
                onCreateRoom={() => {
                  if (!isAuthenticated && !isGuestMode) {
                    setIsAuthPortalOpen(true);
                  } else {
                    setIsCreateModalOpen(true);
                  }
                }}
                onJoinCodeModal={() => setIsJoinModalOpen(true)}
              />
            )}
            {activeTab === 'friends' && <FriendsView />}
            {activeTab === 'history' && <MatchHistoryView />}
            {activeTab === 'profile' && <ProfileView />}
          </main>

          <CreateRoomModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onRoomCreated={() => handleSetView('waiting')}
          />

          <JoinRoomModal
            isOpen={isJoinModalOpen}
            onClose={() => setIsJoinModalOpen(false)}
            onJoined={() => handleSetView('waiting')}
          />

          <AuthPortalModal
            isOpen={showAuthPortal || isAuthPortalOpen}
            onClose={() => setIsAuthPortalOpen(false)}
            onGuestPlay={() => {
              setIsGuestMode(true);
              setIsAuthPortalOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}
