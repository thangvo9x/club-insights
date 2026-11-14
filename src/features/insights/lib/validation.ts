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
export const dateRangeSchema = z
  .object({ start: calendarDate, end: calendarDate })
  .refine((q) => q.start <= q.end, 'Start date must be on or before end date.')
  .refine((q) => daysInRange(q) <= 366, 'Choose a range of at most 366 days.');
export const querySchema = dateRangeSchema.and(
  z.object({ clubId: z.string().min(1).max(100) }),
);
export function validateEnd(end: string, timezone: string) {
  return end <= localDate(NOW, timezone);
}
