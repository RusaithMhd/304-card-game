import { Suit, Rank, Card } from './types';

export const CARD_VALUES: Record<Rank, number> = {
  'J': 30,
  '9': 20,
  'A': 11,
  '10': 10,
  'K': 3,
  'Q': 2,
  '8': 0,
  '7': 0,
};

export const CARD_RANKS: Record<Rank, number> = {
  'J': 8,
  '9': 7,
  'A': 6,
  '10': 5,
  'K': 4,
  'Q': 3,
  '8': 2,
  '7': 1,
};

export const SUIT_RANKS: Record<Suit, number> = {
  'H': 4,
  'D': 3,
  'C': 2,
  'S': 1,
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  'H': '♥',
  'D': '♦',
  'C': '♣',
  'S': '♠',
};

export const SUIT_NAMES: Record<Suit, string> = {
  'H': 'Hearts',
  'D': 'Diamonds',
  'C': 'Clubs',
  'S': 'Spades',
};

export const SUIT_COLORS: Record<Suit, 'red' | 'black'> = {
  'H': 'red',
  'D': 'red',
  'C': 'black',
  'S': 'black',
};

export function getCardPoints(card: Card): number {
  return CARD_VALUES[card.rank] ?? 0;
}

export function getCardRank(card: Card): number {
  return CARD_RANKS[card.rank] ?? 0;
}

export function getTrickTotalPoints(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + getCardPoints(card), 0);
}

/**
 * Automatically sorts a player's hand according to 304 suit grouping & rank hierarchy.
 */
export function sortPlayerHand(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    // Primary: Group by Suit
    if (SUIT_RANKS[a.suit] !== SUIT_RANKS[b.suit]) {
      return SUIT_RANKS[b.suit] - SUIT_RANKS[a.suit];
    }
    // Secondary: Sort by 304 Rank (J > 9 > A > 10 > K > Q > 8 > 7)
    return CARD_RANKS[b.rank] - CARD_RANKS[a.rank];
  });
}
