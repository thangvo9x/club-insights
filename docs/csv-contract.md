# CSV import contract

The checked-in files in `data/csv/` are the four original CSVs supplied for this assignment, kept with their original headers and values. The seed adapter validates source rows and maps them to the application's internal model.

Each import directory must contain all four UTF-8 files. Headers are required; BOM, quoted fields, CRLF and blank lines are supported. IDs are non-empty strings; timestamp fields are ISO 8601 UTC with `Z`; calendar date fields use `YYYY-MM-DD`.

| File           | Source headers                                                                          | Mapping / validation                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `clubs.csv`    | `club_id,name,time_zone,created_at`                                                     | `club_id` → `id`, `time_zone` → valid IANA `timezone`; `created_at` accepts a date or UTC timestamp                                                                                     |
| `players.csv`  | `player_id,club_id,name,joined_club_at`                                                 | `player_id` → `id`; validates membership ID and join date; stores player ID/name used by metrics                                                                                        |
| `sessions.csv` | `session_id,club_id,title,starts_at,duration_minutes,places,status,attendance_recorded` | `session_id` → `id`; derives `ends_at` from UTC start + positive integer duration; validates nonnegative places; status `scheduled`/`cancelled`; recorded `true`/`false` → SQLite 1/0   |
| `bookings.csv` | `booking_id,session_id,player_id,booked_at,status,cancelled_at,attended`                | `booking_id` → `id`; `booked` → internal `confirmed`; `cancelled` remains cancelled; attended `true`/`false`/empty → `present`/`absent`/null; validates booking/cancellation timestamps |

Fields not used by the dashboard (membership date, capacity, booking and cancellation timestamps) are validated at import and retained in the original CSVs, rather than copied to the query model. Session/club and booking/session/player foreign keys, duplicate IDs and duplicate player/session bookings are enforced by SQLite.

A session's source status can remain `scheduled` after it finishes. Held-session eligibility therefore uses its derived end timestamp and the fixed clock, excluding cancelled sessions. This is covered by the original-dataset regression test.

A cancelled booking never affects metrics. At an unrecorded session all confirmed bookings have unknown attendance, even if a booking has an attended value. At a recorded session empty attended values remain unknown.

All files are parsed before mutation; replacement is one transaction. Validation or SQL failures preserve the old database. `npm run dev` seeds empty databases and replaces legacy synthetic demo databases with the supplied data; other imported databases are kept. Explicit `npm run seed` replaces the dataset, so stop the app before reseeding.

## Verified dataset

2 clubs, 260 players, 195 sessions, 1,893 bookings. `club-002` has no sessions or players.

| Period (club local dates) | Active players | Held sessions | Recorded no-shows | Recorded sessions | Known bookings | Unknown bookings |
| ------------------------- | -------------- | ------------- | ----------------- | ----------------- | -------------- | ---------------- |
| 7 Sep–4 Oct 2026          | 93             | 20            | 15                | 11                | 151            | 113              |
| 10 Aug–6 Sep 2026         | 92             | 20            | 14                | 12                | 152            | 96               |
| 1 Jan–4 Oct 2026          | 213            | 186           | 86                | 104               | 999            | 734              |

These expected values were independently calculated directly from the source CSVs with Python's `csv` and `datetime`, then asserted in `tests/assessment-data.test.ts`. Unknown bookings never count as no-shows.
