'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/useGameStore';
import { useChatStore } from '../../stores/useChatStore';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { useRoomStore } from '../../stores/useRoomStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { CardHand } from './CardHand';
import { BiddingModal } from './BiddingModal';
import { TrumpSelectorModal } from './TrumpSelectorModal';
import { MatchResultsModal } from './MatchResultsModal';
import { FloatingReactions } from '../chat/FloatingReactions';
import { ChatSheet } from '../chat/ChatSheet';
import { VoiceControlsBar } from '../voice/VoiceControlsBar';
import { VoiceSettingsModal } from '../voice/VoiceSettingsModal';
import { FinishGameConfirmModal } from './FinishGameConfirmModal';
import { HonestGameModal } from './HonestGameModal';
import { PrivateTrumpModal } from './PrivateTrumpModal';
import { GameHeader } from './GameHeader';
import { PlayerSeat } from './PlayerSeat';
import { TrickArea } from './TrickArea';
import { TrumpStatus } from './TrumpStatus';
import { VoidChoiceOverlay } from './VoidChoiceOverlay';
import { TurnStatusBanner } from './TurnStatusBanner';
import { GameSettingsDrawer } from './GameSettingsDrawer';
import { createInitialPlayer } from '../../lib/game-engine/gameEngine';
import { canDeclarePCC } from '../../lib/game-engine/pccRules';
import { canDeclareHonestGame } from '../../lib/game-engine/honestGameRules';
import { PlayerState, PlayedCard } from '../../lib/game-engine/types';
import { LogOut } from 'lucide-react';

interface CardTableProps {
  onBackToLobby: () => void;
}

