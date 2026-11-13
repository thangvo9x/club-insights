import type { DateRange } from './types';

// The exercise specifies a fixed clock. Keep it shared by API, seed and tests.
export const NOW = '2026-10-05T02:00:00.000Z';
export const DEFAULT_RANGE: DateRange = {
  start: '2026-09-07',
  end: '2026-10-04',
};
const DAY = 86_400_000;

export function localDate(instant: string, timezone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(instant));
}

// UTC here is calendar arithmetic, never a conversion of a club's local midnight.
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY)
    .toISOString()
    .slice(0, 10);
}
export function daysInRange(range: DateRange): number {
  return (
    Math.round((Date.parse(range.end) - Date.parse(range.start)) / DAY) + 1
  );
}
export function precedingRange(range: DateRange): DateRange {
  return {
    start: addDays(range.start, -daysInRange(range)),
    end: addDays(range.start, -1),
  };
}
export function mondayOf(date: string): string {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}
export function containsDate(range: DateRange, date: string): boolean {
  return date >= range.start && date <= range.end;
}
export function displayDate(
  date: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    ...options,
  }).format(new Date(`${date}T00:00:00Z`));
}
