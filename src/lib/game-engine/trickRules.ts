import { Card, PlayedCard, Suit } from './types';
import { getCardRank, getTrickTotalPoints } from './cardValues';

/**
 * Returns legal cards that the player can play given their hand and current trick context.
 * RULE 5: A player who has the Playing Suit CANNOT use special Flip/Trump choice. They MUST follow suit!
 */
export function getLegalCards(
  hand: Card[],
  leadSuit: Suit | null,
  trumpSuit: Suit | null,
  trumpRevealed: boolean
): Card[] {
  if (hand.length === 0) return [];

  // If leading the trick, any card is legal
  if (!leadSuit) {
    return hand;
  }

  // Check if player has any cards matching lead suit (playingSuit)
  const leadSuitCards = hand.filter((card) => card.suit === leadSuit);
  if (leadSuitCards.length > 0) {
    // MUST follow suit!
    return leadSuitCards;
  }

  // Void in playing suit: player receives decision [USE TRUMP] or [FLIP A CARD]
  return hand;
}

/**
 * Evaluates trick winner according to exact 304 Closed Trump + Flip Gamble rules.
 */
export function determineTrickWinner(
  cardsPlayed: PlayedCard[],
  leadSuit: Suit,
  hiddenTrumpSuit: Suit | null,
  trumpRevealed: boolean
): PlayedCard {
  if (cardsPlayed.length === 0) {
    throw new Error('Cannot determine winner of an empty trick');
  }

  // CASE 1: Actual Trump card was used
  const actualTrumpPlayed = cardsPlayed.find((pc) => pc.isActualTrump);
  if (actualTrumpPlayed) {
    return actualTrumpPlayed;
  }

  // CASE 2: Flip Card Gamble was used
  const flippedGamblePlayed = cardsPlayed.find((pc) => pc.isFlippedGamble);
  if (flippedGamblePlayed) {
    // Server secretly compares flipped card suit against hidden Trump suit (Rule 15)
    const isMatch = hiddenTrumpSuit && flippedGamblePlayed.card.suit === hiddenTrumpSuit;
    if (isMatch) {
      // FLIP SUCCESS -> Flipping player wins!
      return flippedGamblePlayed;
    }
    // FLIP FAILED -> Highest card of Playing Suit wins!
    const leadSuitCards = cardsPlayed.filter((pc) => pc.card.suit === leadSuit && !pc.isFlippedGamble);
    if (leadSuitCards.length > 0) {
      return leadSuitCards.reduce((highest, current) => {
        return getCardRank(current.card) > getCardRank(highest.card) ? current : highest;
      });
    }
    return flippedGamblePlayed;
  }

  // CASE 3: Normal Open Trump cards played (if trump is revealed)
  if (hiddenTrumpSuit && trumpRevealed) {
    const trumpCards = cardsPlayed.filter((pc) => pc.card.suit === hiddenTrumpSuit);
    if (trumpCards.length > 0) {
      return trumpCards.reduce((highest, current) => {
        return getCardRank(current.card) > getCardRank(highest.card) ? current : highest;
      });
    }
  }

  // CASE 4: Normal Play -> Highest card matching Playing Suit wins!
  const leadSuitCards = cardsPlayed.filter((pc) => pc.card.suit === leadSuit);
  if (leadSuitCards.length > 0) {
    return leadSuitCards.reduce((highest, current) => {
      return getCardRank(current.card) > getCardRank(highest.card) ? current : highest;
    });
  }

  // Fallback (first card played wins if no match)
  return cardsPlayed[0];
}

export function getTrickPoints(cardsPlayed: PlayedCard[]): number {
  return getTrickTotalPoints(cardsPlayed.map((pc) => pc.card));
}
