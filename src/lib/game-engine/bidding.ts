export const MIN_BID = 160;
export const MAX_BID = 304;
export const BID_STEP = 10;

export function getValidBids(currentHighBid: number): number[] {
  const bids: number[] = [];
  const start = currentHighBid > 0 ? Math.ceil((currentHighBid + 1) / BID_STEP) * BID_STEP : MIN_BID;
  
  for (let b = Math.max(MIN_BID, start); b <= MAX_BID; b += BID_STEP) {
    bids.push(b);
  }
  return bids;
}

export function isValidBid(amount: number, currentHighBid: number): boolean {
  if (amount < MIN_BID || amount > MAX_BID) return false;
  if (amount % BID_STEP !== 0) return false;
  return amount > currentHighBid;
}
