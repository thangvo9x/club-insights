'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Info,
  LayoutDashboard,
  MapPin,
  RefreshCw,
  Sprout,
} from 'lucide-react';
import { addDays, DEFAULT_RANGE, displayDate } from '@/lib/dates';
import type { Club, DateRange, Insights, Metric } from '@/lib/types';
import { MetricCard, METRICS } from './metric-card';
import { WeeklyChart } from './weekly-chart';
import { DetailDialog } from './detail-dialog';

const metricKeys: Metric[] = ['activePlayers', 'sessionsHeld', 'noShows'];
async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error ?? 'Something went wrong. Please retry.');
  return body;
}

export function Dashboard() {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [clubError, setClubError] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [range, setRange] = useState<DateRange>(DEFAULT_RANGE);
  const [draft, setDraft] = useState<DateRange>(DEFAULT_RANGE);
  const [rangeError, setRangeError] = useState('');
  const [preset, setPreset] = useState('28');
  const [metric, setMetric] = useState<Metric>('activePlayers');
  const [detail, setDetail] = useState<Metric | null>(null);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data?: Insights;
    error?: string;
  }>();
  const clubId = selectedClub || clubs[0]?.id || '';
  const query = new URLSearchParams({ clubId, ...range }).toString();
  const key = `${query}&retry=${retry}`;

  useEffect(() => {
    const controller = new AbortController();
    fetchJson<{ clubs: Club[] }>('/api/clubs', controller.signal)
      .then((body) => {
        setClubs(body.clubs);
        setClubError(
          body.clubs.length
            ? ''
            : 'No clubs found. Run the seed script to load the CSVs.',
        );
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError') setClubError(error.message);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (!clubId) return;
    const controller = new AbortController();
    fetchJson<Insights>(`/api/insights?${query}`, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ key, data });
      })
      .catch((error: Error) => {
        if (error.name !== 'AbortError')
          setResult({ key, error: error.message });
      });
    return () => controller.abort();
  }, [clubId, query, key]);

  const data = result?.key === key ? result.data : undefined;
  const error = clubError || (result?.key === key ? result.error : undefined);
  const loading = !data && !error;
  const choosePreset = (value: string) => {
    setPreset(value);
    setRangeError('');
    setDetail(null);
    if (value === 'custom') return;
    const next = {
      start: addDays(DEFAULT_RANGE.end, 1 - Number(value)),
      end: DEFAULT_RANGE.end,
    };
    setRange(next);
    setDraft(next);
  };
  const applyRange = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (draft.start > draft.end) {
      setRangeError('Start date must be on or before end date.');
      return;
    }
    if ((Date.parse(draft.end) - Date.parse(draft.start)) / 86_400_000 >= 366) {
      setRangeError('Choose a range of at most 366 days.');
      return;
    }
    setRangeError('');
    setRange(draft);
    setDetail(null);
  };
  const coverage = data?.current.attendance;
  const coveragePercent =
    coverage && coverage.knownBookings + coverage.unknownBookings > 0
      ? Math.round(
          (coverage.knownBookings /
            (coverage.knownBookings + coverage.unknownBookings)) *
            100,
        )
      : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Reclub home">
          <span className="brand-symbol">
            <Activity size={25} strokeWidth={3} />
          </span>
          reclub<span className="brand-period">.</span>
        </Link>
        <div className="workspace-label">HOST WORKSPACE</div>
        <div className="nav-item active">
          <LayoutDashboard size={18} />
          Club insights
          <span className="nav-dot" />
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sprout size={21} />
            <strong>Good clubs grow together.</strong>
            <p>A little insight goes a long way.</p>
          </div>
          <div className="host-profile">
            <span className="avatar host-avatar">CH</span>
            <div>
              <strong>Club host</strong>
              <small>Your club workspace</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span className="breadcrumb">
            Your workspace <span>/</span> <strong>Club insights</strong>
          </span>
          <span className="host-badge">
            <span />
            Host view
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">A LITTLE CLARITY. A BETTER CLUB.</p>
              <h1>
                Club insights<span>.</span>
              </h1>
              <p className="page-description">
                See who’s playing, what’s growing, and where to check in.
              </p>
            </div>
            <a className="help-link" href="#how-it-works">
              <CircleHelp size={16} />
              How the numbers work
            </a>
          </div>
          <section className="filter-panel" aria-label="Dashboard filters">
            <div className="club-field">
              <label htmlFor="club-switcher">YOUR CLUB</label>
              <div className="select-wrap">
                <span className="club-icon">
                  <Activity size={18} />
                </span>
                <select
                  id="club-switcher"
                  value={clubId}
                  disabled={!clubs.length}
                  onChange={(e) => {
                    setSelectedClub(e.target.value);
                    setDetail(null);
                  }}
                >
                  {!clubs.length && <option>Loading clubs…</option>}
                  {clubs.map((club) => (
                    <option value={club.id} key={club.id}>
                      {club.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
            </div>
            <div className="filter-divider" />
            <div className="period-field">
              <label htmlFor="period">DATE RANGE</label>
              <div className="select-wrap">
                <CalendarDays size={17} />
                <select
                  id="period"
                  value={preset}
                  onChange={(e) => choosePreset(e.target.value)}
                >
                  <option value="7">Last 7 complete days</option>
                  <option value="28">Last 28 complete days</option>
                  <option value="90">Last 90 complete days</option>
                  <option value="custom">Custom range</option>
                </select>
                <ChevronDown size={15} />
              </div>
            </div>
            <div className="filter-meta">
              <MapPin size={14} />
              <span>{data?.club.timezone ?? 'Club local time'}</span>
            </div>
            {preset === 'custom' && (
              <form className="custom-range" onSubmit={applyRange}>
                <label>
                  Start
                  <input
                    aria-label="Start date"
                    type="date"
                    required
                    value={draft.start}
                    max="2026-10-05"
                    onChange={(e) =>
                      setDraft({ ...draft, start: e.target.value })
                    }
                  />
                </label>
                <span>to</span>
                <label>
                  End
                  <input
                    aria-label="End date"
                    type="date"
                    required
                    value={draft.end}
                    max="2026-10-05"
                    onChange={(e) =>
                      setDraft({ ...draft, end: e.target.value })
                    }
                  />
                </label>
                <button className="primary-button" type="submit">
                  Apply range
                  <ArrowRight size={15} />
                </button>
                {rangeError && (
                  <p className="form-error" role="alert">
                    {rangeError}
                  </p>
                )}
              </form>
            )}
          </section>
          <div className="period-caption">
            <span>
              <strong>
                {displayDate(range.start)} –{' '}
                {displayDate(range.end, { year: 'numeric' })}
              </strong>
              {data && (
                <>
                  {' '}
                  compared with {displayDate(data.previousRange.start)} –{' '}
                  {displayDate(data.previousRange.end)}
                </>
              )}
            </span>
            <span className="clock-caption">
              <Clock3 size={13} />
              Fixed clock · 5 Oct 2026, 09:00 HCMC
            </span>
          </div>
          {error ? (
            <div className="error-panel" role="alert">
              <Info />
              <h2>We couldn’t load your insights</h2>
              <p>{error}</p>
              <button
                className="primary-button"
                onClick={() => {
                  setClubError('');
                  setRetry((n) => n + 1);
                }}
              >
                <RefreshCw size={16} />
                Try again
              </button>
            </div>
          ) : loading ? (
            <div className="loading-panel" role="status">
              <RefreshCw className="spin" size={22} />
              <p>Getting your club’s numbers…</p>
              <div className="skeleton-cards">
                {[1, 2, 3].map((n) => (
                  <div key={n} />
                ))}
              </div>
            </div>
          ) : (
            data && (
              <>
                <div className="section-heading">
                  <h2>Your club at a glance</h2>
                  <span>Select a card to change the chart</span>
                </div>
                <section className="metrics-grid" aria-label="Club metrics">
                  {metricKeys.map((m) => (
                    <MetricCard
                      key={m}
                      metric={m}
                      value={data.current[m]}
                      previous={data.previous[m]}
                      selected={metric === m}
                      onSelect={() => setMetric(m)}
                      onOpen={() => setDetail(m)}
                      coverage={
                        m === 'noShows'
                          ? `${coverage?.recordedSessions}/${coverage?.eligibleSessions} held sessions recorded · ${coverage?.unknownBookings} bookings unknown`
                          : undefined
                      }
                    />
                  ))}
                </section>
                {!data.hasAnySessions ? (
                  <section className="empty-club">
                    <span className="empty-icon">
                      <Sprout size={30} />
                    </span>
                    <span className="new-club-badge">A FRESH START</span>
                    <h2>Your club’s story starts here.</h2>
                    <p>
                      {data.club.name} has no sessions yet. Once you start
                      playing, this space will help you understand who’s coming
                      back and who needs a nudge.
                    </p>
                    <div className="onboarding-steps">
                      <div>
                        <span>01</span>
                        <strong>Run your first session</strong>
                        <p>Completed, non-cancelled sessions appear here.</p>
                      </div>
                      <div>
                        <span>02</span>
                        <strong>Record attendance</strong>
                        <p>
                          Mark players present or absent to unlock no-show
                          insights.
                        </p>
                      </div>
                      <div>
                        <span>03</span>
                        <strong>Come back and compare</strong>
                        <p>
                          See participation change over equal-length periods.
                        </p>
                      </div>
                    </div>
                    <p className="empty-footnote">
                      This prototype is read-only. Create sessions and record
                      attendance in the main Reclub app.
                    </p>
                  </section>
                ) : (
                  <>
                    {data.current.sessionsHeld === 0 && (
                      <div className="inline-notice">
                        <CalendarDays size={18} />
                        <span>
                          No held sessions in this range. Try a wider date range
                          to explore your club’s history.
                        </span>
                      </div>
                    )}
                    <section className="chart-panel">
                      <div className="chart-heading">
                        <div>
                          <p className="eyebrow">THE BIGGER PICTURE</p>
                          <h2>{METRICS[metric].label}, week by week</h2>
                          <p>
                            {metric === 'activePlayers'
                              ? 'Each player counts once per week. Weekly counts do not add up to unique players for the full period.'
                              : metric === 'noShows'
                                ? 'Observed absences only. Unknown weeks are marked with “?”; partial coverage can undercount.'
                                : 'Sessions that have finished, grouped by their local start date.'}
                          </p>
                        </div>
                        <span className="legend">
                          <i />
                          {METRICS[metric].label}
                        </span>
                      </div>
                      <WeeklyChart weeks={data.weeks} metric={metric} />
                      <div className="chart-footer">
                        <CalendarDays size={14} />
                        <span>
                          Weeks run Monday–Sunday · {data.club.timezone} ·
                          Boundary weeks include only selected dates.
                        </span>
                        <button
                          className="text-button"
                          onClick={() => setDetail(metric)}
                        >
                          Explore{' '}
                          {metric === 'activePlayers' ? 'players' : 'sessions'}
                          <ArrowRight size={15} />
                        </button>
                      </div>
                    </section>
                    <section className="attendance-panel">
                      <div className="attendance-icon">
                        <Check size={20} />
                      </div>
                      <div className="attendance-copy">
                        <h3>A clearer picture starts with attendance</h3>
                        <p>
                          {coveragePercent === null
                            ? 'There are no eligible bookings in this period.'
                            : `${coveragePercent}% of eligible bookings have known attendance (${coverage?.knownBookings} recorded, ${coverage?.unknownBookings} unknown).`}{' '}
                          Missing attendance is never counted as zero no-shows.
                        </p>
                      </div>
                      <div className="coverage-meter">
                        <div>
                          <strong>
                            {coveragePercent === null
                              ? '—'
                              : `${coveragePercent}%`}
                          </strong>
                          <span>booking coverage</span>
                        </div>
                        <progress
                          max={100}
                          value={coveragePercent ?? 0}
                          aria-label="Bookings with known attendance"
                        />
                      </div>
                    </section>
                  </>
                )}
                <section id="how-it-works" className="methodology">
                  <div>
                    <Info size={17} />
                    <h3>Numbers you can trace</h3>
                  </div>
                  <p>
                    All cards use the same date range and held sessions.
                    Cancelled bookings and cancelled, ongoing, or future
                    sessions are excluded. “Active” describes booking
                    participation, not verified attendance. No-shows show
                    observed counts, so compare attendance coverage before
                    interpreting changes.
                  </p>
                  <p>
                    The previous period has the same number of calendar days and
                    ends the day before your selected range. Dates and weeks use
                    your club’s time zone. A dash means unknown; 0 means a known
                    zero.
                  </p>
                  <details>
                    <summary>Previous period & attendance coverage</summary>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Metric</th>
                            <th>Selected period</th>
                            <th>Previous period</th>
                          </tr>
                        </thead>
                        <tbody>
                          {metricKeys.map((m) => (
                            <tr key={m}>
                              <td>{METRICS[m].label}</td>
                              <td>{data.current[m] ?? 'Unknown'}</td>
                              <td>{data.previous[m] ?? 'Unknown'}</td>
                            </tr>
                          ))}
                          <tr>
                            <td>Sessions with attendance recorded</td>
                            <td>
                              {data.current.attendance.recordedSessions}/
                              {data.current.attendance.eligibleSessions}
                            </td>
                            <td>
                              {data.previous.attendance.recordedSessions}/
                              {data.previous.attendance.eligibleSessions}
                            </td>
                          </tr>
                          <tr>
                            <td>Bookings with known / unknown attendance</td>
                            <td>
                              {data.current.attendance.knownBookings} /{' '}
                              {data.current.attendance.unknownBookings}
                            </td>
                            <td>
                              {data.previous.attendance.knownBookings} /{' '}
                              {data.previous.attendance.unknownBookings}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </details>
                </section>
                {detail && (
                  <DetailDialog
                    metric={detail}
                    data={data}
                    onClose={() => setDetail(null)}
                  />
                )}
              </>
            )
          )}
          <footer className="page-footer">
            <span>Made for the people who bring people together.</span>
            <span>
              Club Insights <span>·</span> Reclub
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
