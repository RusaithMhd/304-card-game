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
}

const DEFAULT_PLAYERS: PlayerState[] = [
  createInitialPlayer('usr_default_host', 'Rusaith (You)', 'https://api.dicebear.com/7.x/bottts/svg?seed=rusaith', 0),
  createInitialPlayer('bot_kavin', 'Kavin', 'https://api.dicebear.com/7.x/bottts/svg?seed=kavin', 1),
  createInitialPlayer('bot_ahmed', 'Ahmed (Partner)', 'https://api.dicebear.com/7.x/bottts/svg?seed=ahmed', 2),
  createInitialPlayer('bot_sajith', 'Sajith', 'https://api.dicebear.com/7.x/bottts/svg?seed=sajith', 3),
];

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: createInitialState('A7K29P', DEFAULT_PLAYERS),
  localSeat: 0,
  selectedCardId: null,
  isBotModeEnabled: true,
  botSpeedMs: 1200,

  initRoomGame: (roomId, players, userSeat) => {
    const initialState = createInitialState(roomId, players);
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
      set({ gameState: nextState, selectedCardId: null });

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
          const option = Math.random() > 0.5 ? 'USE_TRUMP' : 'FLIP_CARD';
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
