import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase/admin';
import { Card } from '../../../../lib/game-engine/types';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User ID required' } }, { status: 401 });
    }

    // 1. Find active room for user
    const { data: activePlayer } = await supabaseAdmin
      .from('room_players')
      .select('room_id, seat, team, rooms(*)')
      .eq('user_id', userId)
      .filter('rooms.status', 'in', '("WAITING", "READY", "IN_PROGRESS")')
      .order('joined_at', { ascending: false })
      .limit(1)
      .single();

    if (!activePlayer || !activePlayer.rooms) {
      return NextResponse.json({ success: true, hasActiveGame: false });
    }

    const room = activePlayer.rooms as any;
    const clientSeat = activePlayer.seat;

    // 2. Find active game for room
    const { data: gameRecord } = await supabaseAdmin
      .from('games')
      .select('*')
      .eq('room_id', room.id)
      .not('status', 'in', '("GAME_COMPLETE", "CANCELLED")')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!gameRecord) {
      return NextResponse.json({ success: true, hasActiveGame: true, room, gameState: null });
    }

    // Fetch players and private hand for authorized client
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
      cards: gp.seat === clientSeat ? ((gp.private_hand as Card[]) || []) : [], // Strip opponent cards for security
      cardCount: gp.card_count || 0,
      isReady: true,
      isConnected: true,
    }));

    const gameState = {
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
      teamAScore: gameRecord.team_a_score,
      teamBScore: gameRecord.team_b_score,
      teamATokens: gameRecord.team_a_tokens,
      teamBTokens: gameRecord.team_b_tokens,
      teamAMatchPoints: 0,
      teamBMatchPoints: 0,
      winningTeam: gameRecord.winning_team,
      lastActionMessage: 'Session reconnected! State synchronized.',
      updatedAt: Date.now(),
    };

    return NextResponse.json({
      success: true,
      hasActiveGame: true,
      room,
      clientSeat,
      gameState,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } }, { status: 500 });
  }
}
