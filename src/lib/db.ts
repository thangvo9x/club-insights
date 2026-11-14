import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export function openDatabase(
  path = process.env.DATABASE_PATH ?? resolve('data/club-insights.sqlite'),
) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  return db;
}

export function createSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS clubs (id TEXT PRIMARY KEY, name TEXT NOT NULL, timezone TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY, club_id TEXT NOT NULL REFERENCES clubs(id), title TEXT NOT NULL,
      starts_at TEXT NOT NULL, ends_at TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('scheduled','completed','cancelled')),
      attendance_recorded INTEGER NOT NULL CHECK(attendance_recorded IN (0,1))
    );
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL REFERENCES sessions(id), player_id TEXT NOT NULL REFERENCES players(id),
      status TEXT NOT NULL CHECK(status IN ('confirmed','cancelled')),
      attendance TEXT CHECK(attendance IN ('present','absent') OR attendance IS NULL),
      UNIQUE(session_id, player_id)
    );
    CREATE INDEX IF NOT EXISTS sessions_club_start ON sessions(club_id, starts_at);
    CREATE INDEX IF NOT EXISTS bookings_session ON bookings(session_id);
  `);
}
