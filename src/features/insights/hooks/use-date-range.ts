'use client';

import { useState } from 'react';
import { addDays, daysInRange, DEFAULT_RANGE } from '../lib/dates';
import { dateRangeSchema } from '../lib/validation';
import type { DateRange } from '../types';

export type DatePreset = '7' | '28' | '90' | 'custom';

export function useDateRange(initialRange: DateRange = DEFAULT_RANGE) {
  const [range, setRange] = useState(initialRange);
  const [draft, setDraft] = useState(initialRange);
  const [preset, setPreset] = useState<DatePreset>(() => {
    const days = daysInRange(initialRange);
    return days === 7 || days === 28 || days === 90
      ? (String(days) as DatePreset)
      : 'custom';
  });
  const [error, setError] = useState('');

  function choosePreset(value: DatePreset) {
    setPreset(value);
    setError('');
    if (value === 'custom') return;
    const next = {
      start: addDays(initialRange.end, 1 - Number(value)),
      end: initialRange.end,
    };
    setRange(next);
    setDraft(next);
  }

  function applyRange(): boolean {
    const parsed = dateRangeSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return false;
    }
    setRange(parsed.data);
    setError('');
    return true;
  }

  return { range, draft, setDraft, preset, choosePreset, error, applyRange };
}
