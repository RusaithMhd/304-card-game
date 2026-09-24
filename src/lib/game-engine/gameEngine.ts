import {
  GameEngineState,
  GameAction,
  PlayerState,
  Card,
  Suit,
  PlayedCard,
} from './types';
import { create32CardDeck, shuffleDeck, dealInitialCards, dealRemainingCards } from './deck';
import { isValidBid, getMinimumBidForPlayer, MIN_BID, MIN_BID_8_CARD } from './bidding';
import { getLegalCards, determineTrickWinner, getTrickPoints, canLeadCard } from './trickRules';
import { evaluateRoundResult } from './scoring';
import { canDeclarePCC, executePCC } from './pccRules';
import { logGameEvent } from './honestPlay';
import { sortPlayerHand, SUIT_SYMBOLS, getCardPoints } from './cardValues';
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
    bidTurnsCount: 0,
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
      bidStage: '4_CARD',
    },
    trumpSuit: null,
    trumpMode: 'CLOSED', // CLOSED TRUMP DEFAULT PRIORITY
    trumpCard: null,
    trumpRevealed: false,
    isPccDeclared: false,
    pccDeclaringSeat: undefined,
    isHonestPlayActive: true,
    pendingVoidChoiceSeat: null,
    pendingFlipSelectSeat: null,
    tricks: [],
    currentTrick: null,
    teamAScore: 0,
    teamBScore: 0,
    teamATokens: 11, // Match starting tokens
    teamBTokens: 11,
    targetScore: 22,
    targetReached: false,
    teamAMatchPoints: 0,
    teamBMatchPoints: 0,
    winningTeam: null,
    lastActionMessage: 'Game initialized. Sri Lankan 304 rules active.',
    updatedAt: Date.now(),
  };
}

