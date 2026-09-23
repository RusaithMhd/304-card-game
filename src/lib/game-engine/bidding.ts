export const MIN_BID = 160;
export const MIN_BID_8_CARD = 250;
export const MAX_BID = 304;
export const BID_STEP = 10;

/**
 * Minimum allowed bid for a player depending on stage, partner status, and turn count.
 */
export function getMinimumBidForPlayer(
  stage: '4_CARD' | '8_CARD',
  currentHighBid: number,
  isPartnerHighBidder: boolean,
  playerTurnCount: number
): number {
  if (stage === '8_CARD') {
    return Math.max(MIN_BID_8_CARD, currentHighBid > 0 ? Math.ceil((currentHighBid + 1) / BID_STEP) * BID_STEP : MIN_BID_8_CARD);
  }

  // 4-Card Stage:
  // Rule 8A: 2nd turn cannot bid below 200
  // Rule 8B: If partner is current highest bidder, cannot bid below 200
  if (playerTurnCount > 0 || isPartnerHighBidder) {
    const nextStepAboveCurrent = currentHighBid > 0 ? Math.ceil((currentHighBid + 1) / BID_STEP) * BID_STEP : 200;
    return Math.max(200, nextStepAboveCurrent);
  }

  const nextStep = currentHighBid > 0 ? Math.ceil((currentHighBid + 1) / BID_STEP) * BID_STEP : MIN_BID;
  return Math.max(MIN_BID, nextStep);
}

export function getValidBids(
  stage: '4_CARD' | '8_CARD' = '4_CARD',
  currentHighBid: number = 0,
  isPartnerHighBidder: boolean = false,
  playerTurnCount: number = 0
): number[] {
  const bids: number[] = [];
  const minAllowed = getMinimumBidForPlayer(stage, currentHighBid, isPartnerHighBidder, playerTurnCount);

  for (let b = minAllowed; b <= MAX_BID; b += BID_STEP) {
    bids.push(b);
  }
  return bids;
}

export function isValidBid(
  amount: number,
  stage: '4_CARD' | '8_CARD' = '4_CARD',
  currentHighBid: number = 0,
  isPartnerHighBidder: boolean = false,
  playerTurnCount: number = 0
): boolean {
  if (amount > MAX_BID) return false;
  if (amount % BID_STEP !== 0 && amount !== 304) return false;

  const minAllowed = getMinimumBidForPlayer(stage, currentHighBid, isPartnerHighBidder, playerTurnCount);
  if (amount < minAllowed) return false;

  return amount > currentHighBid;
}

