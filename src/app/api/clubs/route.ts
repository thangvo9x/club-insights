import { readClubs } from '@/features/clubs/server/queries';
import { json } from '@/lib/http';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function GET() {
  try {
    return json({ clubs: readClubs() });
  } catch (error) {
    console.error('Reading clubs failed', error);
    return json(
      {
        error: 'Unable to load clubs. Check that the database has been seeded.',
      },
      500,
    );
  }
}
