import { describe, it, expect } from 'vitest';
import { createInitialState, createInitialPlayer, applyGameAction } from '../src/lib/game-engine/gameEngine';

describe('Target Reached — Finish Game Engine Rules', () => {
  function setupTestGame() {
    const players = [
      createInitialPlayer('user-1', 'South Player', 'avatar1.png', 0),
      createInitialPlayer('user-2', 'East Player', 'avatar2.png', 1),
      createInitialPlayer('user-3', 'North Player', 'avatar3.png', 2),
      createInitialPlayer('user-4', 'West Player', 'avatar4.png', 3),
    ];
    let state = createInitialState('room-target-test', players);
    state = applyGameAction(state, { type: 'START_GAME' });
    return state;
  }

  it('1. Initializes with targetScore = 22 and targetReached = false', () => {
    const state = setupTestGame();
    expect(state.targetScore).toBe(22);
    expect(state.targetReached).toBe(false);
    expect(state.status).not.toBe('GAME_COMPLETE');
  });

  it('2. Does NOT automatically terminate game when target score is reached', () => {
    let state = setupTestGame();

    // Manually set Team A tokens to 22 (target score reached)
    state.teamATokens = 22;
    state.targetReached = true;

    // Verify game status is NOT automatically set to GAME_COMPLETE
    expect(state.targetReached).toBe(true);
    expect(state.status).not.toBe('GAME_COMPLETE');
  });

  it('3. Rejects CONFIRM_FINISH_GAME if target score is not reached', () => {
    let state = setupTestGame();
    state.teamATokens = 11;
    state.teamBTokens = 11;
    state.targetReached = false;

    expect(() => {
      applyGameAction(state, { type: 'CONFIRM_FINISH_GAME', seat: 0 });
    }).toThrow('Target score has not been reached yet.');
  });

  it('4. Successfully finishes game on CONFIRM_FINISH_GAME when target reached', () => {
    let state = setupTestGame();
    state.teamATokens = 22;
    state.teamBTokens = 0;
    state.targetReached = true;

    const finishedState = applyGameAction(state, { type: 'CONFIRM_FINISH_GAME', seat: 0 });

    expect(finishedState.status).toBe('GAME_COMPLETE');
    expect(finishedState.winningTeam).toBe(0); // Team A won
    expect(finishedState.finishedAt).toBeDefined();
    expect(finishedState.finishedBy).toBe('user-1');
  });

  it('5. Disallows further card plays after game is marked GAME_COMPLETE', () => {
    let state = setupTestGame();
    state.teamATokens = 22;
    state.targetReached = true;

    const finishedState = applyGameAction(state, { type: 'CONFIRM_FINISH_GAME', seat: 0 });

    // Attempting card play after game is finished must throw an error
    expect(() => {
      applyGameAction(finishedState, { type: 'PLAY_CARD', seat: 0, cardId: 'J-H' });
    }).toThrow('Game is finished. No further card play or actions are allowed.');
  });
});
