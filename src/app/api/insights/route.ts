import { readClubData } from '@/lib/db';
import { json, querySchema, validateEnd } from '@/lib/http';
import { calculateInsights } from '@/lib/metrics';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success)
    return json(
      { error: parsed.error.issues.map((i) => i.message).join('; ') },
      400,
    );
  try {
    const result = readClubData(parsed.data.clubId);
    if (!result) return json({ error: 'Club not found.' }, 404);
    if (!validateEnd(parsed.data.end, result.club.timezone))
      return json(
        {
          error:
            'End date cannot be after the exercise clock in the club timezone.',
        },
        400,
      );
    return json(
      calculateInsights(
        result.club,
        result.data,
        { start: parsed.data.start, end: parsed.data.end },
        result.dataSource,
      ),
    );
  } catch (error) {
    console.error('Calculating insights failed', error);
    return json({ error: 'Unable to load insights. Please retry.' }, 500);
  }
}
