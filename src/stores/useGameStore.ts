import { create } from 'zustand';
import {
  GameEngineState,
  GameAction,
  PlayerState,
  Card,
  Suit,
} from '../lib/game-engine/types';
import {
  createInitialPlayer,
  createInitialState,
  applyGameAction,
} from '../lib/game-engine/gameEngine';
import { useAuthStore } from './useAuthStore';
import { getLegalCards } from '../lib/game-engine/trickRules';

function getInitialSavedGameState(): GameEngineState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem('304_saved_game_state');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.roomId && parsed.players) {
        return parsed;
      }
    }
  } catch (e) {}
  return null;
}

function getInitialSavedLocalSeat(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = sessionStorage.getItem('304_saved_local_seat');
    if (raw !== null) return parseInt(raw, 10) || 0;
  } catch (e) {}
  return 0;
}

function saveGameStateToStorage(state: GameEngineState | null, seat?: number) {
  if (typeof window === 'undefined') return;
  try {
    if (state) {
      sessionStorage.setItem('304_saved_game_state', JSON.stringify(state));
      sessionStorage.setItem('304_active_room_code', state.roomId);
      if (seat !== undefined) {
        sessionStorage.setItem('304_saved_local_seat', seat.toString());
      }
    } else {
      sessionStorage.removeItem('304_saved_game_state');
      sessionStorage.removeItem('304_active_room_code');
      sessionStorage.removeItem('304_saved_local_seat');
    }
  } catch (e) {}
}

interface GameStore {
  gameState: GameEngineState | null;
  localSeat: number; // 0, 1, 2, 3
  selectedCardId: string | null;
  isBotModeEnabled: boolean;
  botSpeedMs: number;
  
  // Actions
  initRoomGame: (roomId: string, players: PlayerState[], userSeat: number) => void;
  dispatchAction: (action: GameAction) => void;
  setSelectedCard: (cardId: string | null) => void;
  toggleBotMode: (enabled?: boolean) => void;
  triggerBotTurnIfNeeded: () => void;
  getRelativeSeatPosition: (actualSeat: number) => 'south' | 'east' | 'north' | 'west';
  syncServerGameState: (serverGameState: GameEngineState, userSeat?: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: getInitialSavedGameState(),
  localSeat: getInitialSavedLocalSeat(),
  selectedCardId: null,
  isBotModeEnabled: true,
  botSpeedMs: 1200,

  initRoomGame: (roomId, players, userSeat) => {
    const initialState = createInitialState(roomId, players);
    saveGameStateToStorage(initialState, userSeat);
    set({
      gameState: initialState,
      localSeat: userSeat,
      selectedCardId: null,
    });
  },

  setSelectedCard: (cardId) => set({ selectedCardId: cardId }),

  toggleBotMode: (enabled) => {
    set((state) => ({
      isBotModeEnabled: enabled !== undefined ? enabled : !state.isBotModeEnabled,
    }));
  },

  getRelativeSeatPosition: (actualSeat: number) => {
    const local = get().localSeat;
    const offset = (actualSeat - local + 4) % 4;
    switch (offset) {
      case 0:
        return 'south';
      case 1:
        return 'east';
      case 2:
        return 'north';
      case 3:
        return 'west';
      default:
        return 'south';
    }
  },

  dispatchAction: (action) => {
    const currentState = get().gameState;
    if (!currentState) return;

    try {
      const nextState = applyGameAction(currentState, action);
      saveGameStateToStorage(nextState, get().localSeat);
      set({ gameState: nextState, selectedCardId: null });

      // 1. Broadcast to local browser windows/tabs
      if (typeof window !== 'undefined' && currentState.roomId) {
        try {
          const channel = new BroadcastChannel(`304_game_${currentState.roomId}`);
          channel.postMessage({ type: 'GAME_STATE_UPDATE', gameState: nextState, action });
          channel.close();
        } catch (e) {}
      }

      // 2. Broadcast & persist to server API for multi-device/multi-browser multiplayer
      if (currentState.roomId) {
        try {
          fetch('/api/rooms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'game_action', roomCode: currentState.roomId, gameAction: action }),
          });
        } catch (e) {}
      }

      // Automatically advance to NEXT_TRICK after 1.4s when a trick completes
      if (nextState.status === 'TRICK_COMPLETE') {
        setTimeout(() => {
          const current = get().gameState;
          if (current?.status === 'TRICK_COMPLETE') {
            get().dispatchAction({ type: 'NEXT_TRICK' });
          }
        }, 1400);
      } else {
        // Automatically trigger bot AI move if next turn belongs to a bot player
        setTimeout(() => {
          get().triggerBotTurnIfNeeded();
        }, 400);
      }
    } catch (err: any) {
      console.warn('Game Action Error:', err.message);
    }
  },

