import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  mkdtempSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { seedDatabase } from '../scripts/seed';

test('CSV seed is idempotent and database stays intact if a foreign key fails', () => {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  const folder = mkdtempSync(join(tmpdir(), 'club-seed-'));
  try {
    cpSync(resolve('data/csv'), folder, { recursive: true });
    seedDatabase(db, folder, 'imported');
    const before = db
      .prepare('SELECT COUNT(*) AS count FROM bookings')
      .get()?.count;
    assert.ok(Number(before) > 0);
    seedDatabase(db, folder, 'imported');
    assert.equal(
      db.prepare('SELECT COUNT(*) AS count FROM bookings').get()?.count,
      before,
    );
    const bookingFile = join(folder, 'bookings.csv');
    writeFileSync(
      bookingFile,
      readFileSync(bookingFile, 'utf8') +
        'invalid,missing-session,p001,2026-01-01T00:00:00Z,booked,,false\n',
    );
    assert.throws(() => seedDatabase(db, folder, 'imported'), /FOREIGN KEY/);
    assert.equal(
      db.prepare('SELECT COUNT(*) AS count FROM bookings').get()?.count,
      before,
    );
    assert.equal(
      db.prepare("SELECT value FROM metadata WHERE key = 'source'").get()
        ?.value,
      'imported',
    );
  } finally {
    db.close();
    rmSync(folder, { recursive: true, force: true });
  }
});
