import { openDatabase } from '@/lib/db';
import type { Club } from '../../clubs/types';
import type { Booking, Dataset, Player, Session } from '../types';

export function readClubData(
  clubId: string,
): { club: Club; data: Dataset; dataSource: 'demo' | 'imported' } | null {
  const db = openDatabase();
  try {
    db.exec('BEGIN');
    const club = db.prepare('SELECT * FROM clubs WHERE id = ?').get(clubId) as
      Club | undefined;
    if (!club) return null;
    const sessions = db
      .prepare('SELECT * FROM sessions WHERE club_id = ?')
      .all(clubId)
      .map((s) => ({
        ...s,
        attendance_recorded: s.attendance_recorded === 1,
      })) as Session[];
    const bookings = db
      .prepare(
        'SELECT b.* FROM bookings b JOIN sessions s ON s.id = b.session_id WHERE s.club_id = ?',
      )
      .all(clubId) as Booking[];
    const players = db
      .prepare(
        'SELECT DISTINCT p.* FROM players p JOIN bookings b ON b.player_id = p.id JOIN sessions s ON s.id = b.session_id WHERE s.club_id = ?',
      )
      .all(clubId) as Player[];
    const source = db
      .prepare("SELECT value FROM metadata WHERE key = 'source'")
      .get();
    return {
      club,
      data: { sessions, bookings, players },
      dataSource: source?.value === 'demo' ? 'demo' : 'imported',
    };
  } finally {
    db.close();
  }
}
