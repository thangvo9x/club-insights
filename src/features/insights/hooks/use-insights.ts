'use client';

import { useJsonQuery } from '@/hooks/use-json-query';
import type { DateRange, Insights } from '../types';

export function useInsights(clubId: string, range: DateRange) {
  const query = new URLSearchParams({ clubId, ...range }).toString();
  return useJsonQuery<Insights>(clubId ? `/api/insights?${query}` : null);
}
