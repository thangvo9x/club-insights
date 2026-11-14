# Club Insights

A club host dashboard for tracking active players, held sessions and recorded no-shows, with previous-period comparisons, weekly charts and drill-downs into the underlying players and sessions.

![Desktop dashboard](docs/screenshots/desktop.png)

[Mobile preview](docs/screenshots/mobile.png) · [New-club preview](docs/screenshots/empty-club.png) · [Assignment brief](docs/assignment.pdf)

## Tech stack

| Technology                         | Role                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| Node.js 26.13.1 LTS                | Runs the application, seed script and tests; provides the built-in `node:sqlite` module    |
| Next.js 16 App Router              | Organizes pages, layouts and JSON API route handlers in one project                        |
| React 19 + TypeScript              | Builds the UI, manages filter state with React hooks and defines shared data types         |
| SQLite                             | Stores clubs, players, sessions, bookings and data provenance in a local database file     |
| Zod + csv-parse                    | Validates API parameters and CSV records, and parses CSV files with headers                |
| CSS + Lucide React                 | Provides responsive layouts, bar charts and icons; charts include an accessible data table |
| Node test runner + Playwright      | Tests metric calculations, database seeding, API responses and browser interactions        |
| ESLint + Prettier + GitHub Actions | Checks code quality, applies consistent formatting and runs CI on pushes and pull requests |

## Setup and running

Requires **Node.js 26.13.1** and npm. With nvm:

```sh
nvm install
nvm use
npm ci
npm run dev
```

Open http://localhost:3000. After installing dependencies, **`npm run dev`** is the single startup command: it seeds an empty database and starts Next.js. Existing imported data is preserved.

For production:

```sh
npm run build
npm start
```

## Project structure

```text
src/
  app/
    layout.tsx              # Root layout, metadata and global CSS
    page.tsx                # Main page; renders Dashboard
    api/
      clubs/route.ts        # GET /api/clubs: club list
      insights/route.ts     # GET /api/insights: metrics, chart data and details
  components/
    dashboard.tsx           # Fetches data, manages filters and assembles the UI
    metric-card.tsx         # Metric value, definition and previous-period comparison
    weekly-chart.tsx        # Weekly bar chart and accessible data table
    detail-dialog.tsx       # Players or sessions behind a selected metric
  lib/
    types.ts                # Shared Club, Session, Booking and Insights types
    db.ts                   # SQLite schema and database queries
    metrics.ts              # Pure functions for summaries, weekly metrics and details
    dates.ts                # Fixed clock, local dates and week/period calculations
    http.ts                 # API parameter validation and JSON responses
scripts/
  seed.ts                   # Validates and imports all four CSVs in one transaction
data/csv/                   # clubs.csv, players.csv, sessions.csv, bookings.csv
tests/
  assessment-data.test.ts   # Checks independently audited totals from the source CSVs
  metrics.test.ts           # Unknown vs zero, date boundaries, weeks and unique players
  seed.test.ts              # Repeatable seeding and rollback on import failures
  http.test.ts              # API date-range validation
  e2e/dashboard.spec.ts     # API, desktop/mobile, filters and error recovery
docs/                       # API/CSV contracts, spec checklist and preview images
.github/workflows/ci.yml     # Dependency installation, checks, build and browser tests
```

## Data flow

1. `scripts/seed.ts` reads the four CSVs, validates records with Zod and writes them to SQLite. Failed imports roll back the transaction and preserve existing data.
2. `dashboard.tsx` requests `/api/clubs` for the club switcher, then `/api/insights` with `clubId`, `start` and `end`.
3. The route handler validates parameters through `http.ts`, reads the database through `db.ts` and calls `calculateInsights()` in `metrics.ts`.
4. The API returns current and previous summaries, weekly values and player/session details. The same JSON API can also serve a mobile client.
5. React renders the metric cards, chart and detail dialog. Switching clubs or applying a date range fetches new data; selecting a card changes the chart metric.

The frontend receives dashboard data through JSON APIs. Database access stays on the server. See the [API contract](docs/api.md) for response details.

## Dataset and seeding

`data/csv/` contains the four supplied assignment CSVs: **2 clubs, 260 players, 195 sessions and 1,893 bookings**. Saigon Smash Pickleball has session data from January through October 2026. Thảo Điền Tennis Club was created on 1 October 2026 and has no sessions. The [CSV contract](docs/csv-contract.md) documents how source columns map to the database.

```sh
npm run seed                              # Replace database contents with the bundled CSVs
npm run seed -- --csv-dir /path/to/csvs    # Import a directory containing all four CSVs
```

Legacy synthetic demo databases are automatically replaced with the supplied dataset on startup. Other imported databases are preserved; use `npm run seed` to reload them.

The database defaults to `data/club-insights.sqlite` and is excluded from Git. Set `DATABASE_PATH` to use another location. No environment file is required by default.

## Metric rules

- **Clock:** fixed at `2026-10-05T02:00:00Z`, or 09:00 on 5 October 2026 in Ho Chi Minh City.
- **Sessions held:** non-cancelled sessions that ended by the fixed clock, assigned to their local start date.
- **Active players:** distinct players with non-cancelled bookings in held sessions, including no-shows and unknown attendance.
- **Recorded no-shows:** non-cancelled bookings explicitly marked absent at sessions with attendance recorded. Missing attendance is unknown; the API returns `null` when entirely unobserved, rather than substituting zero. The UI shows attendance coverage.
- **Comparison:** the previous period has the same number of calendar days and ends immediately before the selected range. The default range covers the last 28 complete days before the fixed clock.
- **Weeks:** Monday–Sunday in the club timezone. Boundary weeks include only selected dates and are labelled partial. Weekly unique players do not sum to period-wide unique players.

## Checks

```sh
npm run check           # Prettier, ESLint, TypeScript and unit/integration tests
npm run build           # Production build
npx playwright install chromium
npm run test:e2e        # API and browser tests; starts the app if needed
npm run format          # Apply Prettier formatting
```

For a system-installed Chromium: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Browser tests use the supplied CSVs. CI uses the Node version declared in `.nvmrc`.

See the [spec checklist](docs/spec-checklist.md) for requirement coverage.
