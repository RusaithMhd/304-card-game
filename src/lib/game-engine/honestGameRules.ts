import { GameEngineState } from './types';

/**
 * Validates whether a player is legally allowed to declare Honest Game (250+ point commitment).
 */
export function canDeclareHonestGame(gameState: GameEngineState, seat: number): boolean {
  // 1. Honest Game must not already be declared
  if (gameState.honestGame) {
    return false;
  }

  // 2. PCC must not already be declared
  if (gameState.isPccDeclared) {
    return false;
  }

  // 3. Allowed during BIDDING, TRUMP_SELECTION, or early PLAYING state before first card
  if (gameState.status === 'BIDDING' || gameState.status === 'TRUMP_SELECTION') {
    return true;
  }

  if (gameState.status === 'PLAYING') {
    // Only available if no cards have been played yet in the first trick
    if (gameState.currentTrick && gameState.currentTrick.trickNumber === 1 && gameState.currentTrick.cardsPlayed.length === 0) {
      return true;
    }
  }

  return false;
}

/**
 * Validates whether a player is authorized to press "SEE TRUMP" to reveal the closed Trump card.
 */
export function canViewTrumpCard(gameState: GameEngineState, seat: number): boolean {
  // Trump must exist and not already be revealed
  if (!gameState.trumpCard || gameState.trumpRevealed) {
    return false;
  }

  // Allowed if player is the exact player who placed/declared Trump
  if (gameState.honestGamePlacedBySeat !== undefined && gameState.honestGamePlacedBySeat === seat) {
    return true;
  }

  // Or if winning bidder placed closed trump
  if (gameState.bidding.bidderSeat === seat) {
    return true;
  }

  return false;
}

/**
 * Evaluates the final Honest Game result at the end of the round.
 * 250 is the commitment threshold; normal 304 scores (e.g. 267 : 173) are preserved.
 */
export function evaluateHonestGameResult(state: GameEngineState): 'SUCCESS' | 'FAILED' | undefined {
  if (!state.honestGame || state.honestGameTeamId === undefined) {
    return undefined;
  }

  const declaringTeamScore = state.honestGameTeamId === 0 ? state.teamAScore : state.teamBScore;
  const commitment = state.honestGameCommitment ?? 250;

  return declaringTeamScore >= commitment ? 'SUCCESS' : 'FAILED';
}
