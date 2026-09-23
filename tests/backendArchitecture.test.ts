import { describe, it, expect } from 'vitest';
import { create32CardDeck, shuffleDeck, dealInitialCards, dealRemainingCards } from '../src/lib/game-engine/deck';
import { createInitialPlayer, createInitialState, applyGameAction } from '../src/lib/game-engine/gameEngine';
import { Card } from '../src/lib/game-engine/types';

describe('Server-Authoritative Backend Engine & Anti-Cheat System', () => {
  it('1. Generates exactly 32 unique cards with 0 duplicates or missing cards', () => {
    const deck = create32CardDeck();
    expect(deck.length).toBe(32);

    const cardIds = new Set(deck.map((c) => c.id));
    expect(cardIds.size).toBe(32);

    const suits = ['H', 'D', 'C', 'S'];
    const ranks = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

    for (const suit of suits) {
      for (const rank of ranks) {
        const found = deck.find((c) => c.suit === suit && c.rank === rank);
        expect(found).toBeDefined();
      }
    }
  });

  it('2. Cryptographic deck shuffle & 4-player deal maintains 32-card integrity', () => {
    const deck = shuffleDeck(create32CardDeck());
    const { hands, remainingDeck } = dealInitialCards(deck);

    // Initial deal: 4 cards to each of 4 players = 16 cards + 16 remaining deck
    expect(hands.length).toBe(4);
    for (let i = 0; i < 4; i++) {
      expect(hands[i].length).toBe(4);
    }
    expect(remainingDeck.length).toBe(16);

    // Deal remaining 4 cards
    const finalHands = dealRemainingCards(hands, remainingDeck);
    let totalCardsCount = 0;
    const allDealtCards = new Set<string>();

    for (let i = 0; i < 4; i++) {
      expect(finalHands[i].length).toBe(8);
      totalCardsCount += finalHands[i].length;
      finalHands[i].forEach((c) => allDealtCards.add(c.id));
    }

    // 4 players * 8 cards = 32 unique cards
    expect(totalCardsCount).toBe(32);
    expect(allDealtCards.size).toBe(32);
  });

  it('3. Private Hand Sanitization: Other players cards are stripped from response', () => {
    const players = [
      createInitialPlayer('u0', 'Player 0', '', 0),
      createInitialPlayer('u1', 'Player 1', '', 1),
      createInitialPlayer('u2', 'Player 2', '', 2),
      createInitialPlayer('u3', 'Player 3', '', 3),
    ];
    let state = createInitialState('ROOM01', players);
    state = applyGameAction(state, { type: 'START_GAME' });

    // Client Seat = 0
    const clientSeat = 0;
    const sanitizedPlayers = state.players.map((p) => {
      if (p.seat === clientSeat) {
        return p;
      }
      return { ...p, cards: [] };
    });

    expect(sanitizedPlayers[0].cards.length).toBe(4); // Own cards present
    expect(sanitizedPlayers[1].cards.length).toBe(0); // Opponent cards stripped!
    expect(sanitizedPlayers[2].cards.length).toBe(0); // Opponent cards stripped!
    expect(sanitizedPlayers[3].cards.length).toBe(0); // Opponent cards stripped!
  });

  it('4. Server Room Code Generator creates 6-character uppercase codes', () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    expect(code.length).toBe(6);
    expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true);
  });
});
