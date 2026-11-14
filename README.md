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
  app/                         # Next.js pages, layout and thin JSON route handlers
  features/
    clubs/
      hooks/use-clubs.ts       # Club list, loading, error and retry
      server/queries.ts        # Club database queries
      types.ts                 # Club model
    insights/
      components/              # Dashboard, metric cards, weekly chart and detail dialog
      hooks/
        use-insights.ts        # Insights query for a club and date range
        use-date-range.ts      # Presets, draft dates, validation and applying a range
      lib/
        dates.ts               # Fixed clock and club-local date/week calculations
        validation.ts          # Date-range schema shared by the UI and API
      server/
        queries.ts             # Reads sessions, bookings and players for a club
        metrics.ts             # Pure summary, weekly and drill-down calculations
      types.ts                 # Booking, session, date-range and insights models
  hooks/use-json-query.ts       # Shared JSON fetching, cancellation, loading and retry
  lib/
    api-client.ts              # JSON requests and HTTP error handling
    db.ts                      # SQLite connection and schema
    http.ts                    # JSON response helper
scripts/seed.ts                # Validates and imports all four CSVs in one transaction
data/csv/                      # Supplied clubs, players, sessions and bookings CSVs
tests/                         # Metric, import, API and browser tests
docs/                          # API/CSV contracts and preview images
.github/workflows/ci.yml        # Dependency installation, checks, build and browser tests
```

## Feature boundaries and reusable hooks

Each feature owns its UI, hooks, types and server queries. `app/` connects Next.js routes to the features. Only infrastructure used across features lives in the shared `hooks/` and `lib/` folders. Client components import feature hooks; database queries stay in server modules.

- `useJsonQuery<T>(url)` returns `data`, `error`, `isLoading` and `refetch`. Pass `null` to pause a dependent request. URL changes and unmounts abort pending requests; responses from cancelled requests cannot update state. The hook handles fetching without knowledge of clubs or metrics.
- `useClubs()` wraps the shared query hook with the clubs endpoint and handles an empty club list.
- `useInsights(clubId, range)` builds the insights query and pauses it until a club is available.
- `useDateRange(initialRange)` manages applied dates separately from draft inputs, date presets and validation. It returns `applyRange()` as a plain action, so forms handle their own DOM events. It shares the date-range schema with the API.

The Dashboard keeps local presentation state such as the selected chart metric and open dialog. The hooks can be used by other components without rendering the Dashboard.

## Data flow

1. `scripts/seed.ts` validates the four CSVs with Zod and imports them through the shared SQLite connection. Failed imports roll back and preserve existing data.
2. The Dashboard uses `useClubs()` for the switcher and `useDateRange()` for filters, then passes the chosen club and applied dates to `useInsights()`.
3. The API route validates parameters using `features/insights/lib/validation.ts`, reads data through the feature's `server/queries.ts` and calls `calculateInsights()` in `server/metrics.ts`.
4. The API returns current and previous summaries, weekly values and player/session details. A mobile client can use the same JSON API.
5. React renders the cards, chart and detail dialog. Changing clubs or applying a range updates the query; selecting a metric changes only the chart.

The frontend receives dashboard data through JSON APIs. Database access stays on the server. See the [API contract](docs/api.md) for response details.

## Dataset and seeding

`data/csv/` contains the four supplied assignment CSVs: **2 clubs, 260 players, 195 sessions and 1,893 bookings**. Saigon Smash Pickleball has session data from January through October 2026. Thảo Điền Tennis Club was created on 1 October 2026 and has no sessions. The [CSV contract](docs/csv-contract.md) documents how source columns map to the database.

```sh
npm run seed                              # Replace database contents with the bundled CSVs
npm run seed -- --csv-dir /path/to/csvs    # Import a directory containing all four CSVs
```

Existing imported databases are preserved on startup; use `npm run seed` to reload the supplied CSVs.

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
