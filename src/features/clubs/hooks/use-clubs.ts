'use client';

import { useJsonQuery } from '@/hooks/use-json-query';
import type { Club } from '../types';

const EMPTY_CLUBS: Club[] = [];

export function useClubs() {
  const query = useJsonQuery<{ clubs: Club[] }>('/api/clubs');
  const clubs = query.data?.clubs ?? EMPTY_CLUBS;
  return {
    clubs,
    error:
      query.error ??
      (query.data && clubs.length === 0
        ? 'No clubs found. Run the seed script to load the CSVs.'
        : undefined),
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}