  syncServerGameState: (serverGameState, userSeat) => {
    if (!serverGameState) return;
    const current = get().gameState;
    const targetSeat = userSeat !== undefined ? userSeat : get().localSeat;
    if (!current || (serverGameState.updatedAt && serverGameState.updatedAt >= (current.updatedAt || 0))) {
      saveGameStateToStorage(serverGameState, targetSeat);
      set({ gameState: serverGameState, localSeat: targetSeat });
      setTimeout(() => {
        get().triggerBotTurnIfNeeded();
      }, 300);
    }
  },

  triggerBotTurnIfNeeded: () => {
    const { gameState, localSeat, isBotModeEnabled, botSpeedMs, dispatchAction } = get();
    if (!gameState || !isBotModeEnabled) return;

    const currentTurn = gameState.currentTurnSeat;
    // Don't auto-play for local human user
    if (currentTurn === localSeat) return;

    const botPlayer = gameState.players[currentTurn];
    if (!botPlayer || !botPlayer.id.startsWith('bot_')) return;

    // BOT DECISION ENGINE based on current state
    setTimeout(() => {
      const state = get().gameState;
      if (!state || state.currentTurnSeat !== currentTurn) return;

      if (state.status === 'REDEAL_CHECK') {
        dispatchAction({ type: 'SKIP_REDEAL', seat: currentTurn });
      } else if (state.status === 'FOUR_CARD_BIDDING' || state.status === 'EIGHT_CARD_BIDDING') {
        // Bot bidding strategy
        const highBid = state.bidding.currentHighBid;
        if (!state.honestGame && Math.random() > 0.8) {
          dispatchAction({ type: 'DECLARE_HONEST_GAME', seat: currentTurn });
        } else if (highBid === 0 && Math.random() > 0.3) {
          dispatchAction({ type: 'PLACE_BID', seat: currentTurn, amount: 160 });
        } else {
          dispatchAction({ type: 'PASS_BID', seat: currentTurn });
        }
      } else if (state.status === 'TRUMP_SELECTION_4' || state.status === 'TRUMP_REPLACEMENT_8') {
        // Winning bidder selects a physical card from their hand
        const hand = botPlayer.cards;
        if (hand.length > 0) {
          const chosenCard = hand[Math.floor(Math.random() * hand.length)];
          dispatchAction({
            type: 'SELECT_TRUMP',
            seat: currentTurn,
            cardId: chosenCard.id,
            suit: chosenCard.suit,
            mode: 'CLOSED',
          });
        }
      }
 else if (state.status === 'PLAYING') {
        // Handle pending void choice for Bot
        if (state.pendingVoidChoiceSeat === currentTurn) {
          const isTrumpMaker =
            (state.honestGamePlacedBySeat !== undefined && state.honestGamePlacedBySeat === currentTurn) ||
            state.bidding.bidderSeat === currentTurn;
          const actualTrumpAvailable = !state.currentTrick?.actualTrumpUsed && Boolean(state.trumpCard);

          let option: 'USE_TRUMP' | 'FLIP_CARD' | 'REVEAL_TRUMP';
          if (isTrumpMaker && actualTrumpAvailable) {
            option = Math.random() > 0.4 ? 'USE_TRUMP' : 'FLIP_CARD';
          } else {
            option = Math.random() > 0.5 ? 'REVEAL_TRUMP' : 'FLIP_CARD';
          }

          dispatchAction({
            type: 'CHOOSE_VOID_OPTION',
            seat: currentTurn,
            option,
          });
          return;
        }

        // Handle pending gamble flip selection for Bot
        if (state.pendingFlipSelectSeat === currentTurn) {
          const hand = botPlayer.cards;
          if (hand.length > 0) {
            const randomGambleCard = hand[Math.floor(Math.random() * hand.length)];
            dispatchAction({
              type: 'PLAY_CARD',
              seat: currentTurn,
              cardId: randomGambleCard.id,
            });
          }
          return;
        }

        // Normal Bot card play
        if (!state.currentTrick) return;
        const leadSuit = state.currentTrick.cardsPlayed.length > 0
          ? state.currentTrick.cardsPlayed[0].card.suit
          : null;

        const legalCards = getLegalCards(
          botPlayer.cards,
          leadSuit,
          state.trumpSuit,
          state.trumpRevealed
        );

        if (legalCards.length > 0) {
          const chosenCard = legalCards[Math.floor(Math.random() * legalCards.length)];
          dispatchAction({
            type: 'PLAY_CARD',
            seat: currentTurn,
            cardId: chosenCard.id,
          });
        }
      } else if (state.status === 'TRICK_COMPLETE') {
        // Auto-advance completed trick
        dispatchAction({ type: 'NEXT_TRICK' });
      }
    }, botSpeedMs);
  },
}));
