import { GameEngineState } from './types';

/**
 * Checks whether PCC (Partner Call / Cap Challenge) can be legally declared by a player.
 * In standard 304, PCC can be declared during BIDDING or before TRICK 1 by the bidding team.
 */
export function canDeclarePCC(state: GameEngineState, seat: number): boolean {
  if (state.status !== 'BIDDING' && state.status !== 'TRUMP_SELECTION' && state.status !== 'PLAYING') {
    return false;
  }

  // PCC can only be declared before trick 1 has any completed cards
  if (state.status === 'PLAYING') {
    if (state.tricks.length > 0) return false;
    if (state.currentTrick && state.currentTrick.cardsPlayed.length > 0) return false;
  }

  // Must be bidder or bidder's team partner
  const bidderSeat = state.bidding.bidderSeat;
  if (bidderSeat !== null) {
    const bidderTeam = bidderSeat % 2;
    const playerTeam = seat % 2;
    if (playerTeam !== bidderTeam) return false;
  }

  // Already declared?
  if (state.isPccDeclared) return false;

  return true;
}

/**
 * Executes a PCC declaration action, raising bid to 304 (Cap Challenge).
 */
export function executePCC(state: GameEngineState, seat: number): GameEngineState {
  if (!canDeclarePCC(state, seat)) {
    throw new Error('PCC declaration is not legally allowed at this time.');
  }

  const nextState = JSON.parse(JSON.stringify(state)) as GameEngineState;
  nextState.isPccDeclared = true;
  nextState.pccDeclaringSeat = seat;
  nextState.bidding.currentHighBid = 304; // Set target to maximum 304 points!
  nextState.bidding.bidderSeat = seat;

  nextState.lastActionMessage = `🔥 PCC DECLARED by ${nextState.players[seat].name}! Target raised to maximum 304 points!`;
  return nextState;
}
