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
  | 'DEAL_INITIAL_4'
  | 'REDEAL_CHECK'
  | 'FOUR_CARD_BIDDING'
  | 'TRUMP_SELECTION_4'
  | 'DEAL_FINAL_4'
  | 'EIGHT_CARD_BIDDING'
  | 'TRUMP_REPLACEMENT_8'
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
  bidTurnsCount?: number; // Number of bid actions in current bidding round
}

export interface BidState {
  currentHighBid: number; // e.g., 160
  bidderSeat: number | null;
  passes: number[]; // seats that passed
  isComplete: boolean;
  bidStage?: '4_CARD' | '8_CARD';
  initialTrumpMakerSeat?: number | null;
  initialBidAmount?: number;
  isPartnerCloseCaps?: boolean;
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
  trumpCard: Card | null; // Selected physical indicator card
  trumpRevealed: boolean;
  
  // 304 Special Rules State
  redealEligibleSeat?: number | null;
  redealRequestedBy?: number | null;
  isPccDeclared?: boolean;
  pccDeclaringSeat?: number;
  isPartnerCloseCaps?: boolean;
  partnerCloseCapsSeat?: number;
  capsDeclared?: boolean;
  capsDeclaringSeat?: number;
  capsDeclaredBeforeTrick7?: boolean;
  capsTrickLost?: boolean;
  isSpoiltTrumpsDeclared?: boolean;
  spoiltTrumpsDeclaringSeat?: number;
  
  // Honest Game State
  isHonestPlayActive?: boolean;
  pendingVoidChoiceSeat?: number | null;
  pendingFlipSelectSeat?: number | null;
  honestGame?: boolean;
  honestGamePlayerId?: string;
  honestGameTeamId?: number;
  honestGameCommitment?: number; // 250
  honestGamePlacedBySeat?: number;
  honestGameStage?: 'AFTER_4' | 'AFTER_8';
  honestGameResult?: 'SUCCESS' | 'FAILED';
  
  // Target Score & Finish Game State
  targetScore?: number; // Target score threshold (default 22 for token target)
  targetReached?: boolean;
  finishedAt?: number;
  finishedBy?: string;

  tricks: TrickState[];
  currentTrick: TrickState | null;
  
  // Points & Tokens
  teamAScore: number; // Card points (out of 304)
  teamBScore: number;
  teamATokens: number; // Match token balance (starts at 11)
  teamBTokens: number; // Match token balance (starts at 11)
  teamAMatchPoints: number; // Historical round wins
  teamBMatchPoints: number;
  winningTeam: number | null;
  lastActionMessage?: string;
  updatedAt: number;
}

export type GameAction =
  | { type: 'START_GAME' }
  | { type: 'REQUEST_REDEAL'; seat: number }
  | { type: 'SKIP_REDEAL'; seat: number }
  | { type: 'PLACE_BID'; seat: number; amount: number }
  | { type: 'PASS_BID'; seat: number }
  | { type: 'DECLARE_PCC'; seat: number }
  | { type: 'DECLARE_PARTNER_CLOSE_CAPS'; seat: number }
  | { type: 'DECLARE_HONEST_GAME'; seat: number }
  | { type: 'SELECT_TRUMP'; seat: number; cardId: string; suit?: Suit; mode?: 'OPEN' | 'CLOSED' }

  | { type: 'SEE_TRUMP'; seat: number }
  | { type: 'REVEAL_TRUMP'; seat: number }
  | { type: 'CHOOSE_VOID_OPTION'; seat: number; option: 'USE_TRUMP' | 'FLIP_CARD' | 'REVEAL_TRUMP' }
  | { type: 'PLAY_CARD'; seat: number; cardId: string }
  | { type: 'DECLARE_CAPS'; seat: number }
  | { type: 'DECLARE_SPOILT_TRUMPS'; seat: number }
  | { type: 'NEXT_TRICK' }
  | { type: 'CONFIRM_FINISH_GAME'; seat: number }
  | { type: 'REMATCH' };