export function applyGameAction(state: GameEngineState, action: GameAction): GameEngineState {
  if (state.status === 'GAME_COMPLETE' && action.type !== 'REMATCH') {
    throw new Error('Game is finished. No further card play or actions are allowed.');
  }

  const nextState = JSON.parse(JSON.stringify(state)) as GameEngineState;
  nextState.updatedAt = Date.now();

  switch (action.type) {
    case 'START_GAME': {
      if (nextState.players.length < 4) {
        throw new Error('304 requires exactly 4 players');
      }

      // Reset round state with deterministic room seed for multi-client card sync
      const deckSeed = `${nextState.roomId}_round_${nextState.teamAMatchPoints}_${nextState.teamBMatchPoints}`;
      const freshDeck = shuffleDeck(create32CardDeck(), deckSeed);
      const { hands, remainingDeck } = dealInitialCards(freshDeck);

      nextState.deck = remainingDeck;
      for (let i = 0; i < 4; i++) {
        nextState.players[i].cards = sortPlayerHand(hands[i]);
        nextState.players[i].cardCount = 4;
        nextState.players[i].bidTurnsCount = 0;
      }

      const playerRightOfDealer = (nextState.dealerSeat + 1) % 4;
      const initialHandPoints = hands[playerRightOfDealer].reduce((sum, c) => sum + getCardPoints(c), 0);

      // Rule 9: Redeal check if hand points < 15 for player right of dealer
      if (initialHandPoints < 15) {
        nextState.status = 'REDEAL_CHECK';
        nextState.redealEligibleSeat = playerRightOfDealer;
        nextState.currentTurnSeat = playerRightOfDealer;
        nextState.lastActionMessage = `${nextState.players[playerRightOfDealer].name} has ${initialHandPoints} points (<15). Redeal option available.`;
      } else {
        nextState.status = 'FOUR_CARD_BIDDING';
        nextState.redealEligibleSeat = null;
        nextState.currentTurnSeat = playerRightOfDealer;
        nextState.lastActionMessage = `4-card deal complete. ${nextState.players[nextState.currentTurnSeat].name}'s turn to bid (min 160).`;
      }

      nextState.bidding = {
        currentHighBid: 0,
        bidderSeat: null,
        passes: [],
        isComplete: false,
        bidStage: '4_CARD',
      };
      nextState.trumpSuit = null;
      nextState.trumpCard = null;
      nextState.trumpRevealed = false;
      nextState.tricks = [];
      nextState.currentTrick = null;
      nextState.teamAScore = 0;
      nextState.teamBScore = 0;
      nextState.isPccDeclared = false;
      nextState.isPartnerCloseCaps = false;
      nextState.capsDeclared = false;
      nextState.isSpoiltTrumpsDeclared = false;
      nextState.pendingVoidChoiceSeat = null;
      nextState.pendingFlipSelectSeat = null;

      logGameEvent(nextState.id, 'server', 'CARDS_DEALT', { dealerSeat: nextState.dealerSeat });
      break;
    }

    case 'REQUEST_REDEAL': {
      if (nextState.status !== 'REDEAL_CHECK' || action.seat !== nextState.redealEligibleSeat) {
        throw new Error('Not authorized to request redeal');
      }

      // Gather cards, shuffle, redeal with same dealer
      const freshDeck = shuffleDeck(create32CardDeck());
      const { hands, remainingDeck } = dealInitialCards(freshDeck);

      nextState.deck = remainingDeck;
      for (let i = 0; i < 4; i++) {
        nextState.players[i].cards = sortPlayerHand(hands[i]);
        nextState.players[i].cardCount = 4;
        nextState.players[i].bidTurnsCount = 0;
      }

      const playerRightOfDealer = (nextState.dealerSeat + 1) % 4;
      const initialHandPoints = hands[playerRightOfDealer].reduce((sum, c) => sum + getCardPoints(c), 0);

      if (initialHandPoints < 15) {
        nextState.status = 'REDEAL_CHECK';
        nextState.redealEligibleSeat = playerRightOfDealer;
        nextState.lastActionMessage = `Redealt. ${nextState.players[playerRightOfDealer].name} has ${initialHandPoints} points (<15).`;
      } else {
        nextState.status = 'FOUR_CARD_BIDDING';
        nextState.redealEligibleSeat = null;
        nextState.currentTurnSeat = playerRightOfDealer;
        nextState.lastActionMessage = `Redealt successfully! ${nextState.players[nextState.currentTurnSeat].name}'s turn to bid.`;
      }
      break;
    }

    case 'SKIP_REDEAL': {
      if (nextState.status !== 'REDEAL_CHECK' || action.seat !== nextState.redealEligibleSeat) {
        throw new Error('Not authorized to skip redeal');
      }
      nextState.status = 'FOUR_CARD_BIDDING';
      nextState.redealEligibleSeat = null;
      nextState.currentTurnSeat = (nextState.dealerSeat + 1) % 4;
      nextState.lastActionMessage = `${nextState.players[action.seat].name} skipped redeal. Bidding begins (min 160).`;
      break;
    }

    case 'PLACE_BID': {
      if (nextState.status !== 'FOUR_CARD_BIDDING' && nextState.status !== 'EIGHT_CARD_BIDDING') {
        throw new Error('Game is not in a BIDDING state');
      }
      if (action.seat !== nextState.currentTurnSeat) {
        throw new Error(`Not player ${action.seat}'s turn to bid`);
      }

      const player = nextState.players[action.seat];
      const isPartnerHighBidder = nextState.bidding.bidderSeat !== null && (nextState.bidding.bidderSeat % 2 === player.team);

      if (!isValidBid(action.amount, nextState.bidding.bidStage || '4_CARD', nextState.bidding.currentHighBid, isPartnerHighBidder, player.bidTurnsCount || 0)) {
        throw new Error(`Invalid bid amount ${action.amount}`);
      }

      player.bidTurnsCount = (player.bidTurnsCount || 0) + 1;

      if (nextState.bidding.bidStage === '8_CARD') {
        // 8-Card Bid overrides 4-card bid result!
        if (nextState.trumpCard && nextState.bidding.initialTrumpMakerSeat !== null) {
          // Return old indicator card to old maker's hand
          const oldMaker = nextState.players[nextState.bidding.initialTrumpMakerSeat!];
          oldMaker.cards.push(nextState.trumpCard);
          oldMaker.cards = sortPlayerHand(oldMaker.cards);
          oldMaker.cardCount = oldMaker.cards.length;
          nextState.trumpCard = null;
        }

        nextState.bidding.currentHighBid = action.amount;
        nextState.bidding.bidderSeat = action.seat;
        nextState.status = 'TRUMP_REPLACEMENT_8';
        nextState.currentTurnSeat = action.seat;
        nextState.lastActionMessage = `${player.name} placed 8-card bid of ${action.amount}! Select new Trump card from 8 cards.`;
      } else {
        // 4-Card Stage
        nextState.bidding.currentHighBid = action.amount;
        nextState.bidding.bidderSeat = action.seat;
        nextState.lastActionMessage = `${player.name} bid ${action.amount}`;
        nextState.currentTurnSeat = getNextActiveBidderSeat(nextState);
      }
      break;
    }

    case 'PASS_BID': {
      if (nextState.status !== 'FOUR_CARD_BIDDING' && nextState.status !== 'EIGHT_CARD_BIDDING') {
        throw new Error('Game is not in a BIDDING state');
      }
      if (action.seat !== nextState.currentTurnSeat) {
        throw new Error(`Not player ${action.seat}'s turn`);
      }

      const player = nextState.players[action.seat];
      player.bidTurnsCount = (player.bidTurnsCount || 0) + 1;

      if (!nextState.bidding.passes.includes(action.seat)) {
        nextState.bidding.passes.push(action.seat);
      }

      nextState.lastActionMessage = `${player.name} passed`;

      if (nextState.bidding.bidStage === '4_CARD') {
        // Check if all 4 passed -> Rule 10: NO PLAY, NO SCORE, NO TRUMP! Reset deal to next dealer.
        if (nextState.bidding.passes.length >= 4) {
          const nextDealer = (nextState.dealerSeat + 1) % 4;
          nextState.dealerSeat = nextDealer;
          nextState.lastActionMessage = 'All players passed in 4-card bidding! No play. Deal passes to next dealer.';
          
          const freshDeck = shuffleDeck(create32CardDeck());
          const { hands, remainingDeck } = dealInitialCards(freshDeck);
          nextState.deck = remainingDeck;
          for (let i = 0; i < 4; i++) {
            nextState.players[i].cards = sortPlayerHand(hands[i]);
            nextState.players[i].cardCount = 4;
            nextState.players[i].bidTurnsCount = 0;
          }
          nextState.bidding.passes = [];
          nextState.bidding.currentHighBid = 0;
          nextState.bidding.bidderSeat = null;
          nextState.currentTurnSeat = (nextDealer + 1) % 4;
          break;
        }

        // 3 passes after a bid -> 4-card bidding complete!
        if (nextState.bidding.passes.length >= 3 && nextState.bidding.bidderSeat !== null) {
          nextState.bidding.isComplete = true;
          nextState.bidding.initialTrumpMakerSeat = nextState.bidding.bidderSeat;
          nextState.bidding.initialBidAmount = nextState.bidding.currentHighBid;
          nextState.status = 'TRUMP_SELECTION_4';
          nextState.currentTurnSeat = nextState.bidding.bidderSeat;
          nextState.lastActionMessage = `Initial bidding complete! ${nextState.players[nextState.currentTurnSeat].name} won bid (${nextState.bidding.currentHighBid}). Select Trump card from 4 cards.`;
          break;
        }

        nextState.currentTurnSeat = getNextActiveBidderSeat(nextState);
      } else {
        // 8-Card Stage: 1 round counter-clockwise
        const unpassed = [0, 1, 2, 3].filter((s) => !nextState.bidding.passes.includes(s));
        if (unpassed.length <= 1 || nextState.bidding.passes.length >= 4) {
          // 8-card bidding complete!
          startTrickPlay(nextState);
        } else {
          nextState.currentTurnSeat = getNextActiveBidderSeat(nextState);
        }
      }
      break;
    }

    case 'DECLARE_PARTNER_CLOSE_CAPS': {
      if (nextState.status !== 'EIGHT_CARD_BIDDING') {
        throw new Error('Partner Close Caps can only be declared during 8-card bidding');
      }

      const player = nextState.players[action.seat];
      nextState.isPartnerCloseCaps = true;
      nextState.partnerCloseCapsSeat = action.seat;
      nextState.bidding.currentHighBid = 304;
      nextState.bidding.bidderSeat = action.seat;
      nextState.bidding.isPartnerCloseCaps = true;

      // Trump replacement for Partner Close Caps
      if (nextState.trumpCard && nextState.bidding.initialTrumpMakerSeat !== null) {
        const oldMaker = nextState.players[nextState.bidding.initialTrumpMakerSeat!];
        oldMaker.cards.push(nextState.trumpCard);
        oldMaker.cards = sortPlayerHand(oldMaker.cards);
        oldMaker.cardCount = oldMaker.cards.length;
        nextState.trumpCard = null;
      }

      nextState.status = 'TRUMP_REPLACEMENT_8';
      nextState.currentTurnSeat = action.seat;
      nextState.lastActionMessage = `🔥 ${player.name} DECLARED PARTNER CLOSE CAPS! Select Trump card from 8 cards.`;
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

      // Deal remaining 4 cards if still in deck (Honest Game requires 8 cards)
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
          nextState.players[i].cardCount = nextState.players[i].cards.length;
        }
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

      // Return old trump if replacing
      if (nextState.trumpCard && nextState.bidding.initialTrumpMakerSeat !== null && nextState.bidding.initialTrumpMakerSeat !== action.seat) {
        const oldMaker = nextState.players[nextState.bidding.initialTrumpMakerSeat!];
        oldMaker.cards.push(nextState.trumpCard);
        oldMaker.cards = sortPlayerHand(oldMaker.cards);
        oldMaker.cardCount = oldMaker.cards.length;
        nextState.trumpCard = null;
      }

      nextState.status = 'TRUMP_REPLACEMENT_8';
      nextState.currentTurnSeat = action.seat;
      nextState.lastActionMessage = `${player.name} declared HONEST GAME (250+ Commitment)! Select Trump card.`;
      break;
    }


    case 'SELECT_TRUMP': {
      if (nextState.status !== 'TRUMP_SELECTION_4' && nextState.status !== 'TRUMP_REPLACEMENT_8') {
        throw new Error('Game is not in a TRUMP_SELECTION state');
      }
      if (action.seat !== nextState.currentTurnSeat) {
        throw new Error('Only current trump maker can select trump');
      }

      const player = nextState.players[action.seat];
      const selectedTrumpCard = player.cards.find((c) => c.id === action.cardId) || player.cards[0];

      if (!selectedTrumpCard) {
        throw new Error('Invalid card selection for Trump');
      }

      // Establish Trump
      nextState.trumpSuit = selectedTrumpCard.suit;
      nextState.trumpMode = action.mode || 'CLOSED';
      nextState.trumpRevealed = action.mode === 'OPEN';
      nextState.trumpCard = selectedTrumpCard;

      // Extract indicator card from player's hand (placed face-down on table)
      player.cards = sortPlayerHand(player.cards.filter((c) => c.id !== selectedTrumpCard.id));
      player.cardCount = player.cards.length;

      if (nextState.status === 'TRUMP_SELECTION_4') {
        // Deal remaining 4 cards to all players
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
            nextState.players[i].cardCount = nextState.players[i].cards.length;
          }
        }

        // Proceed to 8-Card Bidding stage
        nextState.status = 'EIGHT_CARD_BIDDING';
        nextState.bidding.bidStage = '8_CARD';
        nextState.bidding.passes = [];
        nextState.currentTurnSeat = nextState.bidding.bidderSeat!;
        nextState.lastActionMessage = `Trump indicator set (${selectedTrumpCard.rank}${SUIT_SYMBOLS[selectedTrumpCard.suit]} - ${nextState.trumpMode}). Remaining 4 cards dealt! 8-Card Bidding begins (min 250).`;
      } else {
        // TRUMP_REPLACEMENT_8 -> Proceed directly to Trick 1
        startTrickPlay(nextState);
      }
      break;
    }

    case 'SEE_TRUMP': {
      if (!canViewTrumpCard(nextState, action.seat)) {
        throw new Error('Unauthorized to view Trump card');
      }

      revealTrumpState(nextState);
      nextState.lastActionMessage = `${nextState.players[action.seat].name} revealed TRUMP! Trump is ${SUIT_SYMBOLS[nextState.trumpSuit!]} (${nextState.trumpCard?.rank || ''}).`;
      break;
    }

    case 'REVEAL_TRUMP': {
      if (!nextState.trumpRevealed && nextState.trumpSuit) {
        revealTrumpState(nextState);
        nextState.lastActionMessage = `Trump revealed! Trump suit is ${SUIT_SYMBOLS[nextState.trumpSuit]}.`;
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
          isFaceDown: true,
          isRevealed: false,
        };

        nextState.currentTrick.cardsPlayed.push(playedCard);
        nextState.currentTrick.actualTrumpUsed = true;
        nextState.pendingVoidChoiceSeat = null;
        nextState.pendingFlipSelectSeat = null;

        nextState.lastActionMessage = `${player.name} placed the ACTUAL TRUMP face-down on the table!`;
        checkAndResolveTrick(nextState);
      } else if (action.option === 'FLIP_CARD') {
        nextState.pendingVoidChoiceSeat = null;
        nextState.pendingFlipSelectSeat = action.seat;
        nextState.lastActionMessage = `${player.name} chose FLIP A CARD! Select 1 card to gamble.`;
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
      const cardToPlay = player.cards.find((c) => c.id === action.cardId);
      if (!cardToPlay) {
        throw new Error(`Card ${action.cardId} not found in player ${action.seat}'s hand`);
      }

      const isTrick1 = nextState.currentTrick.trickNumber === 1;
      const isTrumpMaker = action.seat === nextState.bidding.bidderSeat;
      const isTrumpMakerRightOfDealer = action.seat === (nextState.dealerSeat + 1) % 4;

      // If leading trick, check lead restrictions (Rule 22 & 23)
      if (nextState.currentTrick.cardsPlayed.length === 0) {
        if (!canLeadCard(cardToPlay, player.cards, isTrick1, isTrumpMakerRightOfDealer, isTrumpMaker, nextState.trumpSuit, nextState.trumpRevealed, nextState.trumpCard)) {
          throw new Error('Cannot lead this card under 304 trump lead restrictions!');
        }
      }

      const leadSuit = nextState.currentTrick.cardsPlayed.length > 0
        ? nextState.currentTrick.cardsPlayed[0].card.suit
        : null;

      // Handle card play during pending flip selection
      if (nextState.pendingFlipSelectSeat === action.seat) {
        player.cards = sortPlayerHand(player.cards.filter((c) => c.id !== cardToPlay.id));
        player.cardCount = player.cards.length;

        nextState.currentTrick.cardsPlayed.push({
          seat: action.seat,
          card: cardToPlay,
          playedAt: Date.now(),
          isFlippedGamble: true,
          isFaceDown: true,
          isRevealed: false,
        });

        nextState.currentTrick.flippedGambleUsed = true;
        nextState.pendingFlipSelectSeat = null;
        nextState.pendingVoidChoiceSeat = null;

        nextState.lastActionMessage = `${player.name} placed a gamble FLIP card face-down!`;
        checkAndResolveTrick(nextState);
        break;
      }

      // Check follow suit
      if (leadSuit) {
        const leadSuitCards = player.cards.filter((c) => c.suit === leadSuit);

        if (leadSuitCards.length > 0) {
          if (cardToPlay.suit !== leadSuit) {
            throw new Error(`Illegal card play! Must follow lead suit ${SUIT_SYMBOLS[leadSuit]}`);
          }
        } else {
          // Void in lead suit:
          // In CLOSED TRUMP mode (trump not revealed), prompt player to choose USE TRUMP or FLIP A CARD.
          // In OPEN TRUMP mode, any played card is played face-up directly!
          if (!nextState.trumpRevealed && nextState.trumpMode === 'CLOSED') {
            nextState.pendingVoidChoiceSeat = action.seat;
            nextState.lastActionMessage = `${player.name} has no ${SUIT_SYMBOLS[leadSuit]}. Choose USE TRUMP or FLIP A CARD.`;
            return nextState;
          }
        }
      }

      // Normal card play
      player.cards = sortPlayerHand(player.cards.filter((c) => c.id !== cardToPlay.id));
      player.cardCount = player.cards.length;

      nextState.currentTrick.cardsPlayed.push({
        seat: action.seat,
        card: cardToPlay,
        playedAt: Date.now(),
        isFaceDown: false,
        isRevealed: true,
      });

      nextState.lastActionMessage = `${player.name} played ${cardToPlay.rank} of ${cardToPlay.suit}`;
      checkAndResolveTrick(nextState);
      break;
    }

    case 'DECLARE_CAPS': {
      if (nextState.status !== 'PLAYING') {
        throw new Error('Caps can only be declared during active play');
      }

      const player = nextState.players[action.seat];
      const isBeforeTrick7 = (nextState.currentTrick?.trickNumber || 1) < 7;

      nextState.capsDeclared = true;
      nextState.capsDeclaringSeat = action.seat;
      nextState.capsDeclaredBeforeTrick7 = isBeforeTrick7;

      nextState.lastActionMessage = `⭐ ${player.name} DECLARED CAPS! (${isBeforeTrick7 ? 'Before Trick 7' : 'After Trick 7'})`;
      break;
    }

    case 'DECLARE_SPOILT_TRUMPS': {
      if (nextState.status !== 'PLAYING') {
        throw new Error('Spoilt Trumps can only be declared during active play');
      }

      const player = nextState.players[action.seat];

      // Check if trump maker's opponents hold 0 trumps
      const bidderTeam = (nextState.bidding.bidderSeat ?? 0) % 2;
      const opponentPlayers = nextState.players.filter((p) => p.team !== bidderTeam);
      const opponentTrumpsCount = opponentPlayers.reduce(
        (sum, p) => sum + p.cards.filter((c) => c.suit === nextState.trumpSuit).length,
        0
      );

      if (opponentTrumpsCount === 0) {
        nextState.isSpoiltTrumpsDeclared = true;
        nextState.spoiltTrumpsDeclaringSeat = action.seat;
        nextState.status = 'ROUND_COMPLETE';
        nextState.lastActionMessage = `🚫 SPOILT TRUMPS declared by ${player.name}! Opponents hold 0 trumps. Hand cancelled, NO SCORE!`;
      } else {
        throw new Error('Cannot declare Spoilt Trumps: Opponents still hold trumps!');
      }
      break;
    }

    case 'NEXT_TRICK': {
      if (nextState.status !== 'TRICK_COMPLETE' || !nextState.currentTrick) {
        throw new Error('Cannot advance to next trick');
      }

      nextState.tricks.push(nextState.currentTrick);
      const prevWinnerSeat = nextState.currentTrick.winnerSeat!;

      // Check Caps failure (if team declared caps and lost trick)
      if (nextState.capsDeclared && nextState.capsDeclaringSeat !== undefined) {
        const declaringTeam = nextState.capsDeclaringSeat % 2;
        const winnerTeam = prevWinnerSeat % 2;
        if (declaringTeam !== winnerTeam) {
          nextState.capsTrickLost = true;
        }
      }

      // Rule 26: 250+ bid forces reveal of trump at end of Trick 1
      if (nextState.currentTrick.trickNumber === 1 && (nextState.bidding.currentHighBid >= 250 || nextState.isPartnerCloseCaps)) {
        revealTrumpState(nextState);
      }

      if (nextState.currentTrick.trickNumber < 8 && !nextState.capsTrickLost) {
        nextState.currentTrick = {
          trickNumber: nextState.currentTrick.trickNumber + 1,
          leadSeat: prevWinnerSeat,
          cardsPlayed: [],
          points: 0,
        };
        nextState.currentTurnSeat = prevWinnerSeat;
        nextState.status = 'PLAYING';
      } else {
        // Round End
        nextState.currentTrick = null;
        const result = evaluateRoundResult(
          nextState.teamAScore,
          nextState.teamBScore,
          nextState.bidding.bidderSeat ?? 0,
          nextState.bidding.currentHighBid,
          nextState.isPartnerCloseCaps || false,
          nextState.capsDeclared || false,
          nextState.capsDeclaredBeforeTrick7 || false,
          nextState.capsTrickLost || false
        );

        if (nextState.honestGame) {
          const honestResult = evaluateHonestGameResult(nextState);
          nextState.honestGameResult = honestResult;
        }

        nextState.winningTeam = result.winningTeam;
        nextState.teamATokens = Math.max(0, Math.min(22, nextState.teamATokens + result.tokensAwarded.teamA));
        nextState.teamBTokens = Math.max(0, Math.min(22, nextState.teamBTokens + result.tokensAwarded.teamB));

        const targetLimit = nextState.targetScore ?? 22;
        if (
          nextState.teamATokens >= targetLimit ||
          nextState.teamBTokens >= targetLimit ||
          nextState.teamATokens === 0 ||
          nextState.teamBTokens === 0
        ) {
          nextState.targetReached = true;
        }

        // Do NOT automatically terminate game on target reached; allow players to choose Finish Game
        nextState.status = 'ROUND_COMPLETE';
        nextState.lastActionMessage = result.summary;
      }
      break;
    }

    case 'CONFIRM_FINISH_GAME': {
      const targetLimit = nextState.targetScore ?? 22;
      const isTargetMet =
        nextState.targetReached ||
        nextState.teamATokens >= targetLimit ||
        nextState.teamBTokens >= targetLimit ||
        nextState.teamATokens === 0 ||
        nextState.teamBTokens === 0;

      if (!isTargetMet) {
        throw new Error('Target score has not been reached yet.');
      }

      nextState.status = 'GAME_COMPLETE';
      nextState.finishedAt = Date.now();
      nextState.finishedBy = nextState.players.find((p) => p.seat === action.seat)?.id;
      nextState.winningTeam = nextState.teamATokens >= nextState.teamBTokens ? 0 : 1;
      nextState.lastActionMessage = 'Match finished by player confirmation.';
      break;
    }

    case 'REMATCH': {
      const newDealer = (nextState.dealerSeat + 1) % 4;
      const freshDeck = shuffleDeck(create32CardDeck());
      const { hands, remainingDeck } = dealInitialCards(freshDeck);

      nextState.dealerSeat = newDealer;
      nextState.currentTurnSeat = (newDealer + 1) % 4;
      nextState.deck = remainingDeck;
      nextState.status = 'FOUR_CARD_BIDDING';
      nextState.bidding = {
        currentHighBid: 0,
        bidderSeat: null,
        passes: [],
        isComplete: false,
        bidStage: '4_CARD',
      };
      nextState.trumpSuit = null;
      nextState.trumpMode = 'CLOSED';
      nextState.trumpCard = null;
      nextState.trumpRevealed = false;
      nextState.isPccDeclared = false;
      nextState.isPartnerCloseCaps = false;
      nextState.capsDeclared = false;
      nextState.isSpoiltTrumpsDeclared = false;
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
        nextState.players[i].bidTurnsCount = 0;
      }

      nextState.lastActionMessage = `Rematch started! New dealer is ${nextState.players[newDealer].name}.`;
      break;
    }
  }

  return nextState;
}

