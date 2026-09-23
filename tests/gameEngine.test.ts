import { describe, it, expect } from 'vitest';
import { create32CardDeck, dealInitialCards } from '../src/lib/game-engine/deck';
import { getCardPoints, CARD_RANKS } from '../src/lib/game-engine/cardValues';
import {
  createInitialPlayer,
  createInitialState,
  applyGameAction,
} from '../src/lib/game-engine/gameEngine';
import { canDeclarePCC } from '../src/lib/game-engine/pccRules';
import { evaluateRoundResult, calculateBaseTokens } from '../src/lib/game-engine/scoring';

describe('304 Card Game Engine — Sri Lankan Rules Audit', () => {
  it('creates exact 32 card deck with total point value of 304', () => {
    const deck = create32CardDeck();
    expect(deck.length).toBe(32);

    const totalPoints = deck.reduce((sum, card) => sum + getCardPoints(card), 0);
    expect(totalPoints).toBe(304);
  });

  it('validates 304 card ranking hierarchy (J > 9 > A > 10 > K > Q > 8 > 7)', () => {
    expect(CARD_RANKS['J']).toBeGreaterThan(CARD_RANKS['9']);
    expect(CARD_RANKS['9']).toBeGreaterThan(CARD_RANKS['A']);
    expect(CARD_RANKS['A']).toBeGreaterThan(CARD_RANKS['10']);
    expect(CARD_RANKS['10']).toBeGreaterThan(CARD_RANKS['K']);
    expect(CARD_RANKS['K']).toBeGreaterThan(CARD_RANKS['Q']);
    expect(CARD_RANKS['Q']).toBeGreaterThan(CARD_RANKS['8']);
    expect(CARD_RANKS['8']).toBeGreaterThan(CARD_RANKS['7']);
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

  it('executes full 4-card bidding, trump selection, 8-card bidding, and trick play sequence', () => {
    const players = [
      createInitialPlayer('p1', 'Player 0', '', 0),
      createInitialPlayer('p2', 'Player 1', '', 1),
      createInitialPlayer('p3', 'Player 2', '', 2),
      createInitialPlayer('p4', 'Player 3', '', 3),
    ];

    let state = createInitialState('room_123', players);
    state = applyGameAction(state, { type: 'START_GAME' });

    // Status is either REDEAL_CHECK or FOUR_CARD_BIDDING
    if (state.status === 'REDEAL_CHECK') {
      state = applyGameAction(state, { type: 'SKIP_REDEAL', seat: state.currentTurnSeat });
    }
    expect(state.status).toBe('FOUR_CARD_BIDDING');

    // 4-card bidding: Player 1 bids 160, others pass
    state = applyGameAction(state, { type: 'PLACE_BID', seat: 1, amount: 160 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 2 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 3 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 0 });

    expect(state.status).toBe('TRUMP_SELECTION_4');
    expect(state.bidding.bidderSeat).toBe(1);

    // Player 1 selects physical trump card from their 4 cards
    const trumpCardId = state.players[1].cards[0].id;
    state = applyGameAction(state, { type: 'SELECT_TRUMP', seat: 1, cardId: trumpCardId, mode: 'CLOSED' });

    // Transition to 8-card bidding round & remaining 4 cards dealt
    expect(state.status).toBe('EIGHT_CARD_BIDDING');
    expect(state.players[1].cards.length).toBe(7); // 7 cards in hand + 1 indicator on table
    expect(state.players[0].cards.length).toBe(8);

    // 8-card bidding: 3 passes -> 8-card bidding complete, game proceeds to PLAYING
    state = applyGameAction(state, { type: 'PASS_BID', seat: 1 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 2 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 3 });

    expect(state.status).toBe('PLAYING');
    expect(state.currentTrick?.trickNumber).toBe(1);
  });


  it('calculates token transfers correctly based on 304 scoring table', () => {
    // Bid < 200: +1 / -2
    expect(calculateBaseTokens(160, false, true)).toBe(1);
    expect(calculateBaseTokens(160, false, false)).toBe(2);

    // Bid 200-249: +2 / -3
    expect(calculateBaseTokens(210, false, true)).toBe(2);
    expect(calculateBaseTokens(210, false, false)).toBe(3);

    // Bid 250+: +3 / -4
    expect(calculateBaseTokens(250, false, true)).toBe(3);
    expect(calculateBaseTokens(250, false, false)).toBe(4);

    // Partner Close Caps: +4 / -5
    expect(calculateBaseTokens(304, true, true)).toBe(4);
    expect(calculateBaseTokens(304, true, false)).toBe(5);

    // Team A successful 210 bid -> +2 tokens
    const res = evaluateRoundResult(211, 93, 0, 210);
    expect(res.bidSuccess).toBe(true);
    expect(res.tokensAwarded.teamA).toBe(2);
    expect(res.tokensAwarded.teamB).toBe(-2);
  });

  it('enforces suit-following rules during trick play', () => {
    const players = [
      createInitialPlayer('p1', 'Player 0', '', 0),
      createInitialPlayer('p2', 'Player 1', '', 1),
      createInitialPlayer('p3', 'Player 2', '', 2),
      createInitialPlayer('p4', 'Player 3', '', 3),
    ];

    let state = createInitialState('room_123', players);
    state.status = 'PLAYING';
    state.currentTurnSeat = 1;
    state.bidding = { currentHighBid: 160, bidderSeat: 1, passes: [], isComplete: true };
    state.currentTrick = { trickNumber: 1, leadSeat: 1, cardsPlayed: [], points: 0 };

    state.players[1].cards = [{ id: '9-S', suit: 'S', rank: '9' }];
    state = applyGameAction(state, { type: 'PLAY_CARD', seat: 1, cardId: '9-S' });

    const p2 = state.players[2];
    p2.cards = [
      { id: 'J-S', suit: 'S', rank: 'J' },
      { id: 'A-H', suit: 'H', rank: 'A' },
    ];

    // Playing H when having S should throw illegal play error
    expect(() => {
      applyGameAction(state, { type: 'PLAY_CARD', seat: 2, cardId: 'A-H' });
    }).toThrow(/Illegal card play/);

    // Playing J-S (matching lead suit) succeeds
    expect(() => {
      applyGameAction(state, { type: 'PLAY_CARD', seat: 2, cardId: 'J-S' });
    }).not.toThrow();
  });
});

