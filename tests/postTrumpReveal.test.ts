import { describe, it, expect } from 'vitest';
import { createInitialPlayer, createInitialState, applyGameAction, revealTrumpState } from '../src/lib/game-engine/gameEngine';
import { determineTrickWinner } from '../src/lib/game-engine/trickRules';
import { PlayedCard } from '../src/lib/game-engine/types';

describe('Post-Trump-Reveal Rules & Gameplay Engine', () => {
  function setupOpenTrumpGame() {
    const players = [
      createInitialPlayer('p0', 'Player 0', '', 0),
      createInitialPlayer('p1', 'Player 1', '', 1),
      createInitialPlayer('p2', 'Player 2', '', 2),
      createInitialPlayer('p3', 'Player 3', '', 3),
    ];
    let state = createInitialState('room_1', players);
    state = applyGameAction(state, { type: 'START_GAME' });

    if (state.status === 'REDEAL_CHECK') {
      state = applyGameAction(state, { type: 'SKIP_REDEAL', seat: state.redealEligibleSeat! });
    }
    state = applyGameAction(state, { type: 'PLACE_BID', seat: 1, amount: 160 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 2 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 3 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 0 });

    // Select Trump card as Spades (S)
    const p1Hand = state.players[1].cards;
    const spadeCard = p1Hand.find((c) => c.suit === 'S') || p1Hand[0];
    state = applyGameAction(state, { type: 'SELECT_TRUMP', seat: 1, cardId: spadeCard.id, mode: 'CLOSED' });

    // 8-Card Bidding Pass round
    state = applyGameAction(state, { type: 'PASS_BID', seat: 1 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 2 });
    state = applyGameAction(state, { type: 'PASS_BID', seat: 3 });

    return { state, trumpMakerSeat: 1, indicatorCard: spadeCard };
  }

  it('1. Transition from CLOSED to OPEN mode on trump reveal', () => {
    const { state, indicatorCard } = setupOpenTrumpGame();
    expect(state.trumpMode).toBe('CLOSED');
    expect(state.trumpRevealed).toBe(false);

    revealTrumpState(state);

    expect(state.trumpMode).toBe('OPEN');
    expect(state.trumpRevealed).toBe(true);
    expect(state.trumpSuit).toBe(indicatorCard.suit);
  });

  it('2. Returns indicator card to trump maker hand if not played into trick', () => {
    const { state, trumpMakerSeat, indicatorCard } = setupOpenTrumpGame();
    const handCountBefore = state.players[trumpMakerSeat].cards.length;

    revealTrumpState(state);

    const handAfter = state.players[trumpMakerSeat].cards;
    expect(handAfter.length).toBe(handCountBefore + 1);
    expect(handAfter.some((c) => c.id === indicatorCard.id)).toBe(true);
  });

  it('3. Follow-suit rule is strictly mandatory after trump reveal', () => {
    const { state } = setupOpenTrumpGame();
    revealTrumpState(state);

    // Setup custom hands for follow-suit testing
    state.players[1].cards = [
      { id: 'c1', suit: 'H', rank: '10' },
      { id: 'c2', suit: 'S', rank: 'J' }, // Trump!
    ];
    state.currentTurnSeat = 1;
    state.currentTrick!.cardsPlayed = [
      { seat: 0, card: { id: 'c0', suit: 'H', rank: 'A' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
    ];

    // Attempting to play Trump (Spades) when holding Hearts (H) must throw error!
    expect(() => {
      applyGameAction(state, { type: 'PLAY_CARD', seat: 1, cardId: 'c2' });
    }).toThrow(/Illegal card play! Must follow lead suit/);

    // Playing Hearts (H) must succeed
    const nextState = applyGameAction(state, { type: 'PLAY_CARD', seat: 1, cardId: 'c1' });
    expect(nextState.currentTrick!.cardsPlayed.length).toBe(2);
  });

  it('4. Void player in OPEN mode plays card face-up directly', () => {
    const { state } = setupOpenTrumpGame();
    revealTrumpState(state);

    state.players[1].cards = [
      { id: 'c1', suit: 'S', rank: '7' }, // Trump cut! Void in Heart
    ];
    state.currentTurnSeat = 1;
    state.currentTrick!.cardsPlayed = [
      { seat: 0, card: { id: 'c0', suit: 'H', rank: 'A' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
    ];

    const nextState = applyGameAction(state, { type: 'PLAY_CARD', seat: 1, cardId: 'c1' });
    expect(nextState.pendingVoidChoiceSeat).toBeNull();
    const played = nextState.currentTrick!.cardsPlayed[1];
    expect(played.isFaceDown).toBe(false);
    expect(played.isRevealed).toBe(true);
  });

  it('5. Trick Winner: Highest Trump wins over non-trump cards', () => {
    const cardsPlayed: PlayedCard[] = [
      { seat: 0, card: { id: '1', suit: 'H', rank: 'A' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
      { seat: 1, card: { id: '2', suit: 'H', rank: 'J' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true }, // Led suit Jack
      { seat: 2, card: { id: '3', suit: 'S', rank: '7' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true }, // Trump 7!
      { seat: 3, card: { id: '4', suit: 'H', rank: '9' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
    ];

    const winner = determineTrickWinner(cardsPlayed, 'H', 'S', true);
    expect(winner.seat).toBe(2); // S7 (Trump) beats H J (Highest Non-Trump)
  });

  it('6. Trick Winner: Multiple Trumps evaluated by 304 ranking (J > 9 > A > 10 > K > Q > 8 > 7)', () => {
    const cardsPlayed: PlayedCard[] = [
      { seat: 0, card: { id: '1', suit: 'D', rank: 'A' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
      { seat: 1, card: { id: '2', suit: 'S', rank: '7' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
      { seat: 2, card: { id: '3', suit: 'S', rank: 'J' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true }, // Trump Jack!
      { seat: 3, card: { id: '4', suit: 'S', rank: 'A' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
    ];

    const winner = determineTrickWinner(cardsPlayed, 'D', 'S', true);
    expect(winner.seat).toBe(2); // S Jack > S Ace > S 7
  });

  it('7. Trick Winner: No Trump -> Highest Led Suit card wins (304 ranking)', () => {
    const cardsPlayed: PlayedCard[] = [
      { seat: 0, card: { id: '1', suit: 'C', rank: '10' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
      { seat: 1, card: { id: '2', suit: 'C', rank: 'A' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
      { seat: 2, card: { id: '3', suit: 'C', rank: 'J' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true }, // Led suit Jack!
      { seat: 3, card: { id: '4', suit: 'D', rank: 'J' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true }, // Non-led Jack discarded
    ];

    const winner = determineTrickWinner(cardsPlayed, 'C', 'S', true);
    expect(winner.seat).toBe(2); // C Jack wins! D Jack is ignored.
  });

  it('8. Trick winner leads the next trick', () => {
    const { state } = setupOpenTrumpGame();
    revealTrumpState(state);

    state.currentTrick!.cardsPlayed = [
      { seat: 1, card: { id: '1', suit: 'H', rank: '7' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
      { seat: 2, card: { id: '2', suit: 'H', rank: 'J' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
      { seat: 3, card: { id: '3', suit: 'H', rank: '8' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
      { seat: 0, card: { id: '4', suit: 'H', rank: '9' }, playedAt: Date.now(), isFaceDown: false, isRevealed: true },
    ];
    state.currentTrick!.winnerSeat = 2; // H Jack won trick
    state.status = 'TRICK_COMPLETE';

    const nextState = applyGameAction(state, { type: 'NEXT_TRICK' });
    expect(nextState.currentTrick!.trickNumber).toBe(2);
    expect(nextState.currentTrick!.leadSeat).toBe(2); // Seat 2 won with H Jack!
    expect(nextState.currentTurnSeat).toBe(2);
  });
});
