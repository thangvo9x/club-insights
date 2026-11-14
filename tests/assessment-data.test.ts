import type { Club } from '../src/features/clubs/types';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { resolve } from 'node:path';
import { seedDatabase } from '../scripts/seed';
import { calculateInsights } from '../src/features/insights/server/metrics';
import type {
  Booking,
  Dataset,
  Player,
  Session,
} from '../src/features/insights/types';

test('assessment CSV mapping and audited metrics match the supplied dataset', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  try {
    seedDatabase(db, resolve('data/csv'), 'imported');
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM players').get()?.n, 260);
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM sessions').get()?.n,
      195,
    );
    assert.equal(
      db.prepare('SELECT COUNT(*) AS n FROM bookings').get()?.n,
      1893,
    );
    const first = db.prepare("SELECT * FROM sessions WHERE id = 's0001'").get();
    assert.equal(first?.starts_at, '2026-01-04T22:30:00Z');
    assert.equal(first?.ends_at, '2026-01-05T00:00:00.000Z');
    assert.equal(first?.status, 'scheduled');
    assert.equal(
      db.prepare("SELECT attendance FROM bookings WHERE id = 'b00003'").get()
        ?.attendance,
      'present',
    );
    assert.equal(
      db.prepare("SELECT status FROM bookings WHERE id = 'b00003'").get()
        ?.status,
      'confirmed',
    );
    const club = db
      .prepare("SELECT * FROM clubs WHERE id = 'club-001'")
      .get() as Club;
    const data: Dataset = {
      sessions: db
        .prepare('SELECT * FROM sessions')
        .all()
        .map((s) => ({
          ...s,
          attendance_recorded: s.attendance_recorded === 1,
        })) as Session[],
      bookings: db.prepare('SELECT * FROM bookings').all() as Booking[],
      players: db.prepare('SELECT * FROM players').all() as Player[],
    };
    // Expected values independently audited from the original CSVs using Python's csv/datetime.
    const result = calculateInsights(
      club,
      data,
      { start: '2026-09-07', end: '2026-10-04' },
      'imported',
    );
    assert.deepEqual(result.current, {
      activePlayers: 93,
      sessionsHeld: 20,
      noShows: 15,
      attendance: {
        recordedSessions: 11,
        eligibleSessions: 20,
        knownBookings: 151,
        unknownBookings: 113,
      },
    });
    assert.deepEqual(result.previous, {
      activePlayers: 92,
      sessionsHeld: 20,
      noShows: 14,
      attendance: {
        recordedSessions: 12,
        eligibleSessions: 20,
        knownBookings: 152,
        unknownBookings: 96,
      },
    });
    const full = calculateInsights(
      club,
      data,
      { start: '2026-01-01', end: '2026-10-04' },
      'imported',
    );
    assert.deepEqual(full.current, {
      activePlayers: 213,
      sessionsHeld: 186,
      noShows: 86,
      attendance: {
        recordedSessions: 104,
        eligibleSessions: 186,
        knownBookings: 999,
        unknownBookings: 734,
      },
    });
    assert.equal(result.details.players.length, 93);
    assert.equal(result.details.sessions.length, 20);
    assert.equal(
      result.weeks.reduce((sum, w) => sum + w.sessionsHeld, 0),
      20,
    );
  } finally {
    db.close();
  }
});
