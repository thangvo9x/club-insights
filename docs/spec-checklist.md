# Assignment acceptance checklist

Reviewed against both pages of **TP - Fullstack Prototype - Club Insights.pdf**.

| Requirement                                         | Implementation / verification                                                         | Status |
| --------------------------------------------------- | ------------------------------------------------------------------------------------- | ------ |
| Dashboard for a club host; designed without mockup  | Laptop-oriented cards, definitions, chart, coverage, drill-downs; browser inspection  | Done   |
| Nine months of provided CSV data                    | Original four CSVs, schema adapter and independently audited metric totals            | Done   |
| Fixed Monday 5 Oct 2026, 09:00 HCMC                 | Shared `NOW` constant; future/ongoing exclusions tested                               | Done   |
| Two clubs, one new without data                     | Switcher; useful fresh-club page; no cross-club leakage tests                         | Done   |
| Host-chosen date range, compared to previous period | 7/28/90-day presets and custom inclusive range, equal prior range; calendar tests     | Done   |
| Active players, sessions held, no-shows             | Pure functions; on-card definitions; period reconciliation via real API test          | Done   |
| At least one metric week by week                    | All three selectable; accessible table; unique-player additivity warning              | Done   |
| Open metric to underlying sessions/players          | Keyboard-accessible native dialog; no-show sessions include absent names and unknowns | Done   |
| Definitions next to each number                     | Metric cards plus methodology explanation                                             | Done   |
| Monday–Sunday weeks in club timezone                | IANA local-date conversion; HCMC UTC-midnight and partial-week tests                  | Done   |
| Unrecorded attendance unknown rather than zero      | Nullable API values, unknown booking/session counts, coverage, tests                  | Done   |
| New club gets useful page                           | Explanatory steps and honest read-only guidance; browser test                         | Done   |
| TypeScript and Next.js                              | Strict TypeScript, App Router and route handlers                                      | Done   |
| SQLite seeded from CSV                              | Built-in SQLite, validated atomic four-file seed; idempotency/rollback test           | Done   |
| Screens use JSON API for mobile reuse               | Only `/api/clubs` and `/api/insights` supply data; documented contract                | Done   |
| No login; switcher between two clubs                | Implemented                                                                           | Done   |
| Laptop; does not break on phone                     | 1440px and 390px browser tests; 320px manual browser check                            | Done   |
| Git repository; one-command run after install       | `npm ci` then `npm run dev` auto-seeds                                                | Done   |
| Short README: run, assumptions, next steps          | README focused on stack/structure; definitions in README; interview notes separate    | Done   |
| At least one automated test for risky metric        | No-show unknown vs zero, cancellation, local boundaries; additional seed/API/UI tests | Done   |

The supplied dataset has 2 clubs, 260 players, 195 sessions and 1,893 bookings. A regression test checks audited totals for the default, previous and full-history periods.

README omits trade-offs and next steps at the user’s request; it focuses on the technology stack, project structure, data flow, setup and metric rules.
