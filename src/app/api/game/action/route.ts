import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { applyGameAction, createInitialState, createInitialPlayer } from '../../../../lib/game-engine/gameEngine';
import { GameEngineState, GameAction, Card } from '../../../../lib/game-engine/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, userId, seat, action } = body as {
      roomId: string;
      userId: string;
      seat: number;
      action: GameAction;
    };

    if (!roomId || seat === undefined || !action) {
      return NextResponse.json({ success: false, error: { code: 'MISSING_PARAM', message: 'Missing roomId, seat, or action' } }, { status: 400 });
    }

    // 1. Fetch active game record from database
    const { data: gameRecord } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('room_id', roomId)
      .single();

    let gameState: GameEngineState;

    if (!gameRecord) {
      // Fetch room players to initialize new game session
      const { data: roomMembers } = await supabaseAdmin
        .from('room_players')
        .select('seat, user_id, profiles(username, display_name, avatar_url)')
        .eq('room_id', roomId)
        .order('seat', { ascending: true });

      if (!roomMembers || roomMembers.length < 4) {
        return NextResponse.json({ success: false, error: { code: 'ROOM_NOT_READY', message: 'Game requires 4 players' } }, { status: 400 });
      }

      const players = roomMembers.map((m: any) =>
        createInitialPlayer(
          m.user_id,
          m.profiles?.display_name || m.profiles?.username || `Player ${m.seat}`,
          m.profiles?.avatar_url || '',
          m.seat
        )
      );

      gameState = createInitialState(roomId, players);
      gameState = applyGameAction(gameState, { type: 'START_GAME' });

      // Persist new game session to database
      const { data: createdGame } = await supabaseAdmin
        .from('games')
        .insert({
          room_id: roomId,
          status: gameState.status,
          dealer_seat: gameState.dealerSeat,
          current_turn_seat: gameState.currentTurnSeat,
          current_high_bid: gameState.bidding.currentHighBid,
          team_a_score: gameState.teamAScore,
          team_b_score: gameState.teamBScore,
          team_a_tokens: gameState.teamATokens,
          team_b_tokens: gameState.teamBTokens,
        })
        .select()
        .single();

      // Persist private hands to game_players table
      for (const p of gameState.players) {
        await supabaseAdmin.from('game_players').insert({
          game_id: createdGame.id,
          user_id: p.id,
          seat: p.seat,
          team: p.team,
          private_hand: p.cards,
          card_count: p.cards.length,
        });
      }

      // Log start game audit event
      await supabaseAdmin.from('game_events').insert({
        game_id: createdGame.id,
        user_id: userId,
        event_type: 'START_GAME',
        payload: { dealerSeat: gameState.dealerSeat },
      });

      return returnSanitizedGameState(gameState, seat);
    } else {
      // Reconstruct gameState from database
      const { data: dbGamePlayers } = await supabaseAdmin
        .from('game_players')
        .select('user_id, seat, team, private_hand, card_count, profiles(username, display_name, avatar_url)')
        .eq('game_id', gameRecord.id)
        .order('seat', { ascending: true });

      const players = (dbGamePlayers || []).map((gp: any) => ({
        id: gp.user_id,
        name: gp.profiles?.display_name || gp.profiles?.username || `Player ${gp.seat}`,
        avatar: gp.profiles?.avatar_url || '',
        seat: gp.seat,
        team: gp.team,
        cards: (gp.private_hand as Card[]) || [],
        cardCount: gp.card_count || 0,
        isReady: true,
        isConnected: true,
      }));

      // Reconstruct state object
      gameState = {
        id: gameRecord.id,
        roomId: gameRecord.room_id,
        status: gameRecord.status,
        players,
        dealerSeat: gameRecord.dealer_seat,
        currentTurnSeat: gameRecord.current_turn_seat,
        deck: [],
        bidding: {
          currentHighBid: gameRecord.current_high_bid,
          bidderSeat: gameRecord.bidder_seat,
          passes: [],
          isComplete: false,
        },
        trumpSuit: gameRecord.trump_suit,
        trumpMode: gameRecord.trump_mode || 'CLOSED',
        trumpCard: null,
        trumpRevealed: gameRecord.trump_revealed,
        tricks: [],
        currentTrick: null,
        teamAScore: gameRecord.team_a_score,
        teamBScore: gameRecord.team_b_score,
        teamATokens: gameRecord.team_a_tokens,
        teamBTokens: gameRecord.team_b_tokens,
        targetScore: gameRecord.target_score ?? 22,
        targetReached: gameRecord.target_reached ?? false,
        finishedAt: gameRecord.finished_at ? new Date(gameRecord.finished_at).getTime() : undefined,
        finishedBy: gameRecord.finished_by,
        teamAMatchPoints: 0,
        teamBMatchPoints: 0,
        winningTeam: gameRecord.winning_team,
        lastActionMessage: 'Game state loaded from server.',
        updatedAt: Date.now(),
      };

      // 2. Authoritative Validation & Execution
      try {
        // Race condition protection: If game is already complete, return finished state without throwing
        if ((gameRecord.status === 'GAME_COMPLETE' || gameRecord.status === 'FINISHED') && action.type === 'CONFIRM_FINISH_GAME') {
          return returnSanitizedGameState(gameState, seat);
        }

        const nextState = applyGameAction(gameState, action);

        // 3. Persist updated game state back to Database
        await supabaseAdmin
          .from('games')
          .update({
            status: nextState.status,
            current_turn_seat: nextState.currentTurnSeat,
            current_high_bid: nextState.bidding.currentHighBid,
            bidder_seat: nextState.bidding.bidderSeat,
            trump_suit: nextState.trumpSuit,
            trump_mode: nextState.trumpMode,
            trump_revealed: nextState.trumpRevealed,
            team_a_score: nextState.teamAScore,
            team_b_score: nextState.teamBScore,
            team_a_tokens: nextState.teamATokens,
            team_b_tokens: nextState.teamBTokens,
            target_score: nextState.targetScore,
            target_reached: nextState.targetReached,
            finished_at: nextState.finishedAt ? new Date(nextState.finishedAt).toISOString() : null,
            finished_by: nextState.finishedBy || null,
            winning_team: nextState.winningTeam,
          })
          .eq('id', gameRecord.id);

        // Update player private hands
        for (const p of nextState.players) {
          await supabaseAdmin
            .from('game_players')
            .update({
              private_hand: p.cards,
              card_count: p.cards.length,
            })
            .eq('game_id', gameRecord.id)
            .eq('seat', p.seat);
        }

        // Audit Event Log
        await supabaseAdmin.from('game_events').insert({
          game_id: gameRecord.id,
          user_id: userId,
          event_type: action.type,
          payload: action as any,
        });

        // 4. Update Statistics if game complete
        if (nextState.status === 'GAME_COMPLETE' && nextState.winningTeam !== null) {
          await updatePlayerStatistics(gameRecord.id, roomId, nextState);
        }

        return returnSanitizedGameState(nextState, seat);
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: { code: 'INVALID_ACTION', message: err.message || 'Action rejected by server' },
        }, { status: 400 });
      }
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } }, { status: 500 });
  }
}

