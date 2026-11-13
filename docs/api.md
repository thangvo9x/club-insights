# JSON API

Node runtime. Read-only; intentionally no authentication per the brief. All responses use JSON and `Cache-Control: no-store`.

## `GET /api/clubs`

Returns `{ "clubs": [{ "id", "name", "timezone", "created_at" }] }`, ordered by creation time then ID. Club IDs are opaque strings.

## `GET /api/insights?clubId=saigon-rally&start=2026-09-07&end=2026-10-04`

All parameters required. Dates are inclusive `YYYY-MM-DD` in the club’s timezone. Maximum 366 days; end cannot exceed the fixed clock’s local date.

| Field                                             | Meaning                                                                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `club`                                            | Club identity and timezone                                                                                                                |
| `now`                                             | Fixed exercise clock, `2026-10-05T02:00:00.000Z`                                                                                          |
| `dataSource`                                      | `demo` or `imported`                                                                                                                      |
| `range`, `previousRange`                          | Inclusive club-local date ranges                                                                                                          |
| `current`, `previous`                             | `activePlayers`, `sessionsHeld`, nullable `noShows`, and `attendance` coverage                                                            |
| `attendance.recordedSessions`, `eligibleSessions` | Sessions flagged recorded / all held sessions                                                                                             |
| `attendance.knownBookings`, `unknownBookings`     | Confirmed bookings with known / unknown attendance; booking coverage is known / (known + unknown)                                         |
| `weeks[]`                                         | Full Monday/Sunday date labels, `partial`, the three metrics and `unknownBookings`; calculations are clipped to the selected range        |
| `details.players[]`                               | Active-player ID, name, distinct `sessionCount` and UTC `lastSession`                                                                     |
| `details.sessions[]`                              | Every held session: ID, title, UTC `startsAt`, eligible bookings, nullable no-shows, unknown bookings, recorded flag, absent-player names |
| `hasAnySessions`                                  | Whether this club has any session history at all, independent of range                                                                    |

`noShows: null` means unknown, never zero. Partial known attendance returns the observed sum plus unknown counts. Clients must not interpret a decline as an improvement without comparing coverage. `activePlayers` are unique within each period/week, so weekly values are not additive. Session timestamps remain UTC for mobile clients to format in the supplied club timezone.

Errors: `{ "error": "message" }`. Invalid/missing dates, reversed/oversized ranges and future end dates: **400**. Unknown club: **404**. Database failure: **500**, with a generic client message and server-side log. Unsupported methods: **405** via Next.js. No totals are silently substituted for failed requests.
