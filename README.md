# Club Insights

A small, read-only Reclub host dashboard: participation, held sessions and observed no-shows, with a weekly chart and traceable drill-downs. Built with Next.js, TypeScript and SQLite.

![Desktop dashboard](docs/screenshots/desktop.png)

[Mobile preview](docs/screenshots/mobile.png) · [New-club preview](docs/screenshots/empty-club.png) · [Original brief](docs/assignment.pdf)

## Run

Requires **Node.js 24.x** (uses built-in `node:sqlite`) and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. After installing, **`npm run dev` is the one-command start**: it seeds an empty database from the checked-in CSVs, then runs Next.js. Existing data is preserved. For production: `npm run build`, then `npm start` (also seeds when empty).

**Data limitation:** only the assignment PDF was supplied. `data/csv/*.csv` contains clearly labelled, deterministic **synthetic demo data**, not the assessment dataset: 2 clubs, 96 players, 163 sessions and 2,605 bookings covering January–October 2026 (including future sessions to exercise exclusions). The second club has no sessions. Real-data compliance remains pending receipt of the original four CSVs and verification of their headers. See [CSV contract](docs/csv-contract.md).

```sh
npm run seed                              # explicitly replace DB with demo CSVs
npm run seed -- --csv-dir /path/to/csvs    # import all four CSVs atomically
npm run demo:generate                     # regenerate deterministic demo CSVs
```

Import validates fields, time zones, foreign keys and duplicate player/session bookings. Any failure preserves the previous database. The application never reads CSVs directly: **all dashboard data comes from JSON APIs backed by SQLite**. `DATABASE_PATH` optionally overrides `data/club-insights.sqlite`; no environment setup is needed by default.

## Decisions where the brief was silent

- **Clock:** always `2026-10-05T02:00:00Z`, i.e. Monday 5 October, 09:00 in Ho Chi Minh City. Never the machine clock.
- **Held session:** non-cancelled, ended by that clock; assigned to the club-local date on which it started. Ongoing/future sessions are excluded even if their status says completed.
- **Active player:** distinct player with a confirmed (non-cancelled) booking in a held session. Includes no-shows and unknown attendance: this measures booking participation, **not actual attendance**. The definition appears beside the card.
- **No-show:** confirmed booking explicitly marked absent, only at a session with attendance recorded. Missing records are unknown, not zero. A partly observed period shows the observed count plus coverage; entirely unobserved/no-session periods show `null` / “Unknown”. An empty session with attendance recorded has known zero no-shows.
- **Comparison:** inclusive calendar date range versus the immediately preceding equal number of days. Default: last 28 complete days, 7 September–4 October. Zero baseline shows “No baseline” instead of infinite growth. No-show change uses observed counts, with coverage for both periods; no misleading percentage or “improved” claim.
- **Weeks:** Monday–Sunday in each club’s IANA timezone. Boundary weeks include only selected days and are labelled partial. Weekly unique players must not be summed into period uniques.
- **Scope:** no login, club switcher, laptop-first responsive layout, English UI to match the brief. Empty clubs get an onboarding explanation; empty ranges, loading and failures have separate states. Custom ranges are limited to 366 days and cannot end after the fixed local date.

## Structure & checks

`src/lib/metrics.ts` is a pure calculation layer; `db.ts` handles parameterized SQLite reads; route handlers return JSON; `src/components/` contains reusable metric cards, chart and native accessible detail dialog. See [API contract](docs/api.md) and [spec checklist](docs/spec-checklist.md).

```sh
npm run check           # Prettier, ESLint, strict TypeScript, automated unit/integration tests
npm run build           # production build
npx playwright install chromium
npm run test:e2e        # real API + desktop/mobile/error flows, starts app if needed
```

For a system Chromium: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. E2E tests expect the bundled demo CSVs. CI runs checks, build and browser tests on a clean install. `npm run format` applies the shared formatting rules.

## Trade-offs & next steps

Kept intentionally simple: one app, route handlers instead of a separate server, built-in SQLite instead of an ORM/native DB dependency, React state instead of a state library, and CSS bars with an accessible data table instead of a charting library. A single response includes summaries, weeks and drill-downs: consistent and easy to consume from mobile, but overfetches. Synchronous reads and TypeScript aggregation are reasonable for one club’s nine months; they block the server thread and will need SQL aggregation, pagination and async DB access at larger scale. SQLite requires persistent local storage and a Node runtime; this is not an Edge/serverless-ephemeral deployment.

Next: import/verify the original CSVs, confirm the active-player definition with hosts, add SQL aggregation and paginated drill-down endpoints, URL-persisted filters, broader accessibility testing and authenticated club permissions before production. More interview notes (Vietnamese): [trade-offs](docs/interview-notes.vi.md).
