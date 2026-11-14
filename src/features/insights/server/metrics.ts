import type { Club } from '../../clubs/types';
import {
  addDays,
  containsDate,
  localDate,
  mondayOf,
  NOW,
  precedingRange,
} from '../lib/dates';
import type {
  Dataset,
  DateRange,
  Insights,
  PeriodSummary,
  Session,
  SessionDetail,
} from '../types';

function heldSessions(
  data: Dataset,
  range: DateRange,
  timezone: string,
  now: string,
): Session[] {
  return data.sessions.filter(
    (s) =>
      s.status !== 'cancelled' &&
      Date.parse(s.ends_at) <= Date.parse(now) &&
      containsDate(range, localDate(s.starts_at, timezone)),
  );
}

function sessionDetails(data: Dataset, sessions: Session[]): SessionDetail[] {
  const names = new Map(data.players.map((p) => [p.id, p.name]));
  const bySession = Map.groupBy(
    data.bookings.filter((b) => b.status === 'confirmed'),
    (b) => b.session_id,
  );
  return sessions
    .map((s) => {
      const bookings = bySession.get(s.id) ?? [];
      const known = s.attendance_recorded
        ? bookings.filter((b) => b.attendance !== null)
        : [];
      const absent = known.filter((b) => b.attendance === 'absent');
      return {
        id: s.id,
        title: s.title,
        startsAt: s.starts_at,
        bookings: bookings.length,
        noShows:
          !s.attendance_recorded || (bookings.length > 0 && known.length === 0)
            ? null
            : absent.length,
        unknownBookings: bookings.length - known.length,
        attendanceRecorded: s.attendance_recorded,
        absentPlayers: absent.map((b) => names.get(b.player_id) ?? b.player_id),
      };
    })
    .sort((a, b) => Date.parse(b.startsAt) - Date.parse(a.startsAt));
}

function summarize(
  data: Dataset,
  sessions: Session[],
  details: SessionDetail[],
): PeriodSummary {
  const ids = new Set(sessions.map((s) => s.id));
  const active = new Set(
    data.bookings
      .filter((b) => b.status === 'confirmed' && ids.has(b.session_id))
      .map((b) => b.player_id),
  );
  const knownBookings = details.reduce(
    (sum, s) => sum + s.bookings - s.unknownBookings,
    0,
  );
  const unknownBookings = details.reduce(
    (sum, s) => sum + s.unknownBookings,
    0,
  );
  // No recorded observations cannot establish zero no-shows.
  const noShows = details.some((s) => s.noShows !== null)
    ? details.reduce((sum, s) => sum + (s.noShows ?? 0), 0)
    : null;
  return {
    activePlayers: active.size,
    sessionsHeld: sessions.length,
    noShows,
    attendance: {
      recordedSessions: sessions.filter((s) => s.attendance_recorded).length,
      eligibleSessions: sessions.length,
      knownBookings,
      unknownBookings,
    },
  };
}

export function calculateInsights(
  club: Club,
  data: Dataset,
  range: DateRange,
  dataSource: 'demo' | 'imported',
  now = NOW,
): Insights {
  const clubData = {
    ...data,
    sessions: data.sessions.filter((s) => s.club_id === club.id),
  };
  const previousRange = precedingRange(range);
  const sessions = heldSessions(clubData, range, club.timezone, now);
  const previousSessions = heldSessions(
    clubData,
    previousRange,
    club.timezone,
    now,
  );
  const details = sessionDetails(clubData, sessions);
  const weeks: Insights['weeks'] = [];
  for (
    let monday = mondayOf(range.start);
    monday <= range.end;
    monday = addDays(monday, 7)
  ) {
    const sunday = addDays(monday, 6);
    const weekRange = {
      start: monday < range.start ? range.start : monday,
      end: sunday > range.end ? range.end : sunday,
    };
    const weekSessions = heldSessions(clubData, weekRange, club.timezone, now);
    const summary = summarize(
      clubData,
      weekSessions,
      sessionDetails(clubData, weekSessions),
    );
    weeks.push({
      start: monday,
      end: sunday,
      partial: weekRange.start !== monday || weekRange.end !== sunday,
      activePlayers: summary.activePlayers,
      sessionsHeld: summary.sessionsHeld,
      noShows: summary.noShows,
      unknownBookings: summary.attendance.unknownBookings,
    });
  }
  const ids = new Set(sessions.map((s) => s.id));
  const sessionDates = new Map(sessions.map((s) => [s.id, s.starts_at]));
  const byPlayer = Map.groupBy(
    clubData.bookings.filter(
      (b) => b.status === 'confirmed' && ids.has(b.session_id),
    ),
    (b) => b.player_id,
  );
  const players = clubData.players
    .filter((p) => byPlayer.has(p.id))
    .map((p) => {
      const bookings = byPlayer.get(p.id)!;
      return {
        ...p,
        sessionCount: new Set(bookings.map((b) => b.session_id)).size,
        lastSession: bookings
          .map((b) => sessionDates.get(b.session_id)!)
          .sort((a, b) => Date.parse(a) - Date.parse(b))
          .at(-1)!,
      };
    })
    .sort(
      (a, b) => b.sessionCount - a.sessionCount || a.name.localeCompare(b.name),
    );
  return {
    club,
    now,
    dataSource,
    range,
    previousRange,
    current: summarize(clubData, sessions, details),
    previous: summarize(
      clubData,
      previousSessions,
      sessionDetails(clubData, previousSessions),
    ),
    weeks,
    details: { players, sessions: details },
    hasAnySessions: clubData.sessions.length > 0,
  };
}
