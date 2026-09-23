'use client';

import React, { useState } from 'react';
import { LobbyHeader, NavTab } from '../components/lobby/LobbyHeader';
import { ActiveRoomsList } from '../components/lobby/ActiveRoomsList';
import { FriendsView } from '../components/friends/FriendsView';
import { MatchHistoryView } from '../components/history/MatchHistoryView';
import { ProfileView } from '../components/profile/ProfileView';
import { CreateRoomModal } from '../components/lobby/CreateRoomModal';
import { JoinRoomModal } from '../components/lobby/JoinRoomModal';
import { WaitingRoom } from '../components/rooms/WaitingRoom';
import { CardTable } from '../components/game/CardTable';
import { useRoomStore } from '../stores/useRoomStore';
import { useAuthStore } from '../stores/useAuthStore';

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [currentView, setCurrentView] = useState<'lobby' | 'waiting' | 'game'>('lobby');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

  const { joinRoomByCode, currentRoom } = useRoomStore();
  const { user } = useAuthStore();

  const handleJoinRoom = (code: string) => {
    if (!user) return;
    const room = joinRoomByCode(code, {
      id: user.id,
      name: user.display_name,
      avatar: user.avatar_url,
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
            onCreateRoom={() => setIsCreateModalOpen(true)}
            onJoinRoom={() => setIsJoinModalOpen(true)}
          />

          <main className="flex-1 pb-20 md:pb-6">
            {activeTab === 'home' && (
              <ActiveRoomsList
                onJoinRoom={handleJoinRoom}
                onCreateRoom={() => setIsCreateModalOpen(true)}
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
        </>
      )}
    </div>
  );
}
