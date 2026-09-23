import { Card, Suit, Rank } from './types';

const SUITS: Suit[] = ['H', 'D', 'C', 'S'];
const RANKS: Rank[] = ['J', '9', 'A', '10', 'K', 'Q', '8', '7'];

export function create32CardDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank,
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealInitialCards(deck: Card[]): {
  hands: [Card[], Card[], Card[], Card[]];
  remainingDeck: Card[];
} {
  const copy = [...deck];
  const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
  
  // Deal 4 cards to each player (0, 1, 2, 3)
  for (let round = 0; round < 4; round++) {
    for (let player = 0; player < 4; player++) {
      const card = copy.shift();
      if (card) {
        hands[player].push(card);
      }
    }
  }

  return { hands, remainingDeck: copy };
}

export function dealRemainingCards(
  existingHands: [Card[], Card[], Card[], Card[]],
  remainingDeck: Card[]
): [Card[], Card[], Card[], Card[]] {
  const copy = [...remainingDeck];
  const updatedHands: [Card[], Card[], Card[], Card[]] = [
    [...existingHands[0]],
    [...existingHands[1]],
    [...existingHands[2]],
    [...existingHands[3]],
  ];

  // Deal 4 more cards to each player
  for (let round = 0; round < 4; round++) {
    for (let player = 0; player < 4; player++) {
      const card = copy.shift();
      if (card) {
        updatedHands[player].push(card);
      }
    }
  }

  return updatedHands;
}
