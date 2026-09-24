export interface HonestGameEvent {
  id: string;
  gameId: string;
  playerId: string;
  eventType:
    | 'GAME_CREATED'
    | 'PLAYER_JOINED'
    | 'CARDS_DEALT'
    | 'BID_PLACED'
    | 'CLOSED_TRUMP_SELECTED'
    | 'TRUMP_REVEALED'
    | 'PCC_DECLARED'
    | 'USE_ACTUAL_TRUMP'
    | 'CHOOSE_FLIP_GAMBLE'
    | 'FLIPPED_GAMBLE_CARD_PLAYED'
    | 'HONEST_GAME_DECLARED'
    | 'HONEST_TRUMP_SELECTED'
    | 'HONEST_TRUMP_PLACED'
    | 'HONEST_TRUMP_REVEALED'
    | 'HONEST_GAME_RESULT'
    | 'CARD_PLAYED'
    | 'TRICK_COMPLETED'
    | 'ROUND_COMPLETED'
    | 'SEE_TRUMP_PRIVATE'
    | 'PLAYER_DISCONNECTED'
    | 'PLAYER_RECONNECTED';
  payload: Record<string, any>;
  serverTimestamp: number;
}

const gameEventLogs: Record<string, HonestGameEvent[]> = {};

/**
 * Logs an immutable game event to enforce Honest Play integrity.
 */
export function logGameEvent(
  gameId: string,
  playerId: string,
  eventType: HonestGameEvent['eventType'],
  payload: Record<string, any>
): HonestGameEvent {
  const event: HonestGameEvent = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    gameId,
    playerId,
    eventType,
    payload,
    serverTimestamp: Date.now(),
  };

  if (!gameEventLogs[gameId]) {
    gameEventLogs[gameId] = [];
  }
  gameEventLogs[gameId].push(event);

  return event;
}

export function getGameEvents(gameId: string): HonestGameEvent[] {
  return gameEventLogs[gameId] || [];
}
