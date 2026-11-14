import { openDatabase } from '@/lib/db';
import type { Club } from '../types';

export function readClubs(): Club[] {
  const db = openDatabase();
  try {
    return db
      .prepare('SELECT * FROM clubs ORDER BY created_at, id')
      .all() as Club[];
  } finally {
    db.close();
  }
}
