import {
  GameEngineState,
  GameAction,
  PlayerState,
  Card,
  Suit,
  PlayedCard,
} from './types';
import { create32CardDeck, shuffleDeck, dealInitialCards, dealRemainingCards } from './deck';
import { isValidBid, MIN_BID } from './bidding';
import { getLegalCards, determineTrickWinner, getTrickPoints } from './trickRules';
import { evaluateRoundResult } from './scoring';
import { canDeclarePCC, executePCC } from './pccRules';
import { logGameEvent } from './honestPlay';
import { sortPlayerHand, SUIT_SYMBOLS } from './cardValues';
import { canDeclareHonestGame, canViewTrumpCard, evaluateHonestGameResult } from './honestGameRules';

export function createInitialPlayer(id: string, name: string, avatar: string, seat: number): PlayerState {
  return {
    id,
    name,
    avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${id}`,
    seat,
    team: seat % 2, // Seat 0 & 2 = Team 0 (Team A), Seat 1 & 3 = Team 1 (Team B)
    cards: [],
    cardCount: 0,
    isReady: false,
    isConnected: true,
  };
}

export function createInitialState(roomId: string, players: PlayerState[]): GameEngineState {
  return {
    id: `game_${Date.now()}`,
    roomId,
    status: 'WAITING',
    players,
    dealerSeat: 0,
    currentTurnSeat: 1, // Seat 1 acts first after dealer (Seat 0)
    deck: [],
    bidding: {
      currentHighBid: 0,
      bidderSeat: null,
      passes: [],
      isComplete: false,
    },
    trumpSuit: null,
    trumpMode: 'CLOSED', // CLOSED TRUMP DEFAULT PRIORITY!
    trumpCard: null,
    trumpRevealed: false,
    isPccDeclared: false,
    pccDeclaringSeat: undefined,
    isHonestPlayActive: true, // HONEST PLAY ALWAYS ACTIVE
    pendingVoidChoiceSeat: null,
    pendingFlipSelectSeat: null,
    tricks: [],
    currentTrick: null,
    teamAScore: 0,
    teamBScore: 0,
    teamAMatchPoints: 0,
    teamBMatchPoints: 0,
    winningTeam: null,
    lastActionMessage: 'Game initialized with Honest Play & Closed Trump priority.',
    updatedAt: Date.now(),
  };
}

export function applyGameAction(state: GameEngineState, action: GameAction): GameEngineState {
  const nextState = JSON.parse(JSON.stringify(state)) as GameEngineState;
  nextState.updatedAt = Date.now();

  switch (action.type) {
    case 'START_GAME': {
      if (nextState.players.length < 4) {
        throw new Error('304 requires exactly 4 players');
      }

      // Shuffle and deal initial 4 cards
      const freshDeck = shuffleDeck(create32CardDeck());
      const { hands, remainingDeck } = dealInitialCards(freshDeck);

      nextState.deck = remainingDeck;
      for (let i = 0; i < 4; i++) {
        nextState.players[i].cards = sortPlayerHand(hands[i]);
        nextState.players[i].cardCount = 4;
      }

      nextState.status = 'BIDDING';
      nextState.currentTurnSeat = (nextState.dealerSeat + 1) % 4;
      nextState.bidding = {
        currentHighBid: 0,
        bidderSeat: null,
        passes: [],
        isComplete: false,
      };
      nextState.tricks = [];
      nextState.currentTrick = null;
      nextState.teamAScore = 0;
      nextState.teamBScore = 0;
      nextState.isPccDeclared = false;
      nextState.pendingVoidChoiceSeat = null;
      nextState.pendingFlipSelectSeat = null;
      nextState.lastActionMessage = `Cards dealt. ${nextState.players[nextState.currentTurnSeat].name}'s turn to bid (Closed Trump Priority).`;

      logGameEvent(nextState.id, 'server', 'CARDS_DEALT', { dealerSeat: nextState.dealerSeat });
      break;
    }

    case 'PLACE_BID': {
      if (nextState.status !== 'BIDDING') {
        throw new Error('Game is not in BIDDING state');
      }
      if (action.seat !== nextState.currentTurnSeat) {
        throw new Error(`Not player ${action.seat}'s turn to bid`);
      }
      if (!isValidBid(action.amount, nextState.bidding.currentHighBid)) {
        throw new Error(`Invalid bid amount ${action.amount}`);
      }

      nextState.bidding.currentHighBid = action.amount;
      nextState.bidding.bidderSeat = action.seat;

      nextState.lastActionMessage = `${nextState.players[action.seat].name} bid ${action.amount}`;
      logGameEvent(nextState.id, nextState.players[action.seat].id, 'BID_PLACED', { amount: action.amount });

      // Advance to next active bidder
      nextState.currentTurnSeat = getNextActiveBidderSeat(nextState);
      break;
    }

    case 'PASS_BID': {
      if (nextState.status !== 'BIDDING') {
        throw new Error('Game is not in BIDDING state');
      }
      if (action.seat !== nextState.currentTurnSeat) {
        throw new Error(`Not player ${action.seat}'s turn`);
      }

      if (!nextState.bidding.passes.includes(action.seat)) {
        nextState.bidding.passes.push(action.seat);
      }

      nextState.lastActionMessage = `${nextState.players[action.seat].name} passed`;

      // Check if bidding is complete (3 players passed)
      if (nextState.bidding.passes.length >= 3) {
        nextState.bidding.isComplete = true;

        if (nextState.bidding.bidderSeat === null) {
          nextState.bidding.bidderSeat = (nextState.dealerSeat + 1) % 4;
          nextState.bidding.currentHighBid = MIN_BID;
        }

        nextState.status = 'TRUMP_SELECTION';
        nextState.currentTurnSeat = nextState.bidding.bidderSeat;
        nextState.lastActionMessage = `Bidding complete! ${nextState.players[nextState.currentTurnSeat].name} won bid (${nextState.bidding.currentHighBid}). Select CLOSED TRUMP (Priority).`;
      } else {
        nextState.currentTurnSeat = getNextActiveBidderSeat(nextState);
      }
      break;
    }

    case 'DECLARE_PCC': {
      const pccState = executePCC(nextState, action.seat);
      logGameEvent(pccState.id, pccState.players[action.seat].id, 'PCC_DECLARED', { seat: action.seat });
      return pccState;
    }

    case 'DECLARE_HONEST_GAME': {
      if (!canDeclareHonestGame(nextState, action.seat)) {
        throw new Error('Cannot declare Honest Game at this stage');
      }

      const player = nextState.players[action.seat];
      nextState.honestGame = true;
      nextState.honestGamePlayerId = player.id;
      nextState.honestGameTeamId = player.team;
      nextState.honestGameCommitment = 250;
      nextState.honestGamePlacedBySeat = action.seat;
      nextState.bidding.bidderSeat = action.seat;
      nextState.bidding.currentHighBid = 250;
      nextState.bidding.isComplete = true;

      nextState.status = 'TRUMP_SELECTION';
      nextState.currentTurnSeat = action.seat;
      nextState.lastActionMessage = `${player.name} declared HONEST GAME (250+ Commitment)! Select Trump.`;

      logGameEvent(nextState.id, player.id, 'HONEST_GAME_DECLARED', {
        seat: action.seat,
        commitment: 250,
      });
      break;
    }

    case 'SEE_TRUMP': {
      if (!canViewTrumpCard(nextState, action.seat)) {
        throw new Error('Unauthorized to view Trump card');
      }

      nextState.trumpRevealed = true;
      nextState.lastActionMessage = `${nextState.players[action.seat].name} pressed SEE TRUMP! Trump is ${SUIT_SYMBOLS[nextState.trumpSuit!]} (${nextState.trumpCard?.rank || ''}).`;
      logGameEvent(nextState.id, nextState.players[action.seat].id, 'HONEST_TRUMP_REVEALED', {
        suit: nextState.trumpSuit,
        cardId: nextState.trumpCard?.id,
      });
      break;
    }

    case 'SELECT_TRUMP': {
      if (nextState.status !== 'TRUMP_SELECTION') {
        throw new Error('Game is not in TRUMP_SELECTION state');
      }
      if (action.seat !== nextState.bidding.bidderSeat) {
        throw new Error('Only winning bidder can select trump');
      }

      const player = nextState.players[action.seat];

      // Deal remaining 4 cards to everyone first (so player has full 8 cards to select from)
      if (nextState.deck.length > 0) {
        const currentHands: [Card[], Card[], Card[], Card[]] = [
          nextState.players[0].cards,
          nextState.players[1].cards,
          nextState.players[2].cards,
          nextState.players[3].cards,
        ];
        const updatedHands = dealRemainingCards(currentHands, nextState.deck);
        nextState.deck = [];

        for (let i = 0; i < 4; i++) {
          nextState.players[i].cards = sortPlayerHand(updatedHands[i]);
          nextState.players[i].cardCount = 8;
        }
      }

      // Look up physical selected card from player's actual hand
      const selectedTrumpCard = player.cards.find(c => c.id === action.cardId)
        || (action.suit ? player.cards.find(c => c.suit === action.suit) : null)
        || player.cards[0];

      if (!selectedTrumpCard) {
        throw new Error('Invalid card selection for Trump');
      }

      // Derive Trump suit directly from the physical selected card!
      nextState.trumpSuit = selectedTrumpCard.suit;
      nextState.trumpMode = action.mode || 'CLOSED'; // Default priority CLOSED
      nextState.trumpRevealed = action.mode === 'OPEN';
      nextState.trumpCard = selectedTrumpCard;
      nextState.honestGamePlacedBySeat = action.seat;

      if (action.mode === 'CLOSED' || !action.mode) {
        // EXACT MANDATORY RULE 8 & 9: Extract original card object from hand (7 cards in hand + 1 Trump on board = 32 unique cards)
        player.cards = sortPlayerHand(player.cards.filter(c => c.id !== selectedTrumpCard.id));
        player.cardCount = player.cards.length; // 7 CARDS IN HAND

        logGameEvent(nextState.id, player.id, 'HONEST_TRUMP_PLACED', {
          cardId: selectedTrumpCard.id,
          suit: selectedTrumpCard.suit,
          rank: selectedTrumpCard.rank,
        });
      }

      // Start Trick 1
      const leadSeat = (nextState.dealerSeat + 1) % 4;
      nextState.status = 'PLAYING';
      nextState.currentTurnSeat = leadSeat;
      nextState.currentTrick = {
        trickNumber: 1,
        leadSeat,
        cardsPlayed: [],
        points: 0,
      };

      nextState.lastActionMessage = `Trump selected (${selectedTrumpCard.rank}${SUIT_SYMBOLS[selectedTrumpCard.suit]} - ${action.mode === 'OPEN' ? 'OPEN' : '🔒 CLOSED'}). Trick 1 begins!`;
      logGameEvent(nextState.id, player.id, 'CLOSED_TRUMP_SELECTED', { mode: action.mode, suit: selectedTrumpCard.suit, cardId: selectedTrumpCard.id });
      break;
    }

    case 'REVEAL_TRUMP': {
      if (!nextState.trumpRevealed && nextState.trumpSuit) {
        nextState.trumpRevealed = true;
        nextState.lastActionMessage = `Trump revealed! Trump suit is ${SUIT_SYMBOLS[nextState.trumpSuit]} ${nextState.trumpSuit}.`;
        logGameEvent(nextState.id, nextState.players[action.seat].id, 'TRUMP_REVEALED', { suit: nextState.trumpSuit });
      }
      break;
    }

    case 'CHOOSE_VOID_OPTION': {
      if (nextState.status !== 'PLAYING' || !nextState.currentTrick) {
        throw new Error('Game is not in active PLAYING state');
      }
      if (action.seat !== nextState.currentTurnSeat) {
        throw new Error(`Not player ${action.seat}'s turn`);
      }

      const player = nextState.players[action.seat];

      if (action.option === 'USE_TRUMP') {
        // Player intentionally chooses to play the actual hidden Trump card
        const trumpCard = nextState.trumpCard || {
          id: `trump_${Date.now()}`,
          suit: nextState.trumpSuit || 'H',
          rank: 'J',
        };

        const playedCard: PlayedCard = {
          seat: action.seat,
          card: trumpCard,
          playedAt: Date.now(),
          isActualTrump: true,
          isFaceDown: true, // Face down until trick resolution!
          isRevealed: false,
        };

        nextState.currentTrick.cardsPlayed.push(playedCard);
        nextState.currentTrick.actualTrumpUsed = true;
        nextState.pendingVoidChoiceSeat = null;
        nextState.pendingFlipSelectSeat = null;

        nextState.lastActionMessage = `${player.name} placed the ACTUAL TRUMP face-down on the table!`;
        logGameEvent(nextState.id, player.id, 'USE_ACTUAL_TRUMP', { seat: action.seat });

        checkAndResolveTrick(nextState);
      } else if (action.option === 'FLIP_CARD') {
        // Player chooses to gamble by flipping 1 card from their hand
        nextState.pendingVoidChoiceSeat = null;
        nextState.pendingFlipSelectSeat = action.seat;
        nextState.lastActionMessage = `${player.name} chose FLIP A CARD! Select 1 card to gamble.`;
        logGameEvent(nextState.id, player.id, 'CHOOSE_FLIP_GAMBLE', { seat: action.seat });
      }
      break;
    }

    case 'PLAY_CARD': {
      if (nextState.status !== 'PLAYING') {
        throw new Error('Game is not in PLAYING state');
      }
      if (action.seat !== nextState.currentTurnSeat) {
        throw new Error(`Not player ${action.seat}'s turn`);
      }
      if (!nextState.currentTrick) {
        throw new Error('No active trick');
      }

      const player = nextState.players[action.seat];
      const cardToPlay = player.cards.find(c => c.id === action.cardId);
      if (!cardToPlay) {
        throw new Error(`Card ${action.cardId} not found in player ${action.seat}'s hand`);
      }

      const leadSuit = nextState.currentTrick.cardsPlayed.length > 0
        ? (nextState.currentTrick.cardsPlayed[0].card.suit)
        : null;

      // Handle card play during pending flip selection (glowing/gambling card choice)
      if (nextState.pendingFlipSelectSeat === action.seat) {
        player.cards = sortPlayerHand(player.cards.filter(c => c.id !== cardToPlay.id));
        player.cardCount = player.cards.length;

        nextState.currentTrick.cardsPlayed.push({
          seat: action.seat,
          card: cardToPlay,
          playedAt: Date.now(),
          isFlippedGamble: true,
          isFaceDown: true, // Face down on board until resolution!
          isRevealed: false,
        });

        nextState.currentTrick.flippedGambleUsed = true;
        nextState.pendingFlipSelectSeat = null;
        nextState.pendingVoidChoiceSeat = null;

        nextState.lastActionMessage = `${player.name} placed a gamble FLIP card face-down!`;
        logGameEvent(nextState.id, player.id, 'FLIPPED_GAMBLE_CARD_PLAYED', { cardId: cardToPlay.id });

        checkAndResolveTrick(nextState);
        break;
      }

      // Check if player has leadSuit in hand
      if (leadSuit) {
        const leadSuitCards = player.cards.filter(c => c.suit === leadSuit);
        
        if (leadSuitCards.length > 0) {
          // Rule 5: MUST follow lead suit! Player CANNOT use Trump/Flip choice.
          if (cardToPlay.suit !== leadSuit) {
            throw new Error(`Illegal card play! Must follow lead suit ${SUIT_SYMBOLS[leadSuit]}`);
          }
        } else {
          // Rule 6: ZERO cards matching lead suit -> Player MUST receive [USE TRUMP] vs [FLIP A CARD] decision panel!
          nextState.pendingVoidChoiceSeat = action.seat;
          nextState.lastActionMessage = `${player.name} has no ${SUIT_SYMBOLS[leadSuit]}. Choose USE TRUMP or FLIP A CARD.`;
          return nextState;
        }
      }

      // Normal card play (following suit or leading trick)
      player.cards = sortPlayerHand(player.cards.filter(c => c.id !== cardToPlay.id));
      player.cardCount = player.cards.length;

      nextState.currentTrick.cardsPlayed.push({
        seat: action.seat,
        card: cardToPlay,
        playedAt: Date.now(),
        isFaceDown: false,
        isRevealed: true,
      });

      nextState.lastActionMessage = `${player.name} played ${cardToPlay.rank} of ${cardToPlay.suit}`;
      logGameEvent(nextState.id, player.id, 'CARD_PLAYED', { cardId: cardToPlay.id, suit: cardToPlay.suit });

      checkAndResolveTrick(nextState);
      break;
    }

    case 'NEXT_TRICK': {
      if (nextState.status !== 'TRICK_COMPLETE' || !nextState.currentTrick) {
        throw new Error('Cannot advance to next trick');
      }

      nextState.tricks.push(nextState.currentTrick);
      const prevWinnerSeat = nextState.currentTrick.winnerSeat!;

      if (nextState.currentTrick.trickNumber < 8) {
        nextState.currentTrick = {
          trickNumber: nextState.currentTrick.trickNumber + 1,
          leadSeat: prevWinnerSeat,
          cardsPlayed: [],
          points: 0,
        };
        nextState.currentTurnSeat = prevWinnerSeat;
        nextState.status = 'PLAYING';
      } else {
        nextState.currentTrick = null;
        const result = evaluateRoundResult(
          nextState.teamAScore,
          nextState.teamBScore,
          nextState.bidding.bidderSeat ?? 0,
          nextState.bidding.currentHighBid
        );

        if (nextState.honestGame) {
          const honestResult = evaluateHonestGameResult(nextState);
          nextState.honestGameResult = honestResult;
          logGameEvent(nextState.id, 'server', 'HONEST_GAME_RESULT', {
            result: honestResult,
            teamAScore: nextState.teamAScore,
            teamBScore: nextState.teamBScore,
          });
        }

        nextState.winningTeam = result.winningTeam;
        nextState.teamAMatchPoints += result.matchPointsAwarded.teamA;
        nextState.teamBMatchPoints += result.matchPointsAwarded.teamB;
        nextState.status = 'GAME_COMPLETE';
        nextState.lastActionMessage = result.summary;
        logGameEvent(nextState.id, 'server', 'ROUND_COMPLETED', { winningTeam: result.winningTeam });
      }
      break;
    }

    case 'REMATCH': {
      const newDealer = (nextState.dealerSeat + 1) % 4;
      const freshDeck = shuffleDeck(create32CardDeck());
      const { hands, remainingDeck } = dealInitialCards(freshDeck);

      nextState.dealerSeat = newDealer;
      nextState.currentTurnSeat = (newDealer + 1) % 4;
      nextState.deck = remainingDeck;
      nextState.status = 'BIDDING';
      nextState.bidding = {
        currentHighBid: 0,
        bidderSeat: null,
        passes: [],
        isComplete: false,
      };
      nextState.trumpSuit = null;
      nextState.trumpMode = 'CLOSED';
      nextState.trumpCard = null;
      nextState.trumpRevealed = false;
      nextState.isPccDeclared = false;
      nextState.pendingVoidChoiceSeat = null;
      nextState.pendingFlipSelectSeat = null;
      nextState.tricks = [];
      nextState.currentTrick = null;
      nextState.teamAScore = 0;
      nextState.teamBScore = 0;
      nextState.winningTeam = null;

      for (let i = 0; i < 4; i++) {
        nextState.players[i].cards = sortPlayerHand(hands[i]);
        nextState.players[i].cardCount = 4;
      }

      nextState.lastActionMessage = `Rematch started! New dealer is ${nextState.players[newDealer].name}. Closed Trump Priority active.`;
      break;
    }
  }

  return nextState;
}

