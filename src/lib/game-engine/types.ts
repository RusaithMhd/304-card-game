// 304 Card Game Types

export type Suit = 'H' | 'D' | 'C' | 'S'; // Hearts, Diamonds, Clubs, Spades
export type Rank = 'J' | '9' | 'A' | '10' | 'K' | 'Q' | '8' | '7';

export interface Card {
  id: string; // e.g. "J-H"
  suit: Suit;
  rank: Rank;
}

export type GameStatus =
  | 'WAITING'
  | 'DEALING_PART_1'
  | 'BIDDING'
  | 'TRUMP_SELECTION'
  | 'DEALING_PART_2'
  | 'PLAYING'
  | 'TRICK_COMPLETE'
  | 'ROUND_COMPLETE'
  | 'GAME_COMPLETE';

export interface PlayedCard {
  seat: number; // 0, 1, 2, 3
  card: Card;
  playedAt: number;
  isActualTrump?: boolean;
  isFlippedGamble?: boolean;
  isFaceDown?: boolean;
  isRevealed?: boolean;
}

export interface TrickState {
  trickNumber: number; // 1 to 8
  leadSeat: number;
  leadSuit?: Suit | null;
  cardsPlayed: PlayedCard[];
  winnerSeat?: number;
  points: number;
  actualTrumpUsed?: boolean;
  flippedGambleUsed?: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  seat: number; // 0=South, 1=East, 2=North, 3=West
  team: number; // 0=Team A (South/North), 1=Team B (East/West)
  cards: Card[]; // Private to user, empty/masked for opponents
  cardCount: number;
  isReady: boolean;
  isConnected: boolean;
}

export interface BidState {
  currentHighBid: number; // e.g., 160
  bidderSeat: number | null;
  passes: number[]; // seats that passed
  isComplete: boolean;
}

export interface GameEngineState {
  id: string;
  roomId: string;
  status: GameStatus;
  players: PlayerState[];
  dealerSeat: number;
  currentTurnSeat: number;
  deck: Card[];
  bidding: BidState;
  trumpSuit: Suit | null;
  trumpMode: 'OPEN' | 'CLOSED';
  trumpCard: Card | null; // Set if CLOSED trump mode (hidden on server)
  trumpRevealed: boolean;
  isPccDeclared?: boolean;
  pccDeclaringSeat?: number;
  isHonestPlayActive?: boolean;
  pendingVoidChoiceSeat?: number | null; // Seat facing [USE TRUMP] vs [FLIP A CARD] decision
  pendingFlipSelectSeat?: number | null; // Seat selecting 1 gamble card from hand
  honestGame?: boolean;
  honestGamePlayerId?: string;
  honestGameTeamId?: number;
  honestGameCommitment?: number; // 250
  honestGamePlacedBySeat?: number;
  honestGameStage?: 'AFTER_4' | 'AFTER_8';
  honestGameResult?: 'SUCCESS' | 'FAILED';
  tricks: TrickState[];
  currentTrick: TrickState | null;
  teamAScore: number; // Accumulated card points across tricks
  teamBScore: number;
  teamAMatchPoints: number; // Game caps won
  teamBMatchPoints: number;
  winningTeam: number | null;
  lastActionMessage?: string;
  updatedAt: number;
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'PLACE_BID'; seat: number; amount: number }
  | { type: 'PASS_BID'; seat: number }
  | { type: 'DECLARE_PCC'; seat: number }
  | { type: 'DECLARE_HONEST_GAME'; seat: number }
  | { type: 'SEE_TRUMP'; seat: number }
  | { type: 'SELECT_TRUMP'; seat: number; cardId: string; suit?: Suit; mode?: 'OPEN' | 'CLOSED' }
  | { type: 'REVEAL_TRUMP'; seat: number }
  | { type: 'CHOOSE_VOID_OPTION'; seat: number; option: 'USE_TRUMP' | 'FLIP_CARD' }
  | { type: 'PLAY_CARD'; seat: number; cardId: string }
  | { type: 'NEXT_TRICK' }
  | { type: 'REMATCH' };
