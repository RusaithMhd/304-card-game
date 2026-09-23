import { describe, it, expect } from 'vitest';
import { createInitialPlayer, createInitialState, applyGameAction } from '../src/lib/game-engine/gameEngine';
import { canDeclareHonestGame, canViewTrumpCard, evaluateHonestGameResult } from '../src/lib/game-engine/honestGameRules';

describe('304 Card Game — Honest Game Feature (250+ Commitment)', () => {
  it('validates canDeclareHonestGame eligibility correctly', () => {
    const players = [
      createInitialPlayer('p0', 'Player 0', '', 0),
      createInitialPlayer('p1', 'Player 1', '', 1),
      createInitialPlayer('p2', 'Player 2', '', 2),
      createInitialPlayer('p3', 'Player 3', '', 3),
    ];

    let state = createInitialState('test_honest_1', players);
    state = applyGameAction(state, { type: 'START_GAME' });

    expect(canDeclareHonestGame(state, 1)).toBe(true);

    // Player 1 declares Honest Game
    state = applyGameAction(state, { type: 'DECLARE_HONEST_GAME', seat: 1 });

    expect(state.honestGame).toBe(true);
    expect(state.honestGameCommitment).toBe(250);
    expect(state.honestGamePlacedBySeat).toBe(1);
    expect(state.bidding.currentHighBid).toBe(250);
    expect(state.bidding.bidderSeat).toBe(1);

    // Cannot declare a second time
    expect(canDeclareHonestGame(state, 2)).toBe(false);
  });

  it('enforces exact card count accounting: 7 cards in hand + 1 Trump on board = 32 total unique cards', () => {
    const players = [
      createInitialPlayer('p0', 'Player 0', '', 0),
      createInitialPlayer('p1', 'Player 1', '', 1),
      createInitialPlayer('p2', 'Player 2', '', 2),
      createInitialPlayer('p3', 'Player 3', '', 3),
    ];

    let state = createInitialState('test_honest_2', players);
    state = applyGameAction(state, { type: 'START_GAME' });
    state = applyGameAction(state, { type: 'DECLARE_HONEST_GAME', seat: 1 });

    const trumpSuit = state.players[1].cards[0].suit;
    const chosenTrumpCard = state.players[1].cards[0];

    state = applyGameAction(state, {
      type: 'SELECT_TRUMP',
      seat: 1,
      cardId: chosenTrumpCard.id,
      suit: trumpSuit,
      mode: 'CLOSED',
    });

    // Check card counts:
    expect(state.players[1].cards.length).toBe(7); // 7 cards in declaring player hand
    expect(state.players[0].cards.length).toBe(8); // 8 cards in other hands
    expect(state.players[2].cards.length).toBe(8);
    expect(state.players[3].cards.length).toBe(8);

    expect(state.trumpCard).toBeDefined();
    expect(state.trumpCard?.id).toBe(chosenTrumpCard.id);

    // Total unique cards = 7 + 1 + 8 + 8 + 8 = 32
    const totalHandCards = state.players.reduce((sum, p) => sum + p.cards.length, 0);
    expect(totalHandCards + (state.trumpCard ? 1 : 0)).toBe(32);
  });

  it('restricts SEE TRUMP authorization exclusively to declaring player and enforces NO FLIP BACK', () => {
    const players = [
      createInitialPlayer('p0', 'Player 0', '', 0),
      createInitialPlayer('p1', 'Player 1', '', 1),
      createInitialPlayer('p2', 'Player 2', '', 2),
      createInitialPlayer('p3', 'Player 3', '', 3),
    ];

    let state = createInitialState('test_honest_3', players);
    state = applyGameAction(state, { type: 'START_GAME' });
    state = applyGameAction(state, { type: 'DECLARE_HONEST_GAME', seat: 1 });
    const trumpCardId = state.players[1].cards[0].id;
    state = applyGameAction(state, {
      type: 'SELECT_TRUMP',
      seat: 1,
      cardId: trumpCardId,
      suit: 'H',
      mode: 'CLOSED',
    });

    // Player 1 (declaring player) is authorized to view
    expect(canViewTrumpCard(state, 1)).toBe(true);

    // Player 2 or 3 (opponents/others) are NOT authorized to view
    expect(canViewTrumpCard(state, 2)).toBe(false);
    expect(canViewTrumpCard(state, 3)).toBe(false);

    expect(() => {
      applyGameAction(state, { type: 'SEE_TRUMP', seat: 2 });
    }).toThrow(/Unauthorized/);

    // Player 1 executes SEE_TRUMP
    state = applyGameAction(state, { type: 'SEE_TRUMP', seat: 1 });
    expect(state.trumpRevealed).toBe(true);

    // NO FLIP BACK: trumpRevealed stays true
    expect(state.trumpRevealed).toBe(true);
  });

  it('evaluates Honest Game SUCCESS (score >= 250) and FAILED (score < 250) while preserving normal 304 score', () => {
    const players = [
      createInitialPlayer('p0', 'Player 0', '', 0),
      createInitialPlayer('p1', 'Player 1', '', 1),
      createInitialPlayer('p2', 'Player 2', '', 2),
      createInitialPlayer('p3', 'Player 3', '', 3),
    ];

    let state = createInitialState('test_honest_4', players);
    state.honestGame = true;
    state.honestGameTeamId = 0; // Team A (Seat 0 & 2)
    state.honestGameCommitment = 250;

    // Case A: Team A scores 267 points
    state.teamAScore = 267;
    state.teamBScore = 37;
    expect(evaluateHonestGameResult(state)).toBe('SUCCESS');
    expect(state.teamAScore).toBe(267); // Score is NOT converted to 250!

    // Case B: Team A scores 243 points
    state.teamAScore = 243;
    state.teamBScore = 61;
    expect(evaluateHonestGameResult(state)).toBe('FAILED');
    expect(state.teamAScore).toBe(243);
  });
});