function checkAndResolveTrick(state: GameEngineState) {
  if (!state.currentTrick) return;

  if (state.currentTrick.cardsPlayed.length === 4) {
    const leadSuit = state.currentTrick.cardsPlayed[0].card.suit;

    // Evaluate trick winner with secret comparison logic
    const winningPlayedCard = determineTrickWinner(
      state.currentTrick.cardsPlayed,
      leadSuit,
      state.trumpSuit,
      state.trumpRevealed
    );

    // EXACT REVEAL & FLIP ANIMATION RULES:
    if (state.currentTrick.actualTrumpUsed) {
      // RULE 8 & 9: Reveal ACTUAL TRUMP after all 4 cards placed. It flips once and STAYS FACE-UP!
      const actualTrump = state.currentTrick.cardsPlayed.find(pc => pc.isActualTrump);
      if (actualTrump) {
        actualTrump.isFaceDown = false;
        actualTrump.isRevealed = true;
      }
      state.trumpRevealed = true; // Actual trump now face-up
    } else if (state.currentTrick.flippedGambleUsed) {
      // RULE 10, 11, 13, 14: Reveal ONLY the flipped gamble card. TRUMP REMAINS COMPLETELY HIDDEN!
      const flippedCard = state.currentTrick.cardsPlayed.find(pc => pc.isFlippedGamble);
      if (flippedCard) {
        flippedCard.isFaceDown = false;
        flippedCard.isRevealed = true;
      }
      // TRUMP STAYS HIDDEN! Do NOT reveal trumpCard!
    } else {
      // Normal play: reveal all face-down played cards
      state.currentTrick.cardsPlayed.forEach(pc => {
        pc.isFaceDown = false;
        pc.isRevealed = true;
      });
    }

    state.currentTrick.winnerSeat = winningPlayedCard.seat;
    const trickPts = getTrickPoints(state.currentTrick.cardsPlayed);
    state.currentTrick.points = trickPts;

    const winnerTeam = winningPlayedCard.seat % 2;
    if (winnerTeam === 0) {
      state.teamAScore += trickPts;
    } else {
      state.teamBScore += trickPts;
    }

    state.status = 'TRICK_COMPLETE';
    state.lastActionMessage = `${state.players[winningPlayedCard.seat].name} won trick ${state.currentTrick.trickNumber} (+${trickPts} pts)!`;
    logGameEvent(state.id, 'server', 'TRICK_COMPLETED', { trickNumber: state.currentTrick.trickNumber, winnerSeat: winningPlayedCard.seat });
  } else {
    state.currentTurnSeat = (state.currentTurnSeat + 1) % 4;
  }
}

function getNextActiveBidderSeat(state: GameEngineState): number {
  let nextSeat = (state.currentTurnSeat + 1) % 4;
  let attempts = 0;
  while (state.bidding.passes.includes(nextSeat) && attempts < 4) {
    nextSeat = (nextSeat + 1) % 4;
    attempts++;
  }
  return nextSeat;
}