function startTrickPlay(state: GameEngineState) {
  const leadSeat = state.isPartnerCloseCaps && state.partnerCloseCapsSeat !== undefined
    ? state.partnerCloseCapsSeat
    : (state.dealerSeat + 1) % 4;

  state.status = 'PLAYING';
  state.currentTurnSeat = leadSeat;
  state.currentTrick = {
    trickNumber: 1,
    leadSeat,
    cardsPlayed: [],
    points: 0,
  };

  state.lastActionMessage = `Trump selected (${state.trumpCard?.rank}${SUIT_SYMBOLS[state.trumpSuit!]} - ${state.trumpMode}). Trick 1 begins!`;
}

function checkAndResolveTrick(state: GameEngineState) {
  if (!state.currentTrick) return;

  const activePlayersCount = state.isPartnerCloseCaps ? 3 : 4;

  if (state.currentTrick.cardsPlayed.length === activePlayersCount) {
    const leadSuit = state.currentTrick.cardsPlayed[0].card.suit;

    const winningPlayedCard = determineTrickWinner(
      state.currentTrick.cardsPlayed,
      leadSuit,
      state.trumpSuit,
      state.trumpRevealed
    );

    if (state.currentTrick.actualTrumpUsed) {
      const actualTrump = state.currentTrick.cardsPlayed.find((pc) => pc.isActualTrump);
      if (actualTrump) {
        actualTrump.isFaceDown = false;
        actualTrump.isRevealed = true;
      }
      state.trumpRevealed = true;
      state.trumpMode = 'OPEN';
    } else if (state.currentTrick.flippedGambleUsed) {
      const flippedCard = state.currentTrick.cardsPlayed.find((pc) => pc.isFlippedGamble);
      if (flippedCard) {
        flippedCard.isFaceDown = false;
        flippedCard.isRevealed = true;
      }
    } else {
      state.currentTrick.cardsPlayed.forEach((pc) => {
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
  } else {
    let nextSeat = (state.currentTurnSeat + 1) % 4;

    // Skip partner if Partner Close Caps is active
    if (state.isPartnerCloseCaps && state.partnerCloseCapsSeat !== undefined) {
      const partnerSeat = (state.partnerCloseCapsSeat + 2) % 4;
      if (nextSeat === partnerSeat) {
        nextSeat = (nextSeat + 1) % 4;
      }
    }

    state.currentTurnSeat = nextSeat;
  }
}

export function revealTrumpState(nextState: GameEngineState) {
  if (nextState.trumpRevealed && nextState.trumpMode === 'OPEN') return;

  nextState.trumpRevealed = true;
  nextState.trumpMode = 'OPEN';

  // Check if physical trumpCard indicator exists and hasn't been played into a trick
  if (nextState.trumpCard && nextState.bidding.bidderSeat !== null) {
    const isPlayedInTrick =
      nextState.tricks.some((t) => t.cardsPlayed.some((pc) => pc.card.id === nextState.trumpCard!.id)) ||
      (nextState.currentTrick?.cardsPlayed.some((pc) => pc.card.id === nextState.trumpCard!.id) ?? false);

    if (!isPlayedInTrick) {
      const maker = nextState.players[nextState.bidding.bidderSeat];
      if (!maker.cards.some((c) => c.id === nextState.trumpCard!.id)) {
        maker.cards.push(nextState.trumpCard);
        maker.cards = sortPlayerHand(maker.cards);
        maker.cardCount = maker.cards.length;
      }
    }
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

