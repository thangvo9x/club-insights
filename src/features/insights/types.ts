import type { Club } from '../clubs/types';

export type Player = { id: string; name: string };
export type Session = {
  id: string;
  club_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  attendance_recorded: boolean;
};
export type Booking = {
  id: string;
  session_id: string;
  player_id: string;
  status: 'confirmed' | 'cancelled';
  attendance: 'present' | 'absent' | null;
};
export type Dataset = {
  sessions: Session[];
  players: Player[];
  bookings: Booking[];
};
export type DateRange = { start: string; end: string };
export type Metric = 'activePlayers' | 'sessionsHeld' | 'noShows';
export type PeriodSummary = {
  activePlayers: number;
  sessionsHeld: number;
  noShows: number | null;
  attendance: {
    recordedSessions: number;
    eligibleSessions: number;
    knownBookings: number;
    unknownBookings: number;
  };
};
export type SessionDetail = {
  id: string;
  title: string;
  startsAt: string;
  bookings: number;
  noShows: number | null;
  unknownBookings: number;
  attendanceRecorded: boolean;
  absentPlayers: string[];
};
export type Insights = {
  club: Club;
  now: string;
  dataSource: 'demo' | 'imported';
  range: DateRange;
  previousRange: DateRange;
  current: PeriodSummary;
  previous: PeriodSummary;
  weeks: {
    start: string;
    end: string;
    partial: boolean;
    activePlayers: number;
    sessionsHeld: number;
    noShows: number | null;
    unknownBookings: number;
  }[];
  details: {
    players: {
      id: string;
      name: string;
      sessionCount: number;
      lastSession: string;
    }[];
    sessions: SessionDetail[];
  };
  hasAnySessions: boolean;
};
