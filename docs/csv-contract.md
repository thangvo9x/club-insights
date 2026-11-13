# CSV import contract

The source dataset mentioned in the PDF was not attached. These are the **prototype’s explicit headers**, not an assertion about the unseen assessment CSV schema. Adjust the adapter in `scripts/seed.ts` after inspecting the real files; do not silently rename or reinterpret attendance fields.

Each import directory must contain all four UTF-8 files below. Headers are required; BOM, quoted fields, CRLF and blank lines are supported by `csv-parse`. Additional columns are ignored. IDs are non-empty strings. Times must be ISO 8601 UTC with `Z`.

| File           | Required headers                                                | Values / constraints                                                                                       |
| -------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `clubs.csv`    | `id,name,timezone,created_at`                                   | Unique ID; valid IANA timezone; UTC creation time                                                          |
| `players.csv`  | `id,name`                                                       | Unique ID; non-empty name                                                                                  |
| `sessions.csv` | `id,club_id,title,starts_at,ends_at,status,attendance_recorded` | Club FK; end after start; status `scheduled`, `completed`, `cancelled`; recorded `true`/`false` or `1`/`0` |
| `bookings.csv` | `id,session_id,player_id,status,attendance`                     | Session/player FKs; status `confirmed`/`cancelled`; attendance `present`/`absent`/empty                    |

One player can have at most one booking per session. A cancelled booking never affects metrics, regardless of its attendance. At an unrecorded session, **all** confirmed bookings have unknown attendance, even if an attendance value is present. At a recorded session, empty booking attendance is still unknown. This conservative rule tolerates partially entered attendance without fabricating absences.

All four files are parsed/validated before mutation. Database replacement is a single transaction in dependency order; constraint failures roll back the entire import and its provenance marker. `npm run dev` does not overwrite nonempty databases. Stop the app before explicitly reseeding.
