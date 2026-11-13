import { NextResponse } from 'next/server';
import { z } from 'zod';
import { daysInRange, localDate, NOW } from './dates';

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const parsed = new Date(`${s}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === s
    );
  }, 'Invalid calendar date');
export const querySchema = z
  .object({
    clubId: z.string().min(1).max(100),
    start: calendarDate,
    end: calendarDate,
  })
  .refine((q) => q.start <= q.end, 'Start must be on or before end')
  .refine((q) => daysInRange(q) <= 366, 'Choose at most 366 days');
export function validateEnd(end: string, timezone: string) {
  return end <= localDate(NOW, timezone);
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}
