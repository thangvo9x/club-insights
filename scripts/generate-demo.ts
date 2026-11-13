import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Deterministic synthetic fixtures; these are NOT the missing assessment CSVs.
const folder = resolve('data/csv');
mkdirSync(folder, { recursive: true });
function csv(name: string, headers: string[], rows: unknown[][]) {
  const quote = (v: unknown) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  writeFileSync(
    resolve(folder, `${name}.csv`),
    [headers, ...rows].map((row) => row.map(quote).join(',')).join('\n') + '\n',
  );
}
csv(
  'clubs',
  ['id', 'name', 'timezone', 'created_at'],
  [
    [
      'saigon-rally',
      'Saigon Rally Club',
      'Asia/Ho_Chi_Minh',
      '2026-01-01T00:00:00Z',
    ],
    [
      'riverside',
      'Riverside Pickleball',
      'Asia/Ho_Chi_Minh',
      '2026-10-05T01:00:00Z',
    ],
  ],
);
const first = [
  'Minh',
  'Linh',
  'An',
  'Trang',
  'Huy',
  'Mai',
  'Khoa',
  'Thao',
  'Duc',
  'Nhi',
  'Bao',
  'Vy',
  'Nam',
  'Ha',
  'Tuan',
  'Chi',
];
const last = ['Nguyen', 'Tran', 'Le', 'Pham', 'Vo', 'Dang'];
const players = Array.from({ length: 96 }, (_, i) => [
  `p${i + 1}`,
  `${first[i % first.length]} ${last[Math.floor(i / first.length)]}`,
]);
csv('players', ['id', 'name'], players);
const sessions: unknown[][] = [];
const bookings: unknown[][] = [];
let bookingId = 0;
let sessionId = 0;
for (
  let date = new Date('2026-01-01T00:00:00Z');
  date < new Date('2026-10-12T00:00:00Z');
  date = new Date(date.getTime() + 86_400_000)
) {
  const weekday = date.getUTCDay();
  if (![2, 4, 6, 0].includes(weekday)) continue;
  sessionId++;
  const id = `s${sessionId}`;
  const start = new Date(date.getTime() + (weekday === 0 ? 0 : 11) * 3_600_000);
  const end = new Date(start.getTime() + 2 * 3_600_000);
  const cancelled = sessionId % 23 === 0;
  const future = end > new Date('2026-10-05T02:00:00Z');
  const recorded = !cancelled && !future && sessionId % 4 !== 0;
  sessions.push([
    id,
    'saigon-rally',
    weekday === 0
      ? 'Sunday morning doubles'
      : weekday === 6
        ? 'Weekend open play'
        : 'After-work rally',
    start.toISOString(),
    end.toISOString(),
    cancelled ? 'cancelled' : future ? 'scheduled' : 'completed',
    recorded ? 'true' : 'false',
  ]);
  const count = 12 + (sessionId % 9);
  for (let j = 0; j < count; j++) {
    const player = (sessionId * 7 + j * 5) % players.length;
    const bookingCancelled = j === count - 1 && sessionId % 3 === 0;
    const attendance =
      !recorded || bookingCancelled
        ? ''
        : (j + sessionId) % 13 === 0
          ? 'absent'
          : 'present';
    bookings.push([
      `b${++bookingId}`,
      id,
      `p${player + 1}`,
      bookingCancelled ? 'cancelled' : 'confirmed',
      attendance,
    ]);
  }
}
csv(
  'sessions',
  [
    'id',
    'club_id',
    'title',
    'starts_at',
    'ends_at',
    'status',
    'attendance_recorded',
  ],
  sessions,
);
csv(
  'bookings',
  ['id', 'session_id', 'player_id', 'status', 'attendance'],
  bookings,
);
console.log(
  `Generated DEMO CSVs: ${players.length} players, ${sessions.length} sessions, ${bookings.length} bookings.`,
);
