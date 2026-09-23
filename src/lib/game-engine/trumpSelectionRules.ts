import { GameEngineState, Card, Suit } from './types';

/**
 * Returns the list of cards in the player's hand that are legally selectable as Trump.
 */
export function getSelectableTrumpCards(gameState: GameEngineState, seat: number): Card[] {
  const player = gameState.players.find((p) => p.seat === seat);
  if (!player || player.cards.length === 0) {
    return [];
  }

  // During TRUMP_SELECTION stage, all cards currently in player's hand are selectable
  return player.cards;
}

/**
 * Derives the Trump Suit directly from the physical card selected by the player.
 */
export function deriveTrumpSuitFromCard(card: Card): Suit {
  return card.suit;
}
