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

  // Show Auth Portal if user is not logged in and not in guest mode
  const showAuthPortal = !isLoading && !isAuthenticated && !isGuestMode;

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
      setCurrentView('waiting');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {currentView === 'game' ? (
        <CardTable onBackToLobby={() => setCurrentView('lobby')} />
      ) : currentView === 'waiting' ? (
        <WaitingRoom
          onStartGame={() => setCurrentView('game')}
          onLeaveRoom={() => setCurrentView('lobby')}
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
            onRoomCreated={() => setCurrentView('waiting')}
          />

          <JoinRoomModal
            isOpen={isJoinModalOpen}
            onClose={() => setIsJoinModalOpen(false)}
            onJoined={() => setCurrentView('waiting')}
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
