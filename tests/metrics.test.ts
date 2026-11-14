import type { Club } from '../src/features/clubs/types';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateInsights } from '../src/features/insights/server/metrics';
import {
  addDays,
  localDate,
  mondayOf,
  precedingRange,
} from '../src/features/insights/lib/dates';
import type { Booking, Dataset, Session } from '../src/features/insights/types';

const club: Club = {
  id: 'c1',
  name: 'Test club',
  timezone: 'Asia/Ho_Chi_Minh',
  created_at: '2026-01-01T00:00:00Z',
};
const range = { start: '2026-09-28', end: '2026-10-04' };
function session(id: string, overrides: Partial<Session> = {}): Session {
  return {
    id,
    club_id: 'c1',
    title: id,
    starts_at: '2026-10-01T11:00:00Z',
    ends_at: '2026-10-01T13:00:00Z',
    status: 'completed',
    attendance_recorded: true,
    ...overrides,
  };
}
function booking(
  id: string,
  session_id: string,
  attendance: Booking['attendance'],
  overrides: Partial<Booking> = {},
): Booking {
  return {
    id,
    session_id,
    player_id: id,
    status: 'confirmed',
    attendance,
    ...overrides,
  };
}
function calculate(
  sessions: Session[],
  bookings: Booking[],
  selectedRange = range,
) {
  const data: Dataset = {
    sessions,
    bookings,
    players: [...new Set(bookings.map((b) => b.player_id))].map((id) => ({
      id,
      name: id,
    })),
  };
  return calculateInsights(club, data, selectedRange, 'demo');
}

test('no-shows exclude unknown attendance and cancelled bookings, rather than treating them as zero', () => {
  const result = calculate(
    [session('known'), session('unknown', { attendance_recorded: false })],
    [
      booking('absent', 'known', 'absent'),
      booking('present', 'known', 'present'),
      booking('missing', 'known', null),
      booking('cancelled', 'known', 'absent', { status: 'cancelled' }),
      booking('unrecorded', 'unknown', 'absent'),
    ],
  );
  assert.equal(result.current.noShows, 1);
  assert.deepEqual(result.current.attendance, {
    recordedSessions: 1,
    eligibleSessions: 2,
    knownBookings: 2,
    unknownBookings: 2,
  });
  assert.equal(
    result.details.sessions.find((s) => s.id === 'unknown')?.noShows,
    null,
  );
  assert.equal(
    result.details.sessions.find((s) => s.id === 'known')?.unknownBookings,
    1,
  );
  assert.equal(result.current.activePlayers, 4);
});
test('all unknown is null, explicitly recorded zero is 0; no held sessions is unknown', () => {
  assert.equal(
    calculate(
      [session('s', { attendance_recorded: false })],
      [booking('b', 's', null)],
    ).current.noShows,
    null,
  );
  assert.equal(
    calculate([session('s')], [booking('b', 's', null)]).current.noShows,
    null,
  );
  assert.equal(
    calculate([session('s')], [booking('b', 's', 'present')]).current.noShows,
    0,
  );
  assert.equal(calculate([session('s')], []).current.noShows, 0);
  assert.equal(calculate([], []).current.noShows, null);
});
test('local midnight and Monday boundary put Sunday UTC into Monday HCMC', () => {
  const result = calculate(
    [
      session('monday', {
        starts_at: '2026-09-27T17:00:00Z',
        ends_at: '2026-09-27T19:00:00Z',
      }),
      session('sunday', {
        starts_at: '2026-09-27T16:59:59Z',
        ends_at: '2026-09-27T18:59:59Z',
      }),
    ],
    [],
  );
  assert.equal(result.current.sessionsHeld, 1);
  assert.equal(result.previous.sessionsHeld, 1);
  assert.equal(result.weeks.length, 1);
  assert.equal(result.weeks[0].start, '2026-09-28');
});
test('held sessions exclude cancelled, ongoing, future and other clubs; end at clock is included', () => {
  const result = calculate(
    [
      session('cancelled', { status: 'cancelled' }),
      session('ongoing', {
        starts_at: '2026-10-05T01:00:00Z',
        ends_at: '2026-10-05T03:00:00Z',
      }),
      session('future', {
        starts_at: '2026-10-05T04:00:00Z',
        ends_at: '2026-10-05T06:00:00Z',
      }),
      session('boundary', {
        starts_at: '2026-10-05T00:00:00Z',
        ends_at: '2026-10-05T02:00:00Z',
        status: 'scheduled',
      }),
      session('other-club', { club_id: 'c2' }),
    ],
    [],
    { start: '2026-10-01', end: '2026-10-05' },
  );
  assert.equal(result.current.sessionsHeld, 1);
  assert.equal(result.details.sessions[0].id, 'boundary');
});
test('active players deduplicate across weeks; weekly uniques must not be summed', () => {
  const result = calculate(
    [
      session('s1', { starts_at: '2026-09-28T11:00:00Z' }),
      session('s2', {
        starts_at: '2026-10-04T17:00:00Z',
        ends_at: '2026-10-04T19:00:00Z',
      }),
    ],
    [
      booking('b1', 's1', 'absent', { player_id: 'repeat' }),
      booking('b2', 's2', null, { player_id: 'repeat' }),
    ],
    { start: '2026-09-28', end: '2026-10-05' },
  );
  assert.equal(result.current.activePlayers, 1);
  assert.deepEqual(
    result.weeks.map((w) => w.activePlayers),
    [1, 1],
  );
  assert.equal(result.details.players[0].sessionCount, 2);
  assert.deepEqual(
    result.weeks.map((w) => w.partial),
    [false, true],
  );
});
test('boundary week includes only selected dates, empty weeks remain explicit', () => {
  const result = calculate(
    [
      session('before', {
        starts_at: '2026-09-28T11:00:00Z',
        ends_at: '2026-09-28T13:00:00Z',
      }),
      session('inside', {
        starts_at: '2026-09-30T11:00:00Z',
        ends_at: '2026-09-30T13:00:00Z',
      }),
    ],
    [],
    { start: '2026-09-30', end: '2026-10-05' },
  );
  assert.equal(result.weeks.length, 2);
  assert.equal(result.weeks[0].sessionsHeld, 1);
  assert.equal(result.weeks[1].sessionsHeld, 0);
  assert.equal(result.weeks[1].noShows, null);
  assert.equal(result.weeks[0].partial, true);
});
test('previous period has equal length across month and leap boundaries', () => {
  assert.deepEqual(precedingRange({ start: '2026-09-07', end: '2026-10-04' }), {
    start: '2026-08-10',
    end: '2026-09-06',
  });
  assert.deepEqual(precedingRange({ start: '2024-03-01', end: '2024-03-01' }), {
    start: '2024-02-29',
    end: '2024-02-29',
  });
  assert.equal(mondayOf('2026-10-04'), '2026-09-28');
  assert.equal(addDays('2026-01-01', -1), '2025-12-31');
  assert.equal(localDate('2026-10-04T17:00:00Z', club.timezone), '2026-10-05');
});
test('a new club returns useful empty data with unknown no-shows and no cross-club leakage', () => {
  const result = calculateInsights(
    { ...club, id: 'new' },
    {
      sessions: [session('existing')],
      bookings: [booking('b', 'existing', 'absent')],
      players: [{ id: 'b', name: 'B' }],
    },
    range,
    'demo',
  );
  assert.deepEqual(
    [
      result.current.activePlayers,
      result.current.sessionsHeld,
      result.current.noShows,
    ],
    [0, 0, null],
  );
  assert.equal(result.hasAnySessions, false);
  assert.deepEqual(result.details, { players: [], sessions: [] });
});