export const CardTable: React.FC<CardTableProps> = ({ onBackToLobby }) => {
  const { user } = useAuthStore();
  const { currentRoom } = useRoomStore();
  const {
    gameState,
    localSeat,
    selectedCardId,
    isBotModeEnabled,
    setSelectedCard,
    toggleBotMode,
    dispatchAction,
    getRelativeSeatPosition,
    syncServerGameState,
    initRoomGame,
  } = useGameStore();

  // Multi-window / multi-device realtime game state sync & refresh retrieval
  React.useEffect(() => {
    const activeRoomCode =
      currentRoom?.roomCode ||
      gameState?.roomId ||
      (typeof window !== 'undefined' ? sessionStorage.getItem('304_active_room_code') : null);

    if (!activeRoomCode) return;

    let isMounted = true;

    const fetchLatestState = async () => {
      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get', roomCode: activeRoomCode }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && isMounted) {
            const members = data.members || data.room?.members || [];
            let computedSeat: number | undefined = undefined;
            if (user && members.length > 0) {
              const matchedMember = members.find(
                (m: any) =>
                  m.user_id === user.id ||
                  (user.display_name &&
                    m.profiles?.display_name &&
                    m.profiles.display_name.trim().toLowerCase() === user.display_name.trim().toLowerCase())
              );
              if (matchedMember && matchedMember.seat !== undefined) {
                computedSeat = matchedMember.seat;
              }
            }

            if (data.chatMessages) {
              useChatStore.getState().syncRoomMessages(data.chatMessages);
            }

            if (data.gameState) {
              syncServerGameState(data.gameState, computedSeat);
            } else if (data.room && members.length > 0) {
              const players: PlayerState[] = members.map((m: any, idx: number) => {
                const profileName = m.profiles?.display_name || m.profiles?.username || `Player ${m.seat + 1}`;
                const profileAvatar = m.profiles?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.seat}`;
                const p = createInitialPlayer(m.user_id || `usr_${m.seat}`, profileName, profileAvatar, m.seat ?? idx);
                p.isReady = m.is_ready ?? false;
                return p;
              });
              initRoomGame(activeRoomCode, players, computedSeat ?? 0);
            }
          }
        }
      } catch (e) {}
    };

    fetchLatestState();

    let channel: BroadcastChannel | null = null;
    let chatChannel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined') {
      try {
        channel = new BroadcastChannel(`304_game_${activeRoomCode}`);
        channel.onmessage = (event) => {
          if (event.data?.type === 'GAME_STATE_UPDATE' && event.data.gameState && isMounted) {
            syncServerGameState(event.data.gameState);
          }
        };

        chatChannel = new BroadcastChannel(`304_chat_${activeRoomCode}`);
        chatChannel.onmessage = (event) => {
          if (isMounted) {
            if (event.data?.type === 'CHAT_MESSAGE' && event.data.message) {
              useChatStore.getState().syncRoomMessages([event.data.message]);
            } else if (event.data?.type === 'FLOATING_REACTION' && event.data.reaction) {
              const incomingReaction = event.data.reaction;
              useChatStore.setState((state) => ({
                activeReactions: state.activeReactions.some((r) => r.id === incomingReaction.id)
                  ? state.activeReactions
                  : [...state.activeReactions, incomingReaction],
              }));
            }
          }
        };
      } catch (e) {}
    }

    const interval = setInterval(fetchLatestState, 1200);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (channel) channel.close();
      if (chatChannel) chatChannel.close();
    };
  }, [currentRoom?.roomCode, gameState?.roomId, syncServerGameState, initRoomGame, user]);

  const { unreadCount, toggleChat, activeReactions } = useChatStore();
  const { isSpeakingMap } = useVoiceStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [isHonestConfirmOpen, setIsHonestConfirmOpen] = useState(false);
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isPrivateTrumpModalOpen, setIsPrivateTrumpModalOpen] = useState(false);

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center font-black text-slate-950 text-2xl shadow-xl shadow-amber-500/20 animate-pulse">
            304
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-100 tracking-wider">RESTORING MATCH...</h2>
            <p className="text-xs text-amber-400 font-bold uppercase tracking-widest mt-1">
              Synchronizing game state from server
            </p>
          </div>
          <div className="w-36 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 rounded-full animate-pulse w-full" />
          </div>
        </div>
      </div>
    );
  }

  const userSeat = React.useMemo(() => {
    if (!user || !gameState?.players) return localSeat;
    const match = gameState.players.find(
      (p) =>
        p.id === user.id ||
        (user.display_name && p.name.trim().toLowerCase() === user.display_name.trim().toLowerCase())
    );
    return match ? match.seat : localSeat;
  }, [user, gameState?.players, localSeat]);

  const localPlayer = gameState.players.find((p) => p.seat === userSeat) || gameState.players[0];
  const isMyTurn = gameState.currentTurnSeat === userSeat;
  const isHonestAvailable = canDeclareHonestGame(gameState, userSeat);

  const isTrumpMaker =
    (gameState.honestGamePlacedBySeat !== undefined && gameState.honestGamePlacedBySeat === userSeat) ||
    gameState.bidding.bidderSeat === userSeat;
  const canManageTrump = isTrumpMaker && !gameState.trumpRevealed && gameState.trumpMode === 'CLOSED';

  const isPendingVoidChoiceForMe = gameState.pendingVoidChoiceSeat === userSeat;
  const isPendingFlipSelectForMe = gameState.pendingFlipSelectSeat === userSeat;

  const isBiddingStage =
    gameState.status === 'FOUR_CARD_BIDDING' ||
    gameState.status === 'EIGHT_CARD_BIDDING' ||
    gameState.status === 'REDEAL_CHECK';
  const isMyTurnToBid = isBiddingStage && gameState.currentTurnSeat === userSeat;
  const isRedealEligibleForMe = gameState.status === 'REDEAL_CHECK' && gameState.redealEligibleSeat === userSeat;

  const isTrumpSelectionStage = gameState.status === 'TRUMP_SELECTION_4' || gameState.status === 'TRUMP_REPLACEMENT_8';
  const isMyTurnToSelectTrump = isTrumpSelectionStage && gameState.currentTurnSeat === userSeat;

  const leadSuit = gameState.currentTrick?.cardsPlayed.length
    ? gameState.currentTrick.cardsPlayed[0].card.suit
    : null;

  const relativeSeats: Record<'south' | 'east' | 'north' | 'west', PlayerState | undefined> = {
    south: gameState.players.find((p) => getRelativeSeatPosition(p.seat) === 'south'),
    east: gameState.players.find((p) => getRelativeSeatPosition(p.seat) === 'east'),
    north: gameState.players.find((p) => getRelativeSeatPosition(p.seat) === 'north'),
    west: gameState.players.find((p) => getRelativeSeatPosition(p.seat) === 'west'),
  };

  const getPlayedCardForSeat = (seatNumber?: number): PlayedCard | undefined => {
    if (seatNumber === undefined || !gameState.currentTrick) return undefined;
    return gameState.currentTrick.cardsPlayed.find((pc) => pc.seat === seatNumber);
  };

  const isPartnerHighBidderIn8Card =
    gameState.status === 'EIGHT_CARD_BIDDING' &&
    gameState.bidding.bidderSeat !== null &&
    gameState.bidding.bidderSeat % 2 === localPlayer.team;

  const currentTurnPlayer = gameState.players[gameState.currentTurnSeat];

  return (
    <div className="relative w-full h-[100dvh] max-w-full bg-slate-950 flex flex-col items-center justify-between overflow-hidden select-none">
      {/* Dark Ambient Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#153327_0%,#08120d_70%,#020604_100%)] opacity-95 pointer-events-none" />

      {/* Floating Reactions Layer */}
      <FloatingReactions reactions={activeReactions} getRelativeSeatPosition={getRelativeSeatPosition} />

      {/* 1. TOP RESPONSIVE HEADER BAR */}
      <GameHeader
        gameState={gameState}
        unreadCount={unreadCount}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        onToggleChat={toggleChat}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        onLeaveMatch={() => setIsLeaveConfirmOpen(true)}
      />

      {/* 2. MAIN CENTERED RESPONSIVE GAME TABLE AREA */}
      <main className="relative flex-1 w-full max-w-6xl mx-auto px-1.5 py-1 flex items-center justify-center overflow-hidden min-h-0">
        {/* Felt Card Table Container (Fills height on mobile, 16:9 on desktop) */}
        <div className="relative w-full h-full max-w-4xl sm:aspect-[16/9] sm:max-h-[70vh] rounded-2xl sm:rounded-[3.5rem] bg-[radial-gradient(ellipse_at_center,#123826_0%,#091d13_65%,#030a06_100%)] border border-amber-500/20 shadow-[0_0_60px_rgba(0,0,0,0.8)] flex items-center justify-center p-2 sm:p-4 overflow-hidden my-auto">
          {/* Outer Gold Felt Border Ring */}
          <div className="absolute inset-2 sm:inset-3 rounded-[2rem] sm:rounded-[3rem] border border-amber-500/15 pointer-events-none" />

          {/* Trump Status & Control Pill (Top-Left of Felt Table) */}
          <TrumpStatus
            gameState={gameState}
            userSeat={userSeat}
            canManageTrump={canManageTrump}
            onSeeTrump={() => {
              dispatchAction({ type: 'SEE_TRUMP', seat: userSeat });
              setIsPrivateTrumpModalOpen(true);
            }}
            onRevealTrump={() => {
              dispatchAction({ type: 'REVEAL_TRUMP', seat: userSeat });
            }}
          />

          {/* Turn Status Banner (Top-Center of Felt Table) */}
          <TurnStatusBanner
            isMyTurn={isMyTurn}
            currentTurnPlayerName={currentTurnPlayer?.name}
            lastActionMessage={gameState.lastActionMessage}
          />

          {/* PLAYER SEATS (North, West, East, South) */}
          {relativeSeats.north && (
            <PlayerSeat
              player={relativeSeats.north}
              isTurn={gameState.currentTurnSeat === relativeSeats.north.seat}
              isDealer={gameState.dealerSeat === relativeSeats.north.seat}
              isSpeaking={isSpeakingMap[relativeSeats.north.seat]}
              position="north"
            />
          )}
          {relativeSeats.west && (
            <PlayerSeat
              player={relativeSeats.west}
              isTurn={gameState.currentTurnSeat === relativeSeats.west.seat}
              isDealer={gameState.dealerSeat === relativeSeats.west.seat}
              isSpeaking={isSpeakingMap[relativeSeats.west.seat]}
              position="west"
            />
          )}
          {relativeSeats.east && (
            <PlayerSeat
              player={relativeSeats.east}
              isTurn={gameState.currentTurnSeat === relativeSeats.east.seat}
              isDealer={gameState.dealerSeat === relativeSeats.east.seat}
              isSpeaking={isSpeakingMap[relativeSeats.east.seat]}
              position="east"
            />
          )}
          {relativeSeats.south && (
            <PlayerSeat
              player={relativeSeats.south}
              isTurn={gameState.currentTurnSeat === relativeSeats.south.seat}
              isDealer={gameState.dealerSeat === relativeSeats.south.seat}
              isSpeaking={isSpeakingMap[relativeSeats.south.seat]}
              position="south"
              isMe={true}
            />
          )}

          {/* CENTRAL TRICK AREA */}
          <TrickArea
            gameState={gameState}
            getPlayedCardForSeat={getPlayedCardForSeat}
            relativeSeats={relativeSeats}
          />
        </div>
      </main>

      {/* 3. VOID DECISION OVERLAY (Permission-Aware Options) */}
      <VoidChoiceOverlay
        isOpen={isPendingVoidChoiceForMe}
        leadSuit={leadSuit}
        isTrumpMaker={isTrumpMaker}
        onChooseOption={(option) => dispatchAction({ type: 'CHOOSE_VOID_OPTION', seat: userSeat, option })}
      />

      {/* 4. PLAYER HAND (Bottom Controls Area) */}
      <footer className="relative z-30 w-full pb-safe pt-1 sm:pt-2 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center">
        <CardHand
          cards={localPlayer.cards}
          selectedCardId={selectedCardId}
          isMyTurn={isMyTurn || isMyTurnToSelectTrump}
          leadSuit={leadSuit}
          trumpSuit={gameState.trumpSuit}
          trumpRevealed={gameState.trumpRevealed}
          isGambleSelectMode={isPendingFlipSelectForMe}
          isTrumpSelectMode={isMyTurnToSelectTrump}
          onSelectCard={(cardId) => setSelectedCard(cardId)}
          onPlayCard={(cardId) => dispatchAction({ type: 'PLAY_CARD', seat: userSeat, cardId })}
        />
      </footer>

      {/* --- MODALS & GAME DIALOGS --- */}
      {isBiddingStage && (
        <BiddingModal
          currentHighBid={gameState.bidding.currentHighBid}
          bidderName={
            gameState.bidding.bidderSeat !== null
              ? gameState.players[gameState.bidding.bidderSeat]?.name
              : undefined
          }
          isMyTurnToBid={isMyTurnToBid}
          bidStage={gameState.bidding.bidStage || '4_CARD'}
          isPartnerHighBidder={isPartnerHighBidderIn8Card}
          playerTurnCount={localPlayer.bidTurnsCount || 0}
          isRedealEligible={isRedealEligibleForMe}
          onPlaceBid={(amount) => dispatchAction({ type: 'PLACE_BID', seat: userSeat, amount })}
          onPass={() => dispatchAction({ type: 'PASS_BID', seat: userSeat })}
          onRequestRedeal={() => dispatchAction({ type: 'REQUEST_REDEAL', seat: userSeat })}
          onSkipRedeal={() => dispatchAction({ type: 'SKIP_REDEAL', seat: userSeat })}
          onDeclarePartnerCloseCaps={() => dispatchAction({ type: 'DECLARE_PARTNER_CLOSE_CAPS', seat: userSeat })}
          onDeclareHonestGame={isHonestAvailable ? () => setIsHonestConfirmOpen(true) : undefined}
        />
      )}

      {/* Physical Card-Based Trump Selector Modal */}
      {isMyTurnToSelectTrump && (
        <TrumpSelectorModal
          isMyTurnToSelect={true}
          bidderName={localPlayer.name}
          winningBid={gameState.bidding.currentHighBid}
          playerCards={localPlayer.cards}
          onSelectTrumpCard={(cardId, mode) => {
            dispatchAction({
              type: 'SELECT_TRUMP',
              seat: userSeat,
              cardId,
              mode,
            });
          }}
        />
      )}

      <HonestGameModal
        isOpen={isHonestConfirmOpen}
        onConfirm={() => {
          dispatchAction({ type: 'DECLARE_HONEST_GAME', seat: userSeat });
          setIsHonestConfirmOpen(false);
        }}
        onCancel={() => setIsHonestConfirmOpen(false)}
      />

      <FinishGameConfirmModal
        isOpen={isFinishConfirmOpen}
        onClose={() => setIsFinishConfirmOpen(false)}
        onConfirmFinish={() => {
          dispatchAction({ type: 'CONFIRM_FINISH_GAME', seat: userSeat });
          setIsFinishConfirmOpen(false);
        }}
      />

      <PrivateTrumpModal
        isOpen={isPrivateTrumpModalOpen}
        trumpCard={gameState.trumpCard}
        trumpSuit={gameState.trumpSuit}
        onClose={() => setIsPrivateTrumpModalOpen(false)}
        onRevealToAll={() => {
          dispatchAction({ type: 'REVEAL_TRUMP', seat: userSeat });
        }}
      />

      {/* LEAVE MATCH CONFIRMATION MODAL */}
      <AnimatePresence>
        {isLeaveConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3 border border-rose-500/30">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-100 mb-1">LEAVE MATCH?</h3>
              <p className="text-xs text-slate-400 mb-6">
                Your current table progress will remain active in the room. You can return anytime.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLeaveConfirmOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  STAY
                </button>
                <button
                  onClick={() => {
                    setIsLeaveConfirmOpen(false);
                    onBackToLobby();
                  }}
                  className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
                >
                  LEAVE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GAME SETTINGS DRAWER */}
      <GameSettingsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        gameState={gameState}
        isMuted={isMuted}
        onToggleMute={() => setIsMuted(!isMuted)}
        isBotModeEnabled={isBotModeEnabled}
        onToggleBotMode={toggleBotMode}
        onLeaveMatch={() => {
          setIsDrawerOpen(false);
          setIsLeaveConfirmOpen(true);
        }}
      />

      {/* CHAT & VOICE PANELS */}
      <ChatSheet localSeat={userSeat} />
      <VoiceControlsBar onOpenSettings={() => setIsVoiceSettingsOpen(true)} />
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
        players={gameState.players}
      />
    </div>
  );
};
