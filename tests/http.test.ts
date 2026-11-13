import { test } from 'node:test';
import assert from 'node:assert/strict';
import { querySchema, validateEnd } from '../src/lib/http';

test('API rejects invalid, reversed, missing and overly long ranges', () => {
  const query = { clubId: 'c1', start: '2026-09-01', end: '2026-10-04' };
  assert.equal(querySchema.safeParse(query).success, true);
  for (const invalid of [
    { ...query, start: '2026-02-30' },
    { ...query, start: '2026-11-01' },
    { ...query, start: '2024-01-01' },
    { ...query, clubId: '' },
    { clubId: 'c1' },
  ])
    assert.equal(querySchema.safeParse(invalid).success, false);
  assert.equal(validateEnd('2026-10-05', 'Asia/Ho_Chi_Minh'), true);
  assert.equal(validateEnd('2026-10-06', 'Asia/Ho_Chi_Minh'), false);
});
