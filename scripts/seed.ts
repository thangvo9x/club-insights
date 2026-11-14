import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { createSchema, openDatabase } from '../src/lib/db';

const id = z.string().trim().min(1);
const utc = z.iso.datetime();
const boolean = z.enum(['true', 'false']);
const dateOrUtc = z.union([z.iso.date(), utc]);
const schemas = {
  clubs: z
    .object({
      club_id: id,
      name: id,
      time_zone: id.refine((v) => {
        try {
          new Intl.DateTimeFormat('en', { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }, 'Invalid IANA timezone'),
      created_at: dateOrUtc,
    })
    .transform((c) => ({
      id: c.club_id,
      name: c.name,
      timezone: c.time_zone,
      created_at: c.created_at,
    })),
  players: z
    .object({
      player_id: id,
      club_id: id,
      name: id,
      joined_club_at: z.iso.date(),
    })
    .transform((p) => ({ id: p.player_id, name: p.name })),
  sessions: z
    .object({
      session_id: id,
      club_id: id,
      title: id,
      starts_at: utc,
      duration_minutes: z.coerce.number().int().positive().max(1440),
      places: z.coerce.number().int().nonnegative(),
      status: z.enum(['scheduled', 'cancelled']),
      attendance_recorded: boolean,
    })
    .transform((s) => ({
      id: s.session_id,
      club_id: s.club_id,
      title: s.title,
      starts_at: s.starts_at,
      ends_at: new Date(
        Date.parse(s.starts_at) + s.duration_minutes * 60_000,
      ).toISOString(),
      status: s.status,
      attendance_recorded: s.attendance_recorded === 'true' ? 1 : 0,
    })),
  bookings: z
    .object({
      booking_id: id,
      session_id: id,
      player_id: id,
      booked_at: utc,
      status: z.enum(['booked', 'cancelled']),
      cancelled_at: z.union([utc, z.literal('')]),
      attended: z.enum(['true', 'false', '']),
    })
    .transform((b) => ({
      id: b.booking_id,
      session_id: b.session_id,
      player_id: b.player_id,
      status: b.status === 'booked' ? 'confirmed' : 'cancelled',
      attendance:
        b.attended === '' ? null : b.attended === 'true' ? 'present' : 'absent',
    })),
};

export function seedDatabase(
  db: DatabaseSync,
  directory: string,
  source: 'demo' | 'imported',
) {
  createSchema(db);
  // Parse every file before touching existing data; SQL errors also roll back all rows.
  const rows = Object.entries(schemas).map(([table, schema]) => {
    const parsed: unknown[] = parse(
      readFileSync(resolve(directory, `${table}.csv`), 'utf8'),
      { columns: true, bom: true, skip_empty_lines: true, trim: true },
    );
    return {
      table,
      records: parsed.map((row, index) => {
        const result = schema.safeParse(row);
        if (!result.success)
          throw new Error(
            `${table}.csv row ${index + 2}: ${result.error.message}`,
          );
        return result.data;
      }),
    };
  });
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(
      'DELETE FROM bookings; DELETE FROM sessions; DELETE FROM players; DELETE FROM clubs;',
    );
    for (const { table, records } of rows) {
      for (const row of records) {
        const keys = Object.keys(row);
        const statement = db.prepare(
          `INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
        );
        statement.run(...Object.values(row));
      }
    }
    db.prepare(
      "INSERT OR REPLACE INTO metadata (key, value) VALUES ('source', ?)",
    ).run(source);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  return rows
    .map(({ table, records }) => `${table}: ${records.length}`)
    .join(', ');
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const db = openDatabase();
  try {
    createSchema(db);
    const exists =
      Number(db.prepare('SELECT COUNT(*) AS count FROM clubs').get()?.count) >
      0;
    const source = db
      .prepare("SELECT value FROM metadata WHERE key = 'source'")
      .get()?.value;
    if (process.argv.includes('--if-empty') && exists && source !== 'demo')
      console.log('Database ready; keeping existing data.');
    else {
      const flag = process.argv.indexOf('--csv-dir');
      if (flag !== -1 && !process.argv[flag + 1])
        throw new Error('--csv-dir requires a directory');
      const directory =
        flag === -1 ? resolve('data/csv') : resolve(process.argv[flag + 1]);
      console.log(
        `Seeded assessment CSVs: ${seedDatabase(db, directory, 'imported')}`,
      );
    }
  } finally {
    db.close();
  }
}
