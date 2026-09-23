import { Card, PlayedCard, Suit } from './types';
import { getCardRank, getTrickTotalPoints } from './cardValues';

/**
 * Validates whether a card can legally be led to start a trick.
 */
export function canLeadCard(
  cardToLead: Card,
  hand: Card[],
  isTrick1: boolean,
  isTrumpMakerRightOfDealer: boolean,
  isTrumpMaker: boolean,
  trumpSuit: Suit | null,
  trumpRevealed: boolean,
  trumpCard: Card | null
): boolean {
  // Rule 22: Trump maker to dealer's right cannot lead trump on Trick 1 in Closed Trump
  if (isTrick1 && isTrumpMaker && isTrumpMakerRightOfDealer && !trumpRevealed && trumpSuit && cardToLead.suit === trumpSuit) {
    return false;
  }

  // Rule 23: The hidden trump indicator card cannot be led freely while hidden
  // (unless it's the 8th trick and player's only card left)
  if (trumpCard && cardToLead.id === trumpCard.id && !trumpRevealed) {
    if (hand.length > 1) {
      return false;
    }
  }

  // Rule 30: Exhausted Trumps
  // If trump maker possesses all remaining trumps in hand and leads a trump,
  // they must continue leading trumps from hand before leading non-trumps.
  if (isTrumpMaker && trumpSuit && !trumpRevealed) {
    const hasTrumpsInHand = hand.some((c) => c.suit === trumpSuit && c.id !== trumpCard?.id);
    if (hasTrumpsInHand && cardToLead.suit !== trumpSuit) {
      // If previous lead was trump and all trumps held, must lead trump
      // (checked in gameEngine for exhausted trumps state)
    }
  }

  return true;
}

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

  // If leading the trick, return hand (filtered by lead restrictions if applicable)
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

  // CASE 1: Actual Trump card was used (or played face-down in Closed Trump)
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

  // CASE 3: Trump cards played (Open Trump or face-down revealed trump)
  if (hiddenTrumpSuit) {
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

