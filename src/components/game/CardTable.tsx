'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/useGameStore';
import { useChatStore } from '../../stores/useChatStore';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { CardHand } from './CardHand';
import { PlayingCard } from '../cards/PlayingCard';
import { BiddingModal } from './BiddingModal';
import { TrumpCardSelectorConfirmModal } from './TrumpCardSelectorConfirmModal';
import { MatchResultsModal } from './MatchResultsModal';
import { FloatingReactions } from '../chat/FloatingReactions';
import { ChatSheet } from '../chat/ChatSheet';
import { VoiceControlsBar } from '../voice/VoiceControlsBar';
import { VoiceSettingsModal } from '../voice/VoiceSettingsModal';
import { HonestGameModal } from './HonestGameModal';
import { canDeclarePCC } from '../../lib/game-engine/pccRules';
import { canDeclareHonestGame, canViewTrumpCard } from '../../lib/game-engine/honestGameRules';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../../lib/game-engine/cardValues';
import { MessageSquare, Volume2, VolumeX, Bot, ArrowLeft, ShieldCheck, Flame, Eye, Mic } from 'lucide-react';
import { PlayerState, PlayedCard, Card } from '../../lib/game-engine/types';

interface CardTableProps {
  onBackToLobby: () => void;
}

export const CardTable: React.FC<CardTableProps> = ({ onBackToLobby }) => {
  const {
    gameState,
    localSeat,
    selectedCardId,
    isBotModeEnabled,
    setSelectedCard,
    toggleBotMode,
    dispatchAction,
    getRelativeSeatPosition,
  } = useGameStore();

  const { unreadCount, toggleChat, activeReactions } = useChatStore();
  const { isSpeakingMap } = useVoiceStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [isHonestConfirmOpen, setIsHonestConfirmOpen] = useState(false);
  const [proposedTrumpMode, setProposedTrumpMode] = useState<'OPEN' | 'CLOSED'>('CLOSED');

  if (!gameState) return null;

  const localPlayer = gameState.players.find((p) => p.seat === localSeat) || gameState.players[0];
  const isMyTurn = gameState.currentTurnSeat === localSeat;
  const isPccAvailable = canDeclarePCC(gameState, localSeat);
  const isHonestAvailable = canDeclareHonestGame(gameState, localSeat);
  const isAuthorizedToSeeTrump = canViewTrumpCard(gameState, localSeat);
  const isPendingVoidChoiceForMe = gameState.pendingVoidChoiceSeat === localSeat;
  const isPendingFlipSelectForMe = gameState.pendingFlipSelectSeat === localSeat;
  const isMyTurnToSelectTrump = gameState.status === 'TRUMP_SELECTION' && gameState.bidding.bidderSeat === localSeat;
  const proposedTrumpCard = isMyTurnToSelectTrump && selectedCardId ? localPlayer.cards.find(c => c.id === selectedCardId) : null;

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

  return (
    <div className="relative w-full min-h-screen bg-slate-950 flex flex-col items-center justify-between overflow-hidden select-none">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#153327_0%,#08120d_70%,#020604_100%)] opacity-90 pointer-events-none" />

      {/* Floating Reactions Layer */}
      <FloatingReactions reactions={activeReactions} getRelativeSeatPosition={getRelativeSeatPosition} />

      {/* 1. TOP HEADER NAVIGATION & SCOREBOARD */}
      <header className="relative z-30 w-full px-4 py-3 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-2">
        {/* Left: Back Button, Room Title, & Honest Play Badge */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLobby}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="Leave Game"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase block">304 MATCH</span>
              {/* Honest Play Trust Indicator */}
              <span className="px-2 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 font-extrabold text-[9px] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>HONEST PLAY ACTIVE</span>
              </span>
            </div>
            <span className="text-xs font-bold text-slate-200">ROOM {gameState.roomId}</span>
          </div>
        </div>

        {/* Center: Team Score Pill & PCC / Honest Game Button */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 bg-slate-900/90 border border-slate-700/80 px-4 py-1.5 rounded-full shadow-lg">
            <div className="text-right">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter block">TEAM A</span>
              <span className="text-sm font-black text-amber-400">{gameState.teamAScore}</span>
            </div>

            <span className="text-slate-600 font-bold text-xs">:</span>

            <div className="text-left">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-tighter block">TEAM B</span>
              <span className="text-sm font-black text-emerald-400">{gameState.teamBScore}</span>
            </div>
          </div>

          {/* Honest Game Status Badge */}
          {gameState.honestGame && (
            <span className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md">
              <Flame className="w-3.5 h-3.5 fill-current text-amber-400 animate-pulse" />
              <span>HONEST GAME (250+)</span>
            </span>
          )}

          {/* PCC Challenge Button */}
          {isPccAvailable && (
            <button
              onClick={() => dispatchAction({ type: 'DECLARE_PCC', seat: localSeat })}
              className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 flex items-center gap-1 animate-bounce cursor-pointer"
              title="Declare PCC (304 Cap Challenge)"
            >
              <Flame className="w-3.5 h-3.5 fill-current" />
              <span>DECLARE PCC</span>
            </button>
          )}
        </div>

        {/* Right: Voice Controls, Sound, Bot AI, & Chat Controls */}
        <div className="flex items-center gap-2">
          {/* WebRTC Voice Controls Bar */}
          <VoiceControlsBar onOpenSettings={() => setIsVoiceSettingsOpen(true)} />

          <button
            onClick={() => toggleBotMode()}
            className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isBotModeEnabled
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle Bot Players"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden sm:inline">BOTS {isBotModeEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => toggleChat()}
            className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-black text-[9px] animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 2. POLISHED 2D GAME FELT TABLE AREA */}
      <main className="relative z-10 flex-1 w-full max-w-5xl px-2 py-4 flex flex-col items-center justify-center">
        <div
          onClick={() => {
            if (gameState.status === 'TRICK_COMPLETE') {
              dispatchAction({ type: 'NEXT_TRICK' });
            }
          }}
          className={`relative w-full h-[62vh] max-h-[540px] rounded-[40px] sm:rounded-[80px] table-felt-pattern table-felt-border flex items-center justify-center ${
            gameState.status === 'TRICK_COMPLETE' ? 'cursor-pointer' : ''
          }`}
        >
          {/* Active Status Banner */}
          <div className="absolute top-4 inset-x-0 flex justify-center pointer-events-none z-20">
            <div className="px-4 py-1 rounded-full bg-slate-950/80 border border-emerald-500/30 text-[11px] font-bold text-emerald-300 shadow-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>
                {gameState.lastActionMessage}
                {gameState.status === 'TRICK_COMPLETE' ? ' (Click table to skip)' : ''}
              </span>
            </div>
          </div>

          {/* 3. CLOSED TRUMP AREA (Top-Left of 2D Table) */}
          {gameState.trumpMode === 'CLOSED' && (
            <div className="absolute top-4 left-6 sm:top-6 sm:left-10 z-30 flex flex-col items-center">
              <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1 drop-shadow-md pointer-events-none">
                CLOSED TRUMP
              </span>
              <div className="w-12 h-16 sm:w-14 sm:h-20 rounded-lg bg-gradient-to-br from-amber-700 via-amber-900 to-amber-950 border-2 border-amber-400/70 flex items-center justify-center shadow-2xl relative overflow-hidden">
                <div className="absolute inset-1 border border-amber-400/40 rounded bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:6px_6px] opacity-70" />
                <span className="text-2xl sm:text-3xl text-amber-200 font-serif z-10">🂠</span>
              </div>

              {/* SEE TRUMP BUTTON (Only for Authorized Player who placed Trump) */}
              {isAuthorizedToSeeTrump && !gameState.trumpRevealed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatchAction({ type: 'SEE_TRUMP', seat: localSeat });
                  }}
                  className="mt-2 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-lg flex items-center gap-1 cursor-pointer active:scale-95 z-30 animate-pulse"
                >
                  <Eye className="w-3 h-3 stroke-[3]" />
                  <span>SEE TRUMP</span>
                </button>
              )}
            </div>
          )}

          {/* Open Trump Badge (if open mode or revealed) */}
          {gameState.trumpSuit && (gameState.trumpMode === 'OPEN' || gameState.trumpRevealed) && (
            <div className="absolute top-4 left-6 sm:top-6 sm:left-10 px-3.5 py-1.5 rounded-2xl bg-slate-950/90 border border-amber-500/50 text-xs font-bold text-slate-200 flex items-center gap-2 shadow-xl z-20">
              <span className="text-[10px] text-amber-400 uppercase tracking-widest">TRUMP:</span>
              <span className={`text-lg font-black ${SUIT_COLORS[gameState.trumpSuit] === 'red' ? 'text-rose-500' : 'text-slate-100'}`}>
                {SUIT_SYMBOLS[gameState.trumpSuit]}
              </span>
              <span className="text-[10px] text-slate-400 border-l border-slate-800 pl-2">
                BID: {gameState.bidding.currentHighBid}
              </span>
            </div>
          )}

          {/* PLAYER AVATAR SEAT BADGES */}
          {relativeSeats.north && (
            <PlayerAvatarSeat
              player={relativeSeats.north}
              isTurn={gameState.currentTurnSeat === relativeSeats.north.seat}
              isDealer={gameState.dealerSeat === relativeSeats.north.seat}
              isSpeaking={isSpeakingMap[relativeSeats.north.seat]}
              position="north"
            />
          )}
          {relativeSeats.west && (
            <PlayerAvatarSeat
              player={relativeSeats.west}
              isTurn={gameState.currentTurnSeat === relativeSeats.west.seat}
              isDealer={gameState.dealerSeat === relativeSeats.west.seat}
              isSpeaking={isSpeakingMap[relativeSeats.west.seat]}
              position="west"
            />
          )}
          {relativeSeats.east && (
            <PlayerAvatarSeat
              player={relativeSeats.east}
              isTurn={gameState.currentTurnSeat === relativeSeats.east.seat}
              isDealer={gameState.dealerSeat === relativeSeats.east.seat}
              isSpeaking={isSpeakingMap[relativeSeats.east.seat]}
              position="east"
            />
          )}
          {relativeSeats.south && (
            <PlayerAvatarSeat
              player={relativeSeats.south}
              isTurn={gameState.currentTurnSeat === relativeSeats.south.seat}
              isDealer={gameState.dealerSeat === relativeSeats.south.seat}
              isSpeaking={isSpeakingMap[relativeSeats.south.seat]}
              position="south"
            />
          )}

          {/* --- CENTER TRICK CARDS PLAYED AREA --- */}
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
            {relativeSeats.south && getPlayedCardForSeat(relativeSeats.south.seat) && (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 25, opacity: 1, rotateY: getPlayedCardForSeat(relativeSeats.south.seat)?.isFaceDown ? 180 : 0 }}
                transition={{ duration: 0.4 }}
                className="absolute z-20"
              >
                <PlayingCard
                  card={getPlayedCardForSeat(relativeSeats.south.seat)?.card}
                  faceDown={getPlayedCardForSeat(relativeSeats.south.seat)?.isFaceDown}
                  size="sm"
                  isWinningCard={gameState.currentTrick?.winnerSeat === relativeSeats.south.seat}
                />
              </motion.div>
            )}

            {relativeSeats.west && getPlayedCardForSeat(relativeSeats.west.seat) && (
              <motion.div
                initial={{ x: -80, opacity: 0 }}
                animate={{ x: -35, opacity: 1, rotateY: getPlayedCardForSeat(relativeSeats.west.seat)?.isFaceDown ? 180 : 0 }}
                transition={{ duration: 0.4 }}
                className="absolute z-20"
              >
                <PlayingCard
                  card={getPlayedCardForSeat(relativeSeats.west.seat)?.card}
                  faceDown={getPlayedCardForSeat(relativeSeats.west.seat)?.isFaceDown}
                  size="sm"
                  isWinningCard={gameState.currentTrick?.winnerSeat === relativeSeats.west.seat}
                />
              </motion.div>
            )}

            {relativeSeats.north && getPlayedCardForSeat(relativeSeats.north.seat) && (
              <motion.div
                initial={{ y: -80, opacity: 0 }}
                animate={{ y: -25, opacity: 1, rotateY: getPlayedCardForSeat(relativeSeats.north.seat)?.isFaceDown ? 180 : 0 }}
                transition={{ duration: 0.4 }}
                className="absolute z-20"
              >
                <PlayingCard
                  card={getPlayedCardForSeat(relativeSeats.north.seat)?.card}
                  faceDown={getPlayedCardForSeat(relativeSeats.north.seat)?.isFaceDown}
                  size="sm"
                  isWinningCard={gameState.currentTrick?.winnerSeat === relativeSeats.north.seat}
                />
              </motion.div>
            )}

            {relativeSeats.east && getPlayedCardForSeat(relativeSeats.east.seat) && (
              <motion.div
                initial={{ x: 80, opacity: 0 }}
                animate={{ x: 35, opacity: 1, rotateY: getPlayedCardForSeat(relativeSeats.east.seat)?.isFaceDown ? 180 : 0 }}
                transition={{ duration: 0.4 }}
                className="absolute z-20"
              >
                <PlayingCard
                  card={getPlayedCardForSeat(relativeSeats.east.seat)?.card}
                  faceDown={getPlayedCardForSeat(relativeSeats.east.seat)?.isFaceDown}
                  size="sm"
                  isWinningCard={gameState.currentTrick?.winnerSeat === relativeSeats.east.seat}
                />
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* 4. SPECIAL VOID DECISION PANEL OVERLAY (Rule 6: YOU DON'T HAVE [SUIT]) */}
      <AnimatePresence>
        {isPendingVoidChoiceForMe && (
          <div className="absolute inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="bg-slate-900 border-2 border-amber-500/80 p-6 sm:p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 animate-pulse" />

              <h3 className="text-sm font-extrabold text-amber-400 uppercase tracking-widest mb-1">
                YOU DON'T HAVE {leadSuit ? SUIT_SYMBOLS[leadSuit] : ''}
              </h3>
              <p className="text-xs text-slate-300 font-bold tracking-wide mb-6">
                CHOOSE YOUR PLAY
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => dispatchAction({ type: 'CHOOSE_VOID_OPTION', seat: localSeat, option: 'USE_TRUMP' })}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-sm uppercase tracking-wider hover:brightness-110 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>🔒 USE TRUMP</span>
                </button>

                <button
                  onClick={() => dispatchAction({ type: 'CHOOSE_VOID_OPTION', seat: localSeat, option: 'FLIP_CARD' })}
                  className="w-full py-3.5 rounded-2xl bg-slate-800 border border-slate-600 text-slate-100 font-black text-sm uppercase tracking-wider hover:bg-slate-700 transition-all cursor-pointer shadow-lg active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>🃏 FLIP A CARD</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. BOTTOM CARDS HAND AREA */}
      <footer className="relative z-30 w-full pb-safe pt-2 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent flex flex-col items-center">
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
          onPlayCard={(cardId) => dispatchAction({ type: 'PLAY_CARD', seat: localSeat, cardId })}
        />
      </footer>

      {/* --- MODALS & SHEETS --- */}
      {gameState.status === 'BIDDING' && (
        <BiddingModal
          currentHighBid={gameState.bidding.currentHighBid}
          bidderName={
            gameState.bidding.bidderSeat !== null
              ? gameState.players[gameState.bidding.bidderSeat]?.name
              : undefined
          }
          isMyTurnToBid={gameState.currentTurnSeat === localSeat}
          onPlaceBid={(amount) => dispatchAction({ type: 'PLACE_BID', seat: localSeat, amount })}
          onPass={() => dispatchAction({ type: 'PASS_BID', seat: localSeat })}
          onDeclareHonestGame={isHonestAvailable ? () => setIsHonestConfirmOpen(true) : undefined}
        />
      )}

      <HonestGameModal
        isOpen={isHonestConfirmOpen}
        onConfirm={() => {
          dispatchAction({ type: 'DECLARE_HONEST_GAME', seat: localSeat });
          setIsHonestConfirmOpen(false);
        }}
        onCancel={() => setIsHonestConfirmOpen(false)}
      />

      {/* Physical Card-Based Trump Confirmation Modal */}
      {isMyTurnToSelectTrump && proposedTrumpCard && (
        <TrumpCardSelectorConfirmModal
          selectedCard={proposedTrumpCard}
          winningBid={gameState.bidding.currentHighBid}
          mode={proposedTrumpMode}
          onModeChange={setProposedTrumpMode}
          onChangeCard={() => setSelectedCard(null)}
          onConfirmTrump={() => {
            dispatchAction({
              type: 'SELECT_TRUMP',
              seat: localSeat,
              cardId: proposedTrumpCard.id,
              suit: proposedTrumpCard.suit,
              mode: proposedTrumpMode,
            });
            setSelectedCard(null);
          }}
        />
      )}

      {/* Opponent Trump Selection Waiting Banner */}
      {gameState.status === 'TRUMP_SELECTION' && !isMyTurnToSelectTrump && (
        <div className="fixed inset-x-4 top-20 z-40 max-w-sm mx-auto bg-slate-900/90 backdrop-blur-md border border-amber-500/30 rounded-2xl p-4 shadow-2xl text-center">
          <h4 className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">Trump Selection</h4>
          <p className="text-slate-200 text-sm font-medium">
            {gameState.players[gameState.bidding.bidderSeat ?? 0]?.name} is picking a physical card from their hand as Trump...
          </p>
        </div>
      )}

      {gameState.status === 'GAME_COMPLETE' && (
        <MatchResultsModal
          gameState={gameState}
          onRematch={() => dispatchAction({ type: 'REMATCH' })}
          onBackToLobby={onBackToLobby}
        />
      )}

      <ChatSheet localSeat={localSeat} />
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
        players={gameState.players}
      />
    </div>
  );
};

/* Sub-component: Player Avatar Seat Badge with Voice Indicator */
interface PlayerAvatarSeatProps {
  player: PlayerState;
  isTurn: boolean;
  isDealer: boolean;
  isSpeaking?: boolean;
  position: 'south' | 'east' | 'north' | 'west';
}

const PlayerAvatarSeat: React.FC<PlayerAvatarSeatProps> = ({
  player,
  isTurn,
  isDealer,
  isSpeaking = false,
  position,
}) => {
  const posClasses = {
    north: 'top-3 left-1/2 -translate-x-1/2',
    south: 'bottom-3 left-1/2 -translate-x-1/2',
    east: 'right-3 top-1/2 -translate-y-1/2',
    west: 'left-3 top-1/2 -translate-y-1/2',
  }[position];

  return (
    <div className={`absolute z-20 flex flex-col items-center pointer-events-none ${posClasses}`}>
      <div className="relative">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 flex items-center justify-center transition-all ${
            isSpeaking
              ? 'ring-4 ring-emerald-400 animate-pulse shadow-emerald-500/80 shadow-2xl scale-110'
              : isTurn
              ? 'ring-4 ring-amber-400 animate-turn-glow shadow-amber-500/50 shadow-xl'
              : 'border-2 border-slate-700/80 bg-slate-900/80'
          }`}
        >
          <img
            src={player.avatar}
            alt={player.name}
            className="w-full h-full rounded-full bg-slate-800 object-cover"
          />
        </div>

        {/* Live Speaking Indicator Mic Icon */}
        {isSpeaking && (
          <span className="absolute -top-1 -left-1 p-1 rounded-full bg-emerald-500 text-slate-950 shadow-md animate-bounce">
            <Mic className="w-3 h-3 stroke-[3]" />
          </span>
        )}

        {isDealer && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] shadow-sm">
            D
          </span>
        )}

        <span
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
            player.team === 0 ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
          }`}
        >
          {player.team === 0 ? 'TEAM A' : 'TEAM B'}
        </span>
      </div>

      <div className="mt-2 px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-slate-800/80 flex items-center gap-1.5 shadow-md">
        <span className="text-[11px] font-bold text-slate-200 truncate max-w-[90px]">
          {player.name}
        </span>
        <span className="text-[10px] text-amber-400 font-bold">🂠 {player.cardCount}</span>
      </div>
    </div>
  );
};
