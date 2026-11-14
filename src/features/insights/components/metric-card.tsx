import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowUpRight as OpenIcon,
  Minus,
} from 'lucide-react';
import type { Metric } from '../types';
export const METRICS: Record<
  Metric,
  { label: string; definition: string; unit: string }
> = {
  activePlayers: {
    label: 'Active players',
    definition:
      'Unique players with a non-cancelled booking in a held session. Includes no-shows.',
    unit: 'players',
  },
  sessionsHeld: {
    label: 'Sessions held',
    definition:
      'Non-cancelled sessions that ended by the fixed clock. Grouped by local start date.',
    unit: 'sessions',
  },
  noShows: {
    label: 'Recorded no-shows',
    definition:
      'Non-cancelled bookings explicitly marked absent at sessions with attendance recorded.',
    unit: 'no-shows',
  },
};
export function MetricCard({
  metric,
  value,
  previous,
  selected,
  onSelect,
  onOpen,
  coverage,
}: {
  metric: Metric;
  value: number | null;
  previous: number | null;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
  coverage?: string;
}) {
  const delta = value !== null && previous !== null ? value - previous : null;
  const Icon =
    delta === null || delta === 0
      ? Minus
      : delta > 0
        ? ArrowUpRight
        : ArrowDownRight;
  const text =
    metric === 'noShows'
      ? `Previous: ${previous ?? 'unknown'}${delta === null ? '' : ` · ${delta > 0 ? '+' : ''}${delta} observed`}. Compare coverage below.`
      : previous === 0 && value !== 0
        ? 'No baseline · previous period 0'
        : delta === null
          ? 'No comparison available'
          : `${delta === 0 ? 'No change' : `${delta > 0 ? '+' : ''}${Math.round((delta / (previous || 1)) * 100)}%`} vs previous period`;
  return (
    <article className={`metric-card ${selected ? 'selected' : ''}`}>
      <button
        className="metric-select"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Chart ${METRICS[metric].label}`}
      >
        <span className="metric-label">
          {METRICS[metric].label}
          <span className="selection-dot" />
        </span>
        <span className="metric-value">
          {value === null ? '—' : value.toLocaleString('en-GB')}
          {metric === 'noShows' && (
            <span className="observed-tag">
              {value === null ? 'Unknown' : 'Observed'}
            </span>
          )}
        </span>
      </button>
      <div
        className={`metric-change ${metric === 'noShows' ? 'neutral' : delta !== null && delta > 0 ? 'positive' : 'neutral'}`}
      >
        <Icon size={15} />
        <span>{text}</span>
      </div>
      {coverage && <p className="coverage-caption">{coverage}</p>}
      <p className="metric-definition">{METRICS[metric].definition}</p>
      <button className="text-button detail-link" onClick={onOpen}>
        View {metric === 'activePlayers' ? 'players' : 'sessions'}
        <OpenIcon size={15} />
      </button>
    </article>
  );
}
