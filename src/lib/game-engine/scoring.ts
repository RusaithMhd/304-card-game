export interface RoundResult {
  winningTeam: number; // 0 for Team A, 1 for Team B
  teamAScore: number;
  teamBScore: number;
  bidderTeam: number;
  bidAmount: number;
  bidSuccess: boolean;
  matchPointsAwarded: { teamA: number; teamB: number };
  isCapOrMarley: boolean;
  summary: string;
}

export function evaluateRoundResult(
  teamAScore: number,
  teamBScore: number,
  bidderSeat: number,
  bidAmount: number
): RoundResult {
  // Seat 0 & 2 = Team 0 (Team A). Seat 1 & 3 = Team 1 (Team B).
  const bidderTeam = bidderSeat % 2;
  const nonBidderTeam = bidderTeam === 0 ? 1 : 0;
  const bidderTeamScore = bidderTeam === 0 ? teamAScore : teamBScore;

  const bidSuccess = bidderTeamScore >= bidAmount;
  const isCapOrMarley = bidderTeamScore === 304;

  let winningTeam: number;
  let teamAMatchPoints = 0;
  let teamBMatchPoints = 0;

  if (bidSuccess) {
    winningTeam = bidderTeam;
    const pointsWon = isCapOrMarley ? 2 : 1;
    if (winningTeam === 0) teamAMatchPoints = pointsWon;
    else teamBMatchPoints = pointsWon;
  } else {
    winningTeam = nonBidderTeam;
    if (winningTeam === 0) teamAMatchPoints = 1;
    else teamBMatchPoints = 1;
  }

  const summary = bidSuccess
    ? `Team ${winningTeam === 0 ? 'A' : 'B'} made their bid of ${bidAmount} with ${bidderTeamScore} points!${isCapOrMarley ? ' MARLEY/CAP BONUS!' : ''}`
    : `Team ${bidderTeam === 0 ? 'A' : 'B'} failed bid of ${bidAmount} (scored ${bidderTeamScore}). Team ${winningTeam === 0 ? 'A' : 'B'} wins!`;

  return {
    winningTeam,
    teamAScore,
    teamBScore,
    bidderTeam,
    bidAmount,
    bidSuccess,
    matchPointsAwarded: { teamA: teamAMatchPoints, teamB: teamBMatchPoints },
    isCapOrMarley,
    summary,
  };
}
