'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../stores/useGameStore';
import { useChatStore } from '../../stores/useChatStore';
import { useVoiceStore } from '../../stores/useVoiceStore';
import { notify } from '../../stores/useNotificationStore';
import { CardHand } from './CardHand';
import { PlayingCard } from '../cards/PlayingCard';
import { BiddingModal } from './BiddingModal';
import { TrumpSelectorModal } from './TrumpSelectorModal';
import { TrumpCardSelectorConfirmModal } from './TrumpCardSelectorConfirmModal';
import { MatchResultsModal } from './MatchResultsModal';
import { FloatingReactions } from '../chat/FloatingReactions';
import { ChatSheet } from '../chat/ChatSheet';
import { VoiceControlsBar } from '../voice/VoiceControlsBar';
import { VoiceSettingsModal } from '../voice/VoiceSettingsModal';
import { FinishGameConfirmModal } from './FinishGameConfirmModal';
import { HonestGameModal } from './HonestGameModal';
import { canDeclarePCC } from '../../lib/game-engine/pccRules';
import { canDeclareHonestGame, canViewTrumpCard } from '../../lib/game-engine/honestGameRules';
import { SUIT_SYMBOLS, SUIT_COLORS } from '../../lib/game-engine/cardValues';
import { MessageSquare, Volume2, VolumeX, Bot, ArrowLeft, ShieldCheck, Flame, Eye, Mic, ShieldAlert, Sparkles, Coins, Flag, Check } from 'lucide-react';
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
  const [isFinishConfirmOpen, setIsFinishConfirmOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [proposedTrumpMode, setProposedTrumpMode] = useState<'OPEN' | 'CLOSED'>('CLOSED');

  if (!gameState) return null;

  const localPlayer = gameState.players.find((p) => p.seat === localSeat) || gameState.players[0];
  const isMyTurn = gameState.currentTurnSeat === localSeat;
  const isPccAvailable = canDeclarePCC(gameState, localSeat);
  const isHonestAvailable = canDeclareHonestGame(gameState, localSeat);
  const isAuthorizedToSeeTrump = canViewTrumpCard(gameState, localSeat);
  const isPendingVoidChoiceForMe = gameState.pendingVoidChoiceSeat === localSeat;
  const isPendingFlipSelectForMe = gameState.pendingFlipSelectSeat === localSeat;

  const isBiddingStage = gameState.status === 'FOUR_CARD_BIDDING' || gameState.status === 'EIGHT_CARD_BIDDING' || gameState.status === 'REDEAL_CHECK';
  const isMyTurnToBid = isBiddingStage && gameState.currentTurnSeat === localSeat;
  const isRedealEligibleForMe = gameState.status === 'REDEAL_CHECK' && gameState.redealEligibleSeat === localSeat;

  const isTrumpSelectionStage = gameState.status === 'TRUMP_SELECTION_4' || gameState.status === 'TRUMP_REPLACEMENT_8';
  const isMyTurnToSelectTrump = isTrumpSelectionStage && gameState.currentTurnSeat === localSeat;
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

  const isPartnerHighBidderIn8Card = gameState.status === 'EIGHT_CARD_BIDDING' && gameState.bidding.bidderSeat !== null && (gameState.bidding.bidderSeat % 2 === localPlayer.team);

  const targetLimit = gameState.targetScore ?? 22;
  const isTargetReached = Boolean(
    gameState.targetReached ||
    gameState.teamATokens >= targetLimit ||
    gameState.teamBTokens >= targetLimit ||
    gameState.teamATokens === 0 ||
    gameState.teamBTokens === 0
  );

  return (
    <div className="relative w-full h-[100dvh] max-w-full bg-slate-950 flex flex-col items-center justify-between overflow-hidden select-none">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#153327_0%,#08120d_70%,#020604_100%)] opacity-90 pointer-events-none" />

      {/* Floating Reactions Layer */}
      <FloatingReactions reactions={activeReactions} getRelativeSeatPosition={getRelativeSeatPosition} />

      {/* 1. TOP HEADER NAVIGATION & SCOREBOARD (COMPACT 1-ROW MOBILE FIRST) */}
      <header className="relative z-30 w-full px-2.5 sm:px-4 py-2 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between gap-1.5">
        {/* Left: Back Button & Compact Score */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLeaveConfirmOpen(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer active:scale-95"
            title="Leave Match"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 px-2.5 py-1 rounded-full shadow-md">
            <span className="text-[10px] font-black text-amber-400">A {gameState.teamAScore}</span>
            <span className="text-[10px] text-slate-500 font-bold">:</span>
            <span className="text-[10px] font-black text-emerald-400">{gameState.teamBScore} B</span>
          </div>

          {/* Tokens indicator compact */}
          <div
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="hidden xs:flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] font-bold text-amber-300 cursor-pointer"
          >
            <Coins className="w-3 h-3 text-amber-400" />
            <span>A:{gameState.teamATokens} | B:{gameState.teamBTokens}</span>
          </div>
        </div>

        {/* Center: Match Details & Target Reached Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="px-2.5 py-1 rounded-full bg-slate-900 border border-amber-500/30 text-amber-400 font-extrabold text-[10px] tracking-wider uppercase flex items-center gap-1 shadow-sm cursor-pointer hover:bg-slate-850"
          >
            <span>304 {gameState.roomId}</span>
            <span className="text-[9px] text-slate-400">▼</span>
          </button>

          {isTargetReached && gameState.status !== 'GAME_COMPLETE' && (
            <div className="flex items-center gap-1.5">
              <div className="hidden md:flex px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-extrabold text-[10px] items-center gap-1">
                <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                <span>Target Reached ✓</span>
              </div>
              <button
                onClick={() => setIsFinishConfirmOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-[10px] sm:text-xs shadow-lg flex items-center gap-1 cursor-pointer active:scale-95 transition-all"
              >
                <Flag className="w-3.5 h-3.5 text-slate-950 fill-slate-950" />
                <span>Finish Game</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1">
          <VoiceControlsBar onOpenSettings={() => setIsVoiceSettingsOpen(true)} />

          <button
            onClick={() => toggleBotMode()}
            className={`p-1.5 sm:p-2 rounded-xl border text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isBotModeEnabled
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
            title="Toggle Bot Players"
          >
            <Bot className="w-4 h-4" />
            <span className="hidden md:inline">BOTS {isBotModeEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            onClick={() => toggleChat()}
            className="relative p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer"
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

      {/* EXPANDABLE MATCH DETAILS POPDOWN DRAWER */}
      <AnimatePresence>
        {isDrawerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative z-25 w-full bg-slate-900/95 border-b border-amber-500/30 px-4 py-3 shadow-xl flex flex-wrap items-center justify-between gap-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-300 font-extrabold text-[9px] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>SRI LANKAN 304 RULES</span>
              </span>
              <span className="text-slate-400 font-semibold text-[10px]">
                Tokens Balance: Team A ({gameState.teamATokens}) vs Team B ({gameState.teamBTokens})
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Partner Close Caps Badge */}
              {gameState.isPartnerCloseCaps && (
                <span className="px-2.5 py-1 rounded-full bg-purple-500/20 border border-purple-400/50 text-purple-300 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Sparkles className="w-3 h-3 fill-current text-yellow-300" />
                  <span>PARTNER CLOSE CAPS</span>
                </span>
              )}

              {/* Honest Game Status Badge */}
              {gameState.honestGame && (
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Flame className="w-3 h-3 fill-current text-amber-400 animate-pulse" />
                  <span>HONEST GAME (250+)</span>
                </span>
              )}

              {/* Caps Claim Button */}
              {gameState.status === 'PLAYING' && !gameState.capsDeclared && (
                <button
                  onClick={() => dispatchAction({ type: 'DECLARE_CAPS', seat: localSeat })}
                  className="px-2.5 py-1 rounded-full bg-purple-600 text-white font-black text-[10px] shadow-lg hover:brightness-110 flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>DECLARE CAPS</span>
                </button>
              )}

              {/* Spoilt Trumps Button */}
              {gameState.status === 'PLAYING' && !gameState.isSpoiltTrumpsDeclared && (
                <button
                  onClick={() => {
                    try {
                      dispatchAction({ type: 'DECLARE_SPOILT_TRUMPS', seat: localSeat });
                    } catch (e: any) {
                      notify.error(e.message || 'Cannot declare Spoilt Trumps', 'ACTION FAILED');
                    }
                  }}
                  className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] border border-slate-700 hover:bg-slate-700 flex items-center gap-1 cursor-pointer"
                >
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  <span>SPOILT TRUMPS</span>
                </button>
              )}

              {/* PCC Challenge Button */}
              {isPccAvailable && (
                <button
                  onClick={() => dispatchAction({ type: 'DECLARE_PCC', seat: localSeat })}
                  className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-600 to-amber-500 text-slate-950 font-black text-[10px] shadow-lg hover:brightness-110 flex items-center gap-1 cursor-pointer"
                >
                  <Flame className="w-3 h-3 fill-current" />
                  <span>DECLARE PCC</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. POLISHED 2D GAME FELT TABLE AREA (FITS PERFECTLY IN REMAINING VIEWPORT) */}
      <main className="relative z-10 flex-1 w-full max-w-4xl px-2 my-1 flex items-center justify-center overflow-hidden">
        <div
          onClick={() => {
            if (gameState.status === 'TRICK_COMPLETE') {
              dispatchAction({ type: 'NEXT_TRICK' });
            }
          }}
          className={`relative w-full h-full max-h-[500px] rounded-[32px] sm:rounded-[60px] table-felt-pattern table-felt-border flex items-center justify-center overflow-hidden ${
            gameState.status === 'TRICK_COMPLETE' ? 'cursor-pointer' : ''
          }`}
        >
          {/* Active Status Banner (Positioned below North seat) */}
          <div className="absolute top-12 sm:top-14 inset-x-0 flex justify-center pointer-events-none z-20 px-2">
            <div className="px-3 py-1 rounded-full bg-slate-950/85 border border-emerald-500/40 text-[10px] sm:text-xs font-bold text-emerald-300 shadow-lg flex items-center gap-1.5 truncate max-w-[90%]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
              <span className="truncate">
                {gameState.lastActionMessage}
                {gameState.status === 'TRICK_COMPLETE' ? ' (Click to skip)' : ''}
              </span>
            </div>
          </div>

          {/* 3. TRUMP INDICATOR BADGE (Top-Left Compact Pill, Zero Collision) */}
          {gameState.trumpMode === 'CLOSED' && (
            <div className="absolute top-2 left-2 sm:top-3 sm:left-4 z-30 flex flex-col items-start gap-1">
              <div className="px-2.5 py-1 rounded-xl bg-slate-950/90 border border-amber-500/50 flex items-center gap-1.5 shadow-xl">
                <div className="w-5 h-7 rounded bg-gradient-to-br from-amber-700 to-amber-950 border border-amber-400/80 flex items-center justify-center text-[10px] text-amber-200">
                  🂠
                </div>
                <div className="flex flex-col text-[9px] leading-tight">
                  <span className="font-extrabold text-amber-400">CLOSED TRUMP</span>
                  <span className="text-slate-300 font-bold">BID: {gameState.bidding.currentHighBid}</span>
                </div>
              </div>

              {/* SEE TRUMP BUTTON */}
              {isAuthorizedToSeeTrump && !gameState.trumpRevealed && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatchAction({ type: 'SEE_TRUMP', seat: localSeat });
                  }}
                  className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider shadow-md flex items-center gap-1 cursor-pointer active:scale-95 animate-pulse"
                >
                  <Eye className="w-3 h-3 stroke-[3]" />
                  <span>SEE TRUMP</span>
                </button>
              )}
            </div>
          )}

          {/* Open Trump Badge */}
          {gameState.trumpSuit && (gameState.trumpMode === 'OPEN' || gameState.trumpRevealed) && (
            <div className="absolute top-2 left-2 sm:top-3 sm:left-4 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-amber-500/50 text-[10px] font-bold text-slate-200 flex items-center gap-1.5 shadow-xl z-30">
              <span className="text-[9px] text-amber-400 font-extrabold uppercase">TRUMP:</span>
              <span className={`text-base font-black ${SUIT_COLORS[gameState.trumpSuit] === 'red' ? 'text-rose-500' : 'text-slate-100'}`}>
                {SUIT_SYMBOLS[gameState.trumpSuit]}
              </span>
              <span className="text-[9px] text-slate-400 border-l border-slate-800 pl-1.5">
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
          <div className="relative w-36 h-36 sm:w-56 sm:h-56 flex items-center justify-center">
            {relativeSeats.south && getPlayedCardForSeat(relativeSeats.south.seat) && (
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 20, opacity: 1, rotateY: getPlayedCardForSeat(relativeSeats.south.seat)?.isFaceDown ? 180 : 0 }}
                transition={{ duration: 0.3 }}
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
                initial={{ x: -60, opacity: 0 }}
                animate={{ x: -28, opacity: 1, rotateY: getPlayedCardForSeat(relativeSeats.west.seat)?.isFaceDown ? 180 : 0 }}
                transition={{ duration: 0.3 }}
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
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: -20, opacity: 1, rotateY: getPlayedCardForSeat(relativeSeats.north.seat)?.isFaceDown ? 180 : 0 }}
                transition={{ duration: 0.3 }}
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
                initial={{ x: 60, opacity: 0 }}
                animate={{ x: 28, opacity: 1, rotateY: getPlayedCardForSeat(relativeSeats.east.seat)?.isFaceDown ? 180 : 0 }}
                transition={{ duration: 0.3 }}
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

      {/* 4. SPECIAL VOID DECISION PANEL OVERLAY */}
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
          onPlaceBid={(amount) => dispatchAction({ type: 'PLACE_BID', seat: localSeat, amount })}
          onPass={() => dispatchAction({ type: 'PASS_BID', seat: localSeat })}
          onRequestRedeal={() => dispatchAction({ type: 'REQUEST_REDEAL', seat: localSeat })}
          onSkipRedeal={() => dispatchAction({ type: 'SKIP_REDEAL', seat: localSeat })}
          onDeclarePartnerCloseCaps={() => dispatchAction({ type: 'DECLARE_PARTNER_CLOSE_CAPS', seat: localSeat })}
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
              seat: localSeat,
              cardId,
              mode,
            });
          }}
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

      <FinishGameConfirmModal
        isOpen={isFinishConfirmOpen}
        onClose={() => setIsFinishConfirmOpen(false)}
        onConfirmFinish={() => {
          dispatchAction({ type: 'CONFIRM_FINISH_GAME', seat: localSeat });
          setIsFinishConfirmOpen(false);
        }}
      />

      {/* LEAVE MATCH CONFIRMATION MODAL */}
      <AnimatePresence>
        {isLeaveConfirmOpen && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-slate-700/80 rounded-2xl p-5 max-w-xs w-full text-center shadow-2xl"
            >
              <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider mb-2">Leave Match?</h3>
              <p className="text-xs text-slate-300 mb-5">
                Are you sure you want to leave this active 304 match? Your team will forfeit current round progress.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsLeaveConfirmOpen(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs hover:bg-slate-700 active:scale-95"
                >
                  CANCEL
                </button>
                <button
                  onClick={onBackToLobby}
                  className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 active:scale-95 shadow-md"
                >
                  LEAVE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Opponent Trump Selection Waiting Banner */}
      {isTrumpSelectionStage && !isMyTurnToSelectTrump && (
        <div className="fixed inset-x-4 top-16 z-40 max-w-sm mx-auto bg-slate-900/90 backdrop-blur-md border border-amber-500/30 rounded-2xl p-3 shadow-2xl text-center">
          <h4 className="text-amber-400 font-bold text-xs uppercase tracking-wider mb-0.5">Trump Selection</h4>
          <p className="text-slate-200 text-xs font-medium">
            {gameState.players[gameState.currentTurnSeat]?.name} is selecting a physical card as Trump...
          </p>
        </div>
      )}

      {(gameState.status === 'ROUND_COMPLETE' || gameState.status === 'GAME_COMPLETE') && (
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

/* Sub-component: Player Avatar Seat Badge */
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
    north: 'top-2 left-1/2 -translate-x-1/2',
    south: 'bottom-2 left-1/2 -translate-x-1/2',
    east: 'right-1.5 sm:right-3 top-1/2 -translate-y-1/2',
    west: 'left-1.5 sm:left-3 top-1/2 -translate-y-1/2',
  }[position];

  return (
    <div className={`absolute z-20 flex flex-col items-center pointer-events-none ${posClasses}`}>
      <div className="relative">
        <div
          className={`w-10 h-10 sm:w-14 sm:h-14 rounded-full p-0.5 flex items-center justify-center transition-all ${
            isSpeaking
              ? 'ring-4 ring-emerald-400 animate-pulse shadow-emerald-500/80 shadow-2xl scale-105'
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

        {isSpeaking && (
          <span className="absolute -top-1 -left-1 p-0.5 rounded-full bg-emerald-500 text-slate-950 shadow-md animate-bounce">
            <Mic className="w-2.5 h-2.5 stroke-[3]" />
          </span>
        )}

        {isDealer && (
          <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full bg-amber-500 text-slate-950 font-black text-[8px] shadow-sm">
            D
          </span>
        )}

        <span
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.2 rounded-full text-[7px] sm:text-[8px] font-black uppercase tracking-tighter ${
            player.team === 0 ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-slate-950'
          }`}
        >
          {player.team === 0 ? 'A' : 'B'}
        </span>
      </div>

      <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-950/90 border border-slate-800/80 flex items-center gap-1 shadow-md">
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 truncate max-w-[64px] sm:max-w-[90px]">
          {player.name}
        </span>
        <span className="text-[9px] sm:text-[10px] text-amber-400 font-bold">🂠{player.cardCount}</span>
      </div>
    </div>
  );
};

