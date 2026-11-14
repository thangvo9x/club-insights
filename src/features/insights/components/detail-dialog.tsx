'use client';
import { useEffect, useRef } from 'react';
import { X, Users, CalendarDays } from 'lucide-react';
import { displayDate, localDate } from '../lib/dates';
import type { Insights, Metric } from '../types';
import { METRICS } from './metric-card';

export function DetailDialog({
  metric,
  data,
  onClose,
}: {
  metric: Metric;
  data: Insights;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  const total = data.current[metric];
  return (
    <dialog
      ref={ref}
      className="detail-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="detail-title"
    >
      <div className="dialog-header">
        <div>
          <p className="eyebrow">BEHIND THE NUMBER</p>
          <h2 id="detail-title">
            {METRICS[metric].label}{' '}
            <span className="count-pill">{total ?? 'Unknown'}</span>
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close details"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <p className="dialog-definition">{METRICS[metric].definition}</p>
      <p className="subtle">
        {displayDate(data.range.start)} –{' '}
        {displayDate(data.range.end, { year: 'numeric' })} ·{' '}
        {data.club.timezone}
      </p>
      {metric === 'noShows' && (
        <div className="inline-notice">
          {data.current.attendance.knownBookings} bookings have known
          attendance; {data.current.attendance.unknownBookings} are unknown.
          Unknown sessions remain visible below and do not count as zero.
          Cancelled bookings are excluded.
        </div>
      )}
      <div className="table-scroll detail-table">
        <table>
          <caption className="sr-only">
            {METRICS[metric].label} drill-down
          </caption>
          <thead>
            {metric === 'activePlayers' ? (
              <tr>
                <th>Player</th>
                <th>Held sessions booked</th>
                <th>Last session</th>
              </tr>
            ) : (
              <tr>
                <th>Session</th>
                <th>Bookings</th>
                <th>
                  {metric === 'noShows' ? 'Recorded no-shows' : 'Attendance'}
                </th>
              </tr>
            )}
          </thead>
          <tbody>
            {metric === 'activePlayers'
              ? data.details.players.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="table-person">
                        <span className="avatar">
                          {p.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </span>
                        {p.name}
                      </span>
                    </td>
                    <td>{p.sessionCount}</td>
                    <td>
                      {displayDate(
                        localDate(p.lastSession, data.club.timezone),
                      )}
                    </td>
                  </tr>
                ))
              : data.details.sessions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.title}</strong>
                      <small className="cell-subtitle">
                        {new Intl.DateTimeFormat('en-GB', {
                          timeZone: data.club.timezone,
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        }).format(new Date(s.startsAt))}
                      </small>
                      {metric === 'noShows' && s.absentPlayers.length > 0 && (
                        <small className="cell-subtitle">
                          Absent: {s.absentPlayers.join(', ')}
                        </small>
                      )}
                    </td>
                    <td>{s.bookings}</td>
                    <td>
                      {metric === 'noShows' ? (
                        <>
                          <span
                            className={s.noShows === null ? 'unknown-text' : ''}
                          >
                            {s.noShows ?? 'Unknown'}
                          </span>
                          {s.unknownBookings > 0 && (
                            <small className="cell-subtitle">
                              {s.unknownBookings} unknown
                            </small>
                          )}
                        </>
                      ) : (
                        <span
                          className={`status-tag ${s.attendanceRecorded && s.unknownBookings === 0 ? 'recorded' : ''}`}
                        >
                          {!s.attendanceRecorded
                            ? 'Not recorded'
                            : s.unknownBookings > 0
                              ? 'Partial'
                              : 'Recorded'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
        {(metric === 'activePlayers'
          ? data.details.players
          : data.details.sessions
        ).length === 0 && (
          <div className="table-empty">
            {metric === 'activePlayers' ? <Users /> : <CalendarDays />}
            <p>
              No {metric === 'activePlayers' ? 'players' : 'held sessions'} in
              this period.
            </p>
          </div>
        )}
      </div>
      <div className="dialog-footer">
        <span>Counts use local session start dates.</span>
        <button className="secondary-button" onClick={onClose}>
          Done
        </button>
      </div>
    </dialog>
  );
}
