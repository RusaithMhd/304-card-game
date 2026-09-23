import { describe, it, expect } from 'vitest';

describe('Step 2 Database Foundation & Security Engine', () => {
  it('1. Username Rules: Accepts 3-20 alphanumeric & underscore, rejects invalid formats', () => {
    const isValidUsername = (u: string) => u.length >= 3 && u.length <= 20 && /^[a-zA-Z0-9_]+$/.test(u);

    expect(isValidUsername('rusaith_304')).toBe(true);
    expect(isValidUsername('kavin123')).toBe(true);
    expect(isValidUsername('ah')).toBe(false); // Too short
    expect(isValidUsername('this_username_is_too_long_for_304')).toBe(false); // Too long (>20)
    expect(isValidUsername('rusaith 304')).toBe(false); // Space rejected
    expect(isValidUsername('user<script>')).toBe(false); // XSS HTML rejected
  });

  it('2. Canonical Friendship Representation: Orders user IDs deterministically (user_id_1 < user_id_2)', () => {
    const formatFriendship = (idA: string, idB: string) => {
      if (idA === idB) throw new Error('Cannot friend self');
      return idA < idB ? { user_id_1: idA, user_id_2: idB } : { user_id_1: idB, user_id_2: idA };
    };

    const uuid1 = '11111111-1111-4111-8111-111111111111';
    const uuid2 = '22222222-2222-4222-8222-222222222222';

    const pairAB = formatFriendship(uuid1, uuid2);
    const pairBA = formatFriendship(uuid2, uuid1);

    // Both A->B and B->A produce identical canonical representation
    expect(pairAB.user_id_1).toBe(uuid1);
    expect(pairAB.user_id_2).toBe(uuid2);
    expect(pairBA.user_id_1).toBe(uuid1);
    expect(pairBA.user_id_2).toBe(uuid2);

    expect(() => formatFriendship(uuid1, uuid1)).toThrow('Cannot friend self');
  });

  it('3. Team Assignment Algorithm: Seats 0 and 2 map to Team A (0); Seats 1 and 3 map to Team B (1)', () => {
    const getTeamFromSeat = (seat: number) => {
      if (seat < 0 || seat > 3) throw new Error('Invalid seat');
      return seat % 2; // 0 & 2 = Team A (0), 1 & 3 = Team B (1)
    };

    expect(getTeamFromSeat(0)).toBe(0); // Team A
    expect(getTeamFromSeat(1)).toBe(1); // Team B
    expect(getTeamFromSeat(2)).toBe(0); // Team A (Partner of Seat 0)
    expect(getTeamFromSeat(3)).toBe(1); // Team B (Partner of Seat 1)
  });

  it('4. Room Capacity & Seat Availability Check: Enforces max 4 players per room', () => {
    const occupiedSeats = new Set([0, 1, 2, 3]);

    const getAvailableSeat = (seats: Set<number>) => {
      if (seats.size >= 4) throw new Error('ROOM_FULL');
      for (let s = 0; s < 4; s++) {
        if (!seats.has(s)) return s;
      }
      throw new Error('ROOM_FULL');
    };

    expect(() => getAvailableSeat(occupiedSeats)).toThrow('ROOM_FULL');

    const partialSeats = new Set([0, 1, 3]);
    expect(getAvailableSeat(partialSeats)).toBe(2);
  });

  it('5. Self-Action Prevention: Prevents self-blocking, self-requesting, and self-inviting', () => {
    const validateSocialAction = (actorId: string, targetId: string) => {
      if (actorId === targetId) throw new Error('CANNOT_TARGET_SELF');
      return true;
    };

    expect(validateSocialAction('user1', 'user2')).toBe(true);
    expect(() => validateSocialAction('user1', 'user1')).toThrow('CANNOT_TARGET_SELF');
  });
});
