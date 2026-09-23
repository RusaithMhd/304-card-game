export interface RoundResult {
  winningTeam: number; // 0 for Team A, 1 for Team B
  teamAScore: number;
  teamBScore: number;
  bidderTeam: number;
  bidAmount: number;
  bidSuccess: boolean;
  tokensAwarded: { teamA: number; teamB: number }; // Net token transfers (+ and -)
  isCapOrMarley: boolean;
  summary: string;
}

/**
  * Calculates token transfer based on Sri Lankan 304 rules table:
  * < 200: +1 / -2
  * 200-249: +2 / -3
  * 250+: +3 / -4
  * Partner Close Caps: +4 / -5
  */
export function calculateBaseTokens(bidAmount: number, isPartnerCloseCaps: boolean, isSuccess: boolean): number {
  if (isPartnerCloseCaps) {
    return isSuccess ? 4 : 5;
  }
  if (bidAmount >= 250) {
    return isSuccess ? 3 : 4;
  }
  if (bidAmount >= 200) {
    return isSuccess ? 2 : 3;
  }
  return isSuccess ? 1 : 2;
}

export function evaluateRoundResult(
  teamAScore: number,
  teamBScore: number,
  bidderSeat: number,
  bidAmount: number,
  isPartnerCloseCaps: boolean = false,
  capsDeclared: boolean = false,
  capsDeclaredBeforeTrick7: boolean = false,
  capsTrickLost: boolean = false,
  wrongCaps: boolean = false
): RoundResult {
  const bidderTeam = bidderSeat % 2;
  const nonBidderTeam = bidderTeam === 0 ? 1 : 0;
  const bidderTeamScore = bidderTeam === 0 ? teamAScore : teamBScore;

  let bidSuccess = bidderTeamScore >= bidAmount;
  const isCapOrMarley = bidderTeamScore === 304;

  if (isPartnerCloseCaps) {
    // Partner Close Caps requires winning ALL 8 tricks (304 points)
    bidSuccess = bidderTeamScore === 304;
  }

  let winningTeam: number;
  let tokensTransfer = 0;

  if (wrongCaps) {
    // Rule 39: Wrong Caps penalty (-2 tokens from declaring team)
    winningTeam = nonBidderTeam;
    tokensTransfer = 2;
  } else if (capsTrickLost) {
    // Rule 39: Losing a trick after announcing Caps (-5 tokens)
    winningTeam = nonBidderTeam;
    tokensTransfer = 5;
  } else if (bidSuccess) {
    winningTeam = bidderTeam;
    tokensTransfer = calculateBaseTokens(bidAmount, isPartnerCloseCaps, true);
    if (capsDeclared && capsDeclaredBeforeTrick7) {
      // Rule 39: +1 additional token for correct Caps before 7th trick
      tokensTransfer += 1;
    }
  } else {
    winningTeam = nonBidderTeam;
    tokensTransfer = calculateBaseTokens(bidAmount, isPartnerCloseCaps, false);
  }

  const teamATokenChange = winningTeam === 0 ? tokensTransfer : -tokensTransfer;
  const teamBTokenChange = winningTeam === 1 ? tokensTransfer : -tokensTransfer;

  const summary = bidSuccess
    ? `Team ${winningTeam === 0 ? 'A' : 'B'} made bid of ${bidAmount} (${bidderTeamScore} pts)! Transfer: +${tokensTransfer} tokens.`
    : `Team ${bidderTeam === 0 ? 'A' : 'B'} failed bid of ${bidAmount} (scored ${bidderTeamScore}). Team ${winningTeam === 0 ? 'A' : 'B'} wins +${tokensTransfer} tokens!`;

  return {
    winningTeam,
    teamAScore,
    teamBScore,
    bidderTeam,
    bidAmount,
    bidSuccess,
    tokensAwarded: { teamA: teamATokenChange, teamB: teamBTokenChange },
    isCapOrMarley,
    summary,
  };
}

