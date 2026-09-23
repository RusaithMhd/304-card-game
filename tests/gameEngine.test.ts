import { describe, it, expect } from 'vitest';
import { create32CardDeck, dealInitialCards } from '../src/lib/game-engine/deck';
import { getCardPoints } from '../src/lib/game-engine/cardValues';
import {
  createInitialPlayer,
  createInitialState,
  applyGameAction,
} from '../src/lib/game-engine/gameEngine';
import { canDeclarePCC, executePCC } from '../src/lib/game-engine/pccRules';

describe('304 Game Engine Core Rules & Features', () => {
  it('creates exact 32 card deck with total point value of 304', () => {
    const deck = create32CardDeck();
    expect(deck.length).toBe(32);

    const totalPoints = deck.reduce((sum, card) => sum + getCardPoints(card), 0);
    expect(totalPoints).toBe(304);
  });

  it('correctly deals initial 4 cards to 4 players', () => {
    const deck = create32CardDeck();
    const { hands, remainingDeck } = dealInitialCards(deck);

    expect(hands.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(hands[i].length).toBe(4);
    }
    expect(remainingDeck.length).toBe(16);
  });

  it('prioritizes Closed Trump mode by default in initial state', () => {
    const players = [
      createInitialPlayer('p1', 'Rusaith', '', 0),
      createInitialPlayer('p2', 'Kavin', '', 1),
      createInitialPlayer('p3', 'Ahmed', '', 2),
      createInitialPlayer('p4', 'Sajith', '', 3),
    ];

    const state = createInitialState('room_123', players);
    expect(state.trumpMode).toBe('CLOSED');
    expect(state.isHonestPlayActive).toBe(true);
  });

  it('handles PCC declaration raising target bid to maximum 304 points', () => {
    const players = [
      createInitialPlayer('p1', 'Rusaith', '', 0),
      createInitialPlayer('p2', 'Kavin', '', 1),
      createInitialPlayer('p3', 'Ahmed', '', 2),
      createInitialPlayer('p4', 'Sajith', '', 3),
    ];

    let state = createInitialState('room_123', players);
    state = applyGameAction(state, { type: 'START_GAME' });

    expect(canDeclarePCC(state, 1)).toBe(true);

    // Player 1 declares PCC challenge
    state = applyGameAction(state, { type: 'DECLARE_PCC', seat: 1 });

    expect(state.isPccDeclared).toBe(true);
    expect(state.bidding.currentHighBid).toBe(304);
    expect(state.bidding.bidderSeat).toBe(1);
  });

  it('enforces suit-following rules during trick play', () => {
    const players = [
      createInitialPlayer('p1', 'Rusaith', '', 0),
      createInitialPlayer('p2', 'Kavin', '', 1),
      createInitialPlayer('p3', 'Ahmed', '', 2),
      createInitialPlayer('p4', 'Sajith', '', 3),
    ];

    let state = createInitialState('room_123', players);
    state = applyGameAction(state, { type: 'START_GAME' });
    state = applyGameAction(state, { type: 'PLACE_BID', seat: 1, amount: 160 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 2 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 3 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 0 });
    const trumpCardId = state.players[1].cards[0].id;
    state = applyGameAction(state, { type: 'SELECT_TRUMP', seat: 1, cardId: trumpCardId, suit: 'H', mode: 'CLOSED' });

    const leadPlayer = state.players[1];
    const leadCard = leadPlayer.cards[0];
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 1, cardId: leadCard.id });

    expect(state.currentTrick?.cardsPlayed.length).toBe(1);

    const p2 = state.players[2];
    const matchingCard = p2.cards.find(c => c.suit === leadCard.suit);
    const nonMatchingCard = p2.cards.find(c => c.suit !== leadCard.suit);

    if (matchingCard && nonMatchingCard) {
      expect(() => {
        applyGameAction(state, { type: 'PLAY_CARD', seat: 2, cardId: nonMatchingCard.id });
      }).toThrow(/Illegal card play/);

      expect(() => {
        applyGameAction(state, { type: 'PLAY_CARD', seat: 2, cardId: matchingCard.id });
      }).not.toThrow();
    }
  });

  it('Acceptance Test 40 — Successful Flip Gamble (Matching Trump Suit)', () => {
    const players = [
      createInitialPlayer('p0', 'Player 0', '', 0),
      createInitialPlayer('p1', 'Player 1', '', 1),
      createInitialPlayer('p2', 'Player 2', '', 2),
      createInitialPlayer('p3', 'Player 3', '', 3),
    ];

    let state = createInitialState('test_40', players);
    state.status = 'PLAYING';
    state.trumpSuit = 'S'; // Hidden Trump Suit = Spades
    state.trumpMode = 'CLOSED';
    state.trumpCard = { id: '10-S', suit: 'S', rank: '10' };
    state.trumpRevealed = false;
    state.currentTurnSeat = 1;
    state.currentTrick = {
      trickNumber: 1,
      leadSeat: 1,
      cardsPlayed: [],
      points: 0,
    };

    // P1 plays Hearts Jack
    state.players[1].cards = [{ id: 'J-H', suit: 'H', rank: 'J' }];
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 1, cardId: 'J-H' });

    // P2 plays Hearts Ace
    state.players[2].cards = [{ id: 'A-H', suit: 'H', rank: 'A' }];
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 2, cardId: 'A-H' });

    // P3 has NO Hearts -> Void! Chooses FLIP A CARD with Spades King (S)
    state.players[3].cards = [{ id: 'K-S', suit: 'S', rank: 'K' }];
    state = applyGameAction(state, { type: 'CHOOSE_VOID_OPTION', seat: 3, option: 'FLIP_CARD' });
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 3, cardId: 'K-S' });

    // P0 plays Hearts Queen
    state.players[0].cards = [{ id: 'Q-H', suit: 'H', rank: 'Q' }];
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 0, cardId: 'Q-H' });

    // Resolution check:
    expect(state.status).toBe('TRICK_COMPLETE');
    // Flipped card (K-S) suit (S) === hidden trump suit (S) -> MATCH! P3 (seat 3) wins!
    expect(state.currentTrick?.winnerSeat).toBe(3);
    // Trump card stays HIDDEN!
    expect(state.trumpRevealed).toBe(false);
  });

  it('Acceptance Test 41 — Failed Flip Gamble (Non-Matching Trump Suit)', () => {
    const players = [
      createInitialPlayer('p0', 'Player 0', '', 0),
      createInitialPlayer('p1', 'Player 1', '', 1),
      createInitialPlayer('p2', 'Player 2', '', 2),
      createInitialPlayer('p3', 'Player 3', '', 3),
    ];

    let state = createInitialState('test_41', players);
    state.status = 'PLAYING';
    state.trumpSuit = 'S'; // Hidden Trump Suit = Spades
    state.trumpMode = 'CLOSED';
    state.trumpCard = { id: '10-S', suit: 'S', rank: '10' };
    state.trumpRevealed = false;
    state.currentTurnSeat = 1;
    state.currentTrick = {
      trickNumber: 1,
      leadSeat: 1,
      cardsPlayed: [],
      points: 0,
    };

    // P1 plays Hearts Jack
    state.players[1].cards = [{ id: 'J-H', suit: 'H', rank: 'J' }];
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 1, cardId: 'J-H' });

    // P2 plays Hearts Ace
    state.players[2].cards = [{ id: 'A-H', suit: 'H', rank: 'A' }];
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 2, cardId: 'A-H' });

    // P3 has NO Hearts -> Void! Chooses FLIP A CARD with Diamonds King (D)
    state.players[3].cards = [{ id: 'K-D', suit: 'D', rank: 'K' }];
    state = applyGameAction(state, { type: 'CHOOSE_VOID_OPTION', seat: 3, option: 'FLIP_CARD' });
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 3, cardId: 'K-D' });

    // P0 plays Hearts Queen
    state.players[0].cards = [{ id: 'Q-H', suit: 'H', rank: 'Q' }];
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 0, cardId: 'Q-H' });

    // Resolution check:
    expect(state.status).toBe('TRICK_COMPLETE');
    // Flipped card (K-D) suit (D) !== hidden trump suit (S) -> NO MATCH!
    // Highest lead suit card (J-H by P1 at seat 1, since J > A in 304 hierarchy) wins!
    expect(state.currentTrick?.winnerSeat).toBe(1);
    // Trump card stays HIDDEN!
    expect(state.trumpRevealed).toBe(false);
  });

  it('Acceptance Test 42 — Actual Trump Play', () => {
    const players = [
      createInitialPlayer('p0', 'Player 0', '', 0),
      createInitialPlayer('p1', 'Player 1', '', 1),
      createInitialPlayer('p2', 'Player 2', '', 2),
      createInitialPlayer('p3', 'Player 3', '', 3),
    ];

    let state = createInitialState('test_42', players);
    state.status = 'PLAYING';
    state.trumpSuit = 'D'; // Hidden Trump = Diamonds King
    state.trumpMode = 'CLOSED';
    state.trumpCard = { id: 'K-D', suit: 'D', rank: 'K' };
    state.trumpRevealed = false;
    state.currentTurnSeat = 1;
    state.currentTrick = {
      trickNumber: 1,
      leadSeat: 1,
      cardsPlayed: [],
      points: 0,
    };

    // P1 plays Spades 9
    state.players[1].cards = [{ id: '9-S', suit: 'S', rank: '9' }];
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 1, cardId: '9-S' });

    // P2 plays Spades Ace
    state.players[2].cards = [{ id: 'A-S', suit: 'S', rank: 'A' }];
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 2, cardId: 'A-S' });

    // P3 has NO Spades -> Void! Chooses USE TRUMP!
    state.players[3].cards = [{ id: '7-H', suit: 'H', rank: '7' }];
    state = applyGameAction(state, { type: 'CHOOSE_VOID_OPTION', seat: 3, option: 'USE_TRUMP' });

    // P0 plays Spades Jack
    state.players[0].cards = [{ id: 'J-S', suit: 'S', rank: 'J' }];
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 0, cardId: 'J-S' });

    // Resolution check:
    expect(state.status).toBe('TRICK_COMPLETE');
    // Actual Trump player (P3 at seat 3) wins!
    expect(state.currentTrick?.winnerSeat).toBe(3);
    // Trump card is now REVEALED and stays face-up!
    expect(state.trumpRevealed).toBe(true);
  });
});
