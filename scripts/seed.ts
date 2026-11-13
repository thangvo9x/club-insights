import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { DatabaseSync } from 'node:sqlite';
import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { createSchema, openDatabase } from '../src/lib/db';

const id = z.string().trim().min(1);
const utc = z.iso.datetime();
const schemas = {
  clubs: z.object({
    id,
    name: id,
    timezone: id.refine((v) => {
      try {
        new Intl.DateTimeFormat('en', { timeZone: v });
        return true;
      } catch {
        return false;
      }
    }, 'Invalid IANA timezone'),
    created_at: utc,
  }),
  players: z.object({ id, name: id }),
  sessions: z
    .object({
      id,
      club_id: id,
      title: id,
      starts_at: utc,
      ends_at: utc,
      status: z.enum(['scheduled', 'completed', 'cancelled']),
      attendance_recorded: z
        .enum(['true', 'false', '1', '0'])
        .transform((v) => (v === 'true' || v === '1' ? 1 : 0)),
    })
    .refine(
      (s) => Date.parse(s.starts_at) < Date.parse(s.ends_at),
      'Session must end after it starts',
    ),
  bookings: z.object({
    id,
    session_id: id,
    player_id: id,
    status: z.enum(['confirmed', 'cancelled']),
    attendance: z.enum(['present', 'absent', '']).transform((v) => v || null),
  }),
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
    if (process.argv.includes('--if-empty') && exists)
      console.log('Database ready; keeping existing data.');
    else {
      const flag = process.argv.indexOf('--csv-dir');
      if (flag !== -1 && !process.argv[flag + 1])
        throw new Error('--csv-dir requires a directory');
      const directory =
        flag === -1 ? resolve('data/csv') : resolve(process.argv[flag + 1]);
      console.log(
        `Seeded ${flag === -1 ? 'DEMO' : 'imported'} data: ${seedDatabase(db, directory, flag === -1 ? 'demo' : 'imported')}`,
      );
    }
  } finally {
    db.close();
  }
}