// Private Hand Filtering Security Function
function returnSanitizedGameState(state: GameEngineState, clientSeat: number) {
  const sanitizedPlayers = state.players.map((p) => {
    if (p.seat === clientSeat) {
      return p; // Return full hand ONLY to authorized client
    }
    return {
      ...p,
      cards: [], // Strip hidden cards of other players!
    };
  });

  return NextResponse.json({
    success: true,
    gameState: {
      ...state,
      players: sanitizedPlayers,
    },
  });
}

// Update Player Statistics Server-Side
async function updatePlayerStatistics(gameId: string, roomId: string, state: GameEngineState) {
  if (state.winningTeam === null) return;

  const winningTeam = state.winningTeam;

  for (const p of state.players) {
    const isWinner = p.team === winningTeam;

    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', p.id).single();
    if (profile) {
      const newPlayed = (profile.games_played || 0) + 1;
      const newWon = isWinner ? (profile.games_won || 0) + 1 : profile.games_won || 0;
      const newLost = !isWinner ? (profile.games_lost || 0) + 1 : profile.games_lost || 0;
      const newStreak = isWinner ? (profile.win_streak || 0) + 1 : 0;
      const bestStreak = Math.max(profile.best_win_streak || 0, newStreak);

      await supabaseAdmin
        .from('profiles')
        .update({
          games_played: newPlayed,
          games_won: newWon,
          games_lost: newLost,
          win_streak: newStreak,
          best_win_streak: bestStreak,
        })
        .eq('id', p.id);
    }
  }

  // Insert match result
  await supabaseAdmin.from('game_results').insert({
    game_id: gameId,
    room_id: roomId,
    winning_team: state.winningTeam,
    winning_bid: state.bidding.currentHighBid,
    trump_suit: state.trumpSuit,
    team_a_tokens: state.teamATokens,
    team_b_tokens: state.teamBTokens,
  });
}
