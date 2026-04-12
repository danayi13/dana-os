# Dana OS — Implementation Tracker

> Internal build tracker for Dana OS **v1.3**. In sync with `dana-os-spec-v1.3.docx`. Phase-ordered, dependency-aware. Check items off as you go. Each phase must produce a working, used module before the next begins.

**Legend:** `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked

## Cross-cutting principles (apply to every module)

- **Always confirm, never auto-act.** Any action that would mark something as done, consumed, completed, expired, assigned, or otherwise state-changed on the user's behalf MUST present a confirmation prompt and wait for explicit user input. The system surfaces and suggests; the user decides. This applies to: media queue closer (Spotify match → suggest), wheel expiry workflow, next-leg queue prompts, queue→entertainment pipeline drafts, annual TV airing-status check-ins, goal carry-forward, Apple Health re-imports, and anything similar in future modules. Checking things off is part of the value of the app — don't take it away by being clever. The only exceptions are pure data ingest jobs (Oura nightly, Spotify hourly, Google Calendar pulls) which write raw observations, never derived state changes.
- **Navigation is important.** Anything that is implemented should be tagged with keywords/descriptions. There should be an app-level Command+K search bar to navigate through the app (should be trivial given the tagging).

---

## Pre-flight (before Phase 0)

- [ ] Create GitHub repo `dana-os` (private)
- [ ] Decide directory layout: `/backend`, `/frontend`, `/infra`, `/scripts`, `/docs`
- [ ] Drop `dana-os-spec-v1.docx` into `/docs` for reference
- [ ] Install prerequisites locally: Docker Desktop, Node 20+, Python 3.12+, `uv` or `poetry`
- [ ] Create `.env.example` with placeholder keys (Anthropic, Oura, Spotify, Google, Sheets)
- [ ] Add `.gitignore` covering `.env`, `__pycache__`, `node_modules`, `dist`, `*.dump`

---

## Phase 0 — Foundation

**Goal:** `docker compose up -d` works, health endpoint green, backups running, CI green. No user features.

### Infra & Docker
- [ ] `docker-compose.yml` with three services: `postgres`, `api`, `web`
- [ ] Postgres 16 image, named volume `postgres_data`, port 5432
- [ ] Set `restart: unless-stopped` on all services
- [ ] Configure Docker Desktop to launch at login
- [ ] `.env` loading via pydantic-settings (DB URL, secrets)

### Database bootstrap
- [ ] `backend/sql/init.sql`: creates `danaos_app` user (read/write) and `danaos_ro` user (read-only, for NLP)
- [ ] Enable extensions: `uuid-ossp`, `pg_trgm`
- [ ] Create `danaos` and `danaos_test` databases

### Backend scaffold (FastAPI)
- [ ] Project skeleton: `backend/app/{main.py,config.py,db.py,routers/,models/,schemas/,services/}`
- [ ] FastAPI app with CORS configured for `localhost:5173`
- [ ] `/health` endpoint returning `{status, database, version}`
- [ ] SQLAlchemy: `engine`, `SessionLocal`, `ReadOnlySessionLocal` (separate engine), `Base`
- [ ] Pydantic-settings config object
- [ ] Error handling middleware (uniform JSON error shape)
- [ ] Alembic init + migration `0001_baseline.py` (no tables; document date-spine convention in comment)

### Frontend scaffold (Vite + React + TS)
- [ ] `npm create vite@latest` with React + TS template
- [ ] Tailwind CSS + shadcn/ui installed and configured
- [ ] React Router with placeholder routes per planned module
- [ ] TanStack Query: `QueryClient` + typed `apiClient` wrapper
- [ ] Shell layout: sidebar, header (NLP query bar placeholder), main content
- [ ] `vite-plugin-pwa`: manifest, service worker, installable — **do not skip, painful to retrofit**
- [ ] Dark/light theme baseline

### Backups
- [ ] `scripts/backup.sh`: `pg_dump` + gzip + timestamped filename → `~/dana-os-backups/`
- [ ] Include `/uploads` dir in backup (even though it doesn't exist yet)
- [ ] launchd plist (or crontab) for 02:00 daily run
- [ ] 30-day retention prune logic in script
- [ ] **Test a restore once** with dummy data before Phase 1

### Testing & CI
- [ ] pytest setup: `tests/conftest.py` with `danaos_test` fixture (create + teardown per session)
- [ ] FastAPI `TestClient` example test against `/health`
- [ ] Vitest + React Testing Library setup
- [ ] One frontend smoke test (renders shell)
- [ ] GitHub Actions workflow: backend tests + frontend tests on push/PR
- [ ] Branch protection: PRs blocked on failing CI

### Phase 0 success check
- [ ] `docker compose up -d` starts cleanly cold
- [ ] `GET /health` returns ok + db connected
- [ ] Frontend loads at `localhost:5173`
- [ ] `alembic current` shows `0001`
- [ ] `backup.sh` produces a `.dump.gz`
- [ ] CI green on `main`

---

## Phase 1 — Habits & Goals  *(replaces active daily spreadsheet)*

**Shared infra built here (used by every later module):** Sheets sync adapter, staleness nudge engine stub, home screen shell.

### Schema (Alembic 0002)
- [ ] `habit_definitions` (id, name, description, type, unit, target, period_type, period_config, active, created_at)
- [ ] `habit_logs` (id, habit_id, date NOT NULL, value, notes, created_at) — index `(date, habit_id)`
- [ ] `goals` (id, year, type, name, target_value, linked_module, status, completed_at)
- [ ] `reminder_config` table (generic — used by every staleness-nudge module going forward): subject_type, subject_id, interval, enabled
- [ ] `nudge_states` table (generic — powers snooze/dismiss across every module): subject_type, subject_id, state (active/snoozed/dismissed), snoozed_until (nullable timestamp), dismissed_at (nullable), updated_at. Unique on (subject_type, subject_id). Engine treats `snoozed` as inactive until `snoozed_until` passes; `dismissed` as inactive until the user-defined "next event" resets it (e.g., logging a habit re-arms its nudge).

### Backend
- [ ] `routers/habits.py`: CRUD for definitions + logs + backfill upsert
- [ ] Period type validation (daily / weekly / N-times-per-week / weekly-average)
- [ ] Weekly running total / average calculation service
- [ ] `routers/goals.py`: CRUD, mark binary done, milestone progress link
- [ ] **Sheets sync adapter** (generic): `services/sheets_sync.py` with input-cells-only contract
- [ ] Habits Sheets sync implementation (first consumer of adapter)
- [ ] **Staleness engine stub**: `services/nudges.py` returning a list of stale items for home screen, filtering out snoozed (until snoozed_until) and dismissed entries
- [ ] Snooze/dismiss endpoints: `POST /nudges/{subject_type}/{subject_id}/snooze` (body: duration — 1d/3d/1w/custom), `POST /nudges/{subject_type}/{subject_id}/dismiss`, `POST /nudges/{subject_type}/{subject_id}/reset` (re-arms after dismissal)
- [ ] Auto-reset hook: when a tracked event happens (habit logged, climbing session entered, etc.), the corresponding nudge state resets to active

### Frontend
- [ ] Habit definition admin page (create/edit/archive)
- [ ] Daily entry: today's checklist, large tap targets, weekly running total visible
- [ ] Backfill calendar view (tap past day → prefilled entry)
- [ ] Goals page: yearly binary checklist + milestone progress bars
- [ ] Highcharts: streak heatmap, completion line, weekly grid
- [ ] Home screen shell with today's unchecked habits + nudge strip
- [ ] **Nudge strip controls**: each nudge has snooze (1d / 3d / 1w / custom) and dismiss actions, accessible via swipe on mobile or a small menu on desktop

### Tests
- [ ] Habit CRUD endpoints
- [ ] Period type validation (each variant)
- [ ] Backfill upsert (no duplicates)
- [ ] Weekly average calculation
- [ ] Sheets sync adapter (mocked Google client)
- [ ] Goal progress calculation
- [ ] Nudge snooze: stays hidden until snoozed_until passes, then reappears
- [ ] Nudge dismiss: stays hidden until reset by a new tracked event
- [ ] Auto-reset on event (logging a habit re-arms its nudge)

### Phase 1 success check
- [ ] Create a weekly-average habit, log today, backfill 3 past days
- [ ] Streak chart renders
- [ ] Mark a yearly binary goal as done
- [ ] Spreadsheet receives the entry within seconds
- [ ] Home screen shows unchecked habits

---

## Phase 2 — Vocal Lesson Tracker

- [ ] Alembic 0003: `vocal_lessons` (date, repertoire, teacher_notes, reflection, rating)
- [ ] Backend CRUD + backfill
- [ ] Entry form (mobile-fast)
- [ ] Dashboard: frequency, repertoire list, consistency chart, rating trend
- [ ] Sheets sync (reuses adapter)
- [ ] Tests: CRUD + Sheets sync
- [ ] **Success:** log a lesson, see it in spreadsheet, monthly chart renders

---

## Phase 3 — Climbing Tracker

- [ ] Alembic 0004: `gyms` lookup, `climbing_sessions` (date, gym_id, duration, max_grade, avg_grade, notes)
- [ ] Gym admin (add new gyms)
- [ ] Session entry form
- [ ] Dashboard: grade progression, monthly volume, gym breakdown
- [ ] Configurable staleness nudge (reuses Phase 1 engine)
- [ ] Sheets sync
- [ ] Tests: CRUD, gym lookup, nudge logic
- [ ] **Success:** log session, progression chart, nudge fires after rest period

---

## Phase 4 — Entertainment Tracker

**Media types tracked:** films, TV shows, books, albums (non-musical, mostly pop), musical soundtracks (always tied to a stage musical), musicals/plays seen live. Albums and soundtracks are separate types because they're conceptually distinct, not just tagged differently.
**Universal fields on every item:** title, type, rating, notes, **encounter count** (times watched/read/listened/seen), first encounter date, last encounter date.
**Encounter logs** are separate rows (one per watch/read/listen/viewing) so dates, companions, and venues are preserved per encounter — the count field is derived but cached for fast queries.

### Schema (Alembic 0005)

**Core**
- [ ] `entertainment_items` — shared core: id, title, type (enum: film/tv_show/book/album/soundtrack/musical), rating, notes, encounter_count (cached), first_encountered_at, last_encountered_at, created_at
- [ ] `entertainment_encounters` — one row per watch/read/listen/viewing: id, item_id, date NOT NULL, companions (FK people, multi), context_notes — drives the count and feeds Life Log date spine
- [ ] `media_queue_items` — want-to lists per type (films/TV/books/albums/soundtracks/musicals). Fields: title, type, recommender, date_added, notes, priority, **spotify_uri (nullable)** — used by the music queue (albums/soundtracks) to deep-link straight into the Spotify app or web player. Optional so you can still queue things you heard about offline. Songs (not just albums) are queueable via the same table — track-level entries get their own type or a `music_kind` discriminator (album/song/playlist).
- [ ] Trigger or service-layer recalc keeping `encounter_count`, `first/last_encountered_at` in sync with encounters

**Type-specific extension tables** (1:1 with `entertainment_items` via `item_id`)
- [ ] `film_details` — release_year, director, runtime_minutes; per-encounter `saw_in_theater BOOL` and `theater_id` live on `entertainment_encounters` extension columns or a `film_encounter_details` join (decide during schema design)
- [ ] `tv_show_details` — creator, **show_status** (complete/ongoing/unsure), **my_status** (watching/finished/stopped/waiting_for_new_season/queued). **Derived fields** (computed, cached on read or via materialized view): total_episodes (sum of season episode_counts), episodes_watched (count of distinct episodes covered by **non-rewatch** sessions), avg_episodes_per_sitting (mean session length, all sessions including rewatches — that's a "how I watch" stat), most_episodes_in_a_day (max sum across same-date sessions per show, all sessions), start_date (earliest non-rewatch watch log), end_date (latest non-rewatch watch log), **latest_episode_watched** (max season+episode tuple from **non-rewatch sessions only** — solves the spreadsheet bug where rewatching S2E3 made it look like you were "back at" S2E3). Rewatch sessions still feed encounter count, sitting averages, and the encounter timeline — they just don't move your progress backwards. Rating + notes live on the parent `entertainment_items` row.
- [ ] `tv_seasons` — show_id, season_number, episode_count, year (no per-episode rows needed — watch logs reference episode numbers directly)
- [ ] `tv_watch_logs` — show_id, date NOT NULL, season_number, episode_start, episode_end, rewatch flag, session_notes — **one row per viewing session**, not per episode. A session covers a contiguous range within a single season. Episodes watched in a session = `episode_end - episode_start + 1`. Enables "average episodes per sitting" queries. Constraint: `episode_end >= episode_start`. If you watch across two seasons in one sitting, log two rows.
- [ ] `tv_episode_notes` — show_id, season_number, episode_number, note, created_at — **optional per-episode commentary** for monumental episodes. Sparse by design (most episodes won't have one). Unique on (show, season, episode) so a single episode has one canonical note that you can edit. Surfaced inline when viewing a session log that covers that episode.
- [ ] `book_details` — author, release_year, page_count (optional); completion-date-only — `entertainment_encounters.date` is the completion date
- [ ] `album_details` — artist, release_year, favorite_tracks (text/JSONB array)
- [ ] `soundtrack_details` — composer, release_year (link to musical handled via generic `entertainment_item_links` table below)
- [ ] `musical_details` — composer, opening_year (the show's, not yours)
- [ ] `entertainment_item_links` — generic cross-type linkage, **always manually created by the user, never auto-detected**: from_item_id, to_item_id, link_type, notes. Link types are a fixed enum extended in code, not user-defined freeform. **Bidirectional via auto-created inverse rows**: when the user creates one link, the service writes both the forward row and its inverse, so every query is "find rows where `from_item_id = me`" — no special-case direction handling per link type. Link type enum with paired inverses: `soundtrack_of` ↔ `has_soundtrack`, `deluxe_of` ↔ `has_deluxe_edition`, `film_adaptation_of` ↔ `has_film_adaptation`, `book_adaptation_of` ↔ `has_book_adaptation`, `sequel_of` ↔ `has_sequel`, `remake_of` ↔ `has_remake`, `other` ↔ `other` (self-inverse). Unique constraint on (from, to, link_type). Deleting a link removes both rows atomically.
- [ ] `musical_encounter_venues` — per-encounter venue: encounter_id, theater_id, city, seat (optional) — because you may see the same musical at different theaters
- [ ] `theaters` lookup table — name, city, country (predefined list, add via admin like gyms)

**Indexes**
- [ ] `entertainment_items (type, last_encountered_at DESC)`
- [ ] `entertainment_encounters (date, item_id)` — date spine
- [ ] `entertainment_encounters (item_id, date)` — encounter history per item

### Backend
- [ ] Generic `/items` CRUD with type discriminator + type-specific payload validation (Pydantic discriminated unions)
- [ ] `/encounters` endpoint: log a new encounter, auto-bump count + last_encountered_at
- [ ] CSV importer for 10-year spreadsheet (idempotent, dry-run mode, per-type column mapping)
- [ ] TV show admin: add seasons, set episode count per season
- [ ] Episode progress calculation (variable season lengths)
- [ ] Theater admin (add new theaters)
- [ ] Media queue CRUD + shuffle endpoint per type
- [ ] Pipeline: marking queue item done → drafts an `entertainment_items` row + first encounter
- [ ] Annual airing-status check-in surfacing logic (TV only)
- [ ] "Already seen?" lookup on title+type to prevent dupes; surfaces "log another encounter" instead

### Frontend
- [ ] Per-type entry forms (film, book, album, musical, soundtrack) with the right fields visible — no generic blob form
- [ ] **Optional "Link to existing item" section on every entry form**: pick another item by title search, choose link_type from the enum (the dropdown shows the relationship from the perspective of the item you're currently entering — e.g. when adding a book, you'd pick "has film adaptation"; when adding the film later, you'd pick "film adaptation of"). Either direction creates the same bidirectional pair, so the order you log things in doesn't matter. Always optional, never inferred.
- [ ] Film entry: title, year, director, rating, notes, theater toggle, theater dropdown if toggled
- [ ] Book entry: title, author, year, completion date, rating, notes
- [ ] Album entry: title, artist, year, rating, favorite tracks, notes
- [ ] Musical entry: title, composer, theater (dropdown), date seen, rating, notes
- [ ] Soundtrack entry: title, optional link to musical item, composer, year, rating, notes
- [ ] TV show: per-season episode tracking via **session entry** — pick show, date, season, episode start, episode end (defaults episode_end = episode_start for single-episode nights). **Rewatch toggle** on the form (defaults off; flips to on if any episode in the range has already been logged in a non-rewatch session). Rewatch sessions can record companions — captures the "watching with someone who's earlier in the show" case. Optional "add note for episode N" inline link per episode in the range — opens a small textarea, saves to `tv_episode_notes`.
- [ ] TV show admin page: edit show_status, my_status, creator, manage seasons + episode counts
- [ ] TV show detail page: all derived stats visible (episodes watched / total, avg per sitting, biggest binge day, start/end dates, latest episode S×E×, rating, notes), inline list of episodes with notes
- [ ] **"Log another encounter"** quick action on any item → date + companions, no full re-entry
- [ ] Per-type dashboard tabs: films, TV, books, albums, soundtracks, musicals
- [ ] Universal item page: title, type, rating, encounter count, encounter timeline, notes
- [ ] **Linked items panel** on item page: shows linked soundtracks/musicals/adaptations with a "have I encountered this? ✓ / not yet" indicator pulled from each linked item's encounter count. Surfaces the "I saw the show but never listened to the soundtrack" gap (and vice versa) without nagging — it's just visible when you look at the item.
- [ ] "Add link" UI on item page: pick another item, choose link_type
- [ ] Currently-watching panel (TV) with `S3E4/S3E10`
- [ ] Stats per type: films per year, theater vs home split, top directors, books per year, top authors, albums per year, top artists, soundtracks per year, musicals per year, theaters visited, **TV: average episodes per sitting per show, longest binge session, total hours per show**
- [ ] Cross-type stats: total encounters this year, rewatches/rereads/relistens count, companion analysis across all types
- [ ] **Aggregate consumption overview**: stacked bar or grouped chart by year (and all-time) showing counts per type — films watched, TV shows watched, **TV episodes watched** (sum of session lengths), books read, albums listened, soundtracks listened, musicals seen. High-level "what did my year of media look like" view, filterable to any date range.
- [ ] Media queue kanban with shuffle button per list
- [ ] **Music queue specifics**: paste a Spotify URL/URI when adding (parsed into `spotify_uri`), tap-through "Open in Spotify" button on each card, supports albums + individual songs + playlists
- [ ] Annual TV check-in modal

### Tests
- [ ] Importer on sample CSV per type (6 fixtures)
- [ ] Encounter count cache stays correct on add/delete/edit
- [ ] Episode progress (variable season lengths)
- [ ] TV session range validation (episode_end >= episode_start, within season's episode_count)
- [ ] "Average episodes per sitting" query against fixture data
- [ ] Discriminated union validation (rejects film fields on a book, etc.)
- [ ] Shuffle logic (uniform-ish distribution)
- [ ] Theater venue association on musical encounters
- [ ] `entertainment_item_links` bidirectional integrity: creating one link writes both rows; deleting removes both; querying from either item finds the other; inverse pair lookup table is exhaustive (every link_type has an inverse defined)
- [ ] Per-episode note CRUD + uniqueness on (show, season, episode)
- [ ] TV derived stats: episodes_watched, avg_episodes_per_sitting, most_episodes_in_a_day, latest_episode_watched (against fixture watch logs)
- [ ] **Rewatch isolation**: log S1E1–S1E10 normally, then a rewatch session of S1E3 — `latest_episode_watched` must still be S1E10, `episodes_watched` still 10, but `avg_episodes_per_sitting` includes the rewatch session
- [ ] Spotify URI parsing: accepts `https://open.spotify.com/album/...`, `spotify:album:...`, and rejects garbage
- [ ] Aggregate consumption query across all types for a given year

### Budget
- [ ] **Allocate a weekend per media type** for spreadsheet cleaning + import validation (or batch films+TV one weekend, books+music another)
- [ ] **Success:** 10y data imported across all 6 types, accurate per-season TV progress, encounter counts correct, shuffle works, queue→entry pipeline works, can log a rewatch in <15s, can see "every musical I saw at the Walter Kerr"

---

## Phase 5 — Finance: Net Worth Tracker

- [ ] Alembic 0006: `people` (shared with later phases), `finance_accounts`, `finance_snapshots`
- [ ] Account management (type, currency, owner FK to people)
- [ ] Monthly snapshot entry form
- [ ] Dashboard: NW over time, breakdown by type, growth rate
- [ ] Monthly staleness nudge
- [ ] Sheets sync
- [ ] Tests: snapshot CRUD, NW aggregation, per-account rollup
- [ ] **Success:** log this month's balances, NW chart renders, nudge fires when overdue

---

## Phase 6 — Finance: Wheel Strategy Tracker  *(most complex)*

**Prereq:** Phase 5 (`people`, `finance_accounts`).

### Schema (Alembic 0007)
- [ ] `share_positions` (ticker, account_id, shares, avg_cost_basis, current_price)
- [ ] `ticker_runs` (ticker, account_id, start_date, end_date NULLABLE)
- [ ] `wheel_positions` (account_id, ticker, type, strike, expiry, premium, outcome, open_date, close_date)
- [ ] `wheel_expiry_confirmations`
- [ ] `next_leg_queue`

### Backend
- [ ] Ticker management: onboard, stop, switch (with full history retention)
- [ ] Share position updater (cost basis recalc on buys)
- [ ] Position logger (open new leg)
- [ ] Expiry workflow: T-3 surface + confirmation + outcome record
- [ ] Next-leg queue populate-on-close
- [ ] **P&L engine** with all 4 dimensions: per ticker/account, per ticker/all accounts, per person, total
- [ ] Premium income aggregation (month/quarter/year)
- [ ] Sheets sync

### Frontend
- [ ] Ticker management UI
- [ ] Open positions table sorted by nearest expiry
- [ ] Expiring-this-week confirmation prompts
- [ ] Next-leg readiness queue
- [ ] Premium waterfall (Highcharts)
- [ ] Per-ticker P&L table
- [ ] Per-person rollup view
- [ ] Overall table view (see all metadata about each wheel being run, and the transactions in each leg)

### Tests *(critical — money is involved)*
- [ ] P&L rollup at every dimension, verified against spreadsheet known values
- [ ] Expiry confirmation flow (each outcome path)
- [ ] Ticker run start/stop/switch
- [ ] Cost basis recalc on multiple buys
- [ ] **Success:** onboard ticker → log position → confirm at expiry → next-leg queue populated → P&L matches spreadsheet exactly

---

## Phase 7 — Health Metrics + Period Data

### Schema (Alembic 0008)
- [ ] `health_snapshots` EAV: `(id, date, source, metric, value, raw_json)`
- [ ] **Dual indexes**: `(date, metric)` AND `(metric, date)` — non-negotiable

### Oura integration
- [ ] OAuth setup, token storage in `.env`, refresh handling
- [ ] APScheduler nightly job: pull previous day (sleep, HRV, rHR, readiness, stages)
- [ ] Upsert into `health_snapshots`
- [ ] Sync log table entry per run

### Apple Health importer
- [ ] CLI script with `lxml.iterparse` (streaming)
- [ ] Config file: which metrics to import
- [ ] Idempotent upsert (safe to re-run)
- [ ] Period data parsing (`HKCategoryTypeIdentifierMenstrualFlow`)
- [ ] Document the iPhone export procedure in `/docs`

### Frontend
- [ ] Per-metric trend lines
- [ ] Weekly summary view
- [ ] Period cycle calendar derived from EAV
- [ ] (Correlation with mood deferred to Phase 9)

### Tests
- [ ] Oura sync with mocked API
- [ ] Apple Health importer on sample XML fixture
- [ ] Period record parsing
- [ ] Idempotent re-import (no duplicates)
- [ ] **Success:** Oura syncs nightly, Apple Health import populates HRV/steps/period, cycle calendar renders

---

## Phase 8 — Dana OS Stateful Modules

### Schema (Alembic 0009)
- [ ] `tasks`, `projects`
- [ ] `reference_types`, `reference_records`, `reference_field_values`
- [ ] `list_definitions`, `list_columns`, `list_rows`
- [ ] `file_attachments`

### Backend
- [ ] Task CRUD + 'pick for me' filtered random select
- [ ] Reference type schema builder
- [ ] File upload endpoint → `/uploads` directory, path stored in DB
- [ ] List builder column type system (text/number/bool/select/date/person-link)
- [ ] Meta app tracker: pre-configured list instance seed migration
- [ ] **Update `backup.sh`** to include `/uploads`

### Frontend
- [ ] Task manager with project grouping
- [ ] 'Pick for me' modal
- [ ] Reference DB UI (medical, insurance, subscriptions, contacts)
- [ ] File upload + retrieval UI
- [ ] List builder UI (column definition + row CRUD)
- [ ] Meta app tracker page

### Tests
- [ ] File upload/retrieval round-trip
- [ ] List builder column type validation
- [ ] Task filter + random pick
- [ ] Reference record CRUD
- [ ] **Success:** upload prescription PDF to medical record, retrieve it, backup includes file

---

## Phase 9 — Mood & Energy Journal

- [ ] Alembic 0010: `mood_logs` (date, mood, energy, stress, social_battery, sleep_quality, custom_scales JSONB)
- [ ] Daily entry form (all optional, < 20s)
- [ ] Backfill calendar (reuses Phase 1 pattern)
- [ ] Dashboard: trend lines, weekly averages, anomalies
- [ ] **First cross-module correlation queries**: mood vs habits, mood vs period phase, mood vs climbing
- [ ] Tests: CRUD, backfill, cross-module join
- [ ] **Success:** log mood in <20s, 90-day chart with climbing overlay, period phase correlation visible

---

## Phase 10 — Social Tracker + Google Calendar

- [ ] Alembic 0011: `hangouts`, `hangout_people` (people table from Phase 5)
- [ ] People directory UI (relationship tag, per-person nudge interval)
- [ ] Hangout logging form (multi-select people)
- [ ] Google Calendar OAuth2 setup (one-time, 2–3 hour budget)
- [ ] Calendar event pull + social event auto-suggest
- [ ] Time audit: categorised hours per week
- [ ] Dashboard: last-seen list, frequency chart, calendar breakdown
- [ ] Per-person staleness nudges
- [ ] Tests: hangout CRUD, nudge logic, calendar parsing, last-seen calc
- [ ] **Success:** log hangout with multiple people, last-seen accurate, calendar suggests events, nudges fire

---

## Phase 11 — Spotify Tracker

- [ ] Alembic 0012: `spotify_streams`, `spotify_track_cache`, `spotify_artist_cache`
- [ ] One-time Extended Streaming History JSON importer
- [ ] Hourly APScheduler sync job (since-last-played, gap-free)
- [ ] (Optional) Last.fm scrobble belt-and-suspenders setup notes
- [ ] Dashboard: listening time by period, top artists/tracks/genres, time-of-day heatmap
- [ ] Custom Wrapped: any date range
- [ ] **Music queue auto-suggest closer**: scheduled job (daily) cross-references unconsumed `media_queue_items` of music type against the last 7 days of `spotify_streams`. Match rules: a queued album counts as listened if ≥N% of its tracks were played **in album context** (Spotify `context_uri` = the album itself, not a playlist or generated mix — confirms it was an active choice to play the album), or a queued song was played ≥M times. Thresholds N (default 80) and M (default 2) live in a `settings` table, editable via admin UI. Hits are surfaced on the home screen as "Looks like you listened to [X] — mark it consumed?" with confirm/dismiss/snooze actions. **Always suggests, never auto-marks.** Reuses the nudge engine from Phase 1 so dismiss/snooze works the same way as everything else.
- [ ] Tests: importer on sample JSON, hourly dedup, gap-free logic
- [ ] Music queue closer: queue an album, simulate stream rows covering 80% of its tracks, suggestion appears; user confirms, queue item marked consumed and entertainment encounter created
- [ ] **Success:** full history imported, hourly sync running, custom 90-day Wrapped works, queueing an album you then listen to surfaces a "mark consumed?" suggestion the next day

---

## Phase 12 — NLP Query Interface

- [ ] Schema description file (`docs/schema_for_nlp.md`) — update after every migration
- [ ] `/query` endpoint: NL → schema prompt → Claude API → SQL → read-only execute → answer
- [ ] SQL safety: must start with `SELECT`, enforced via `danaos_ro` user
- [ ] Frontend: persistent header query bar, answer card with optional Highcharts render
- [ ] Tests: mocked Claude API, SQL rejection, RO user cannot mutate, answer formatting
- [ ] **Success:** "how far am I in Breaking Bad" → "S4E8, last watched 3 days ago"

---

## Phase 13 — Digest & Wrapped Engines

- [ ] Generic digest engine: date-range query suite per module
- [ ] Structured report renderer with empty-section collapse
- [ ] APScheduler weekly/monthly jobs
- [ ] On-demand custom date range endpoint
- [ ] Dashboard preview strip: daily/weekly/monthly
- [ ] Wrapped slideshow builder (exportable static HTML)
- [ ] Tests: per-module digest, edge dates, empty handling
- [ ] **Success:** Sunday weekly digest auto-generates, custom "summer 2024" digest works, annual Wrapped plays

---

## Phase 14 — Correlation Explorer

- [ ] Metric picker (any column from any date-keyed table, friendly names)
- [ ] Date-axis join query with null-day handling
- [ ] Highcharts dual-axis line + scatter
- [ ] Pearson correlation coefficient calc + display
- [ ] Tests: multi-module join, nulls, coefficient math
- [ ] **Success:** mood × climbing-per-week dual-axis chart, HRV × stress scatter

---

## Phase 15 — Polish, Mobile UX & Dream Logger

- [ ] Mobile responsiveness pass on every entry form (large tap targets, thumb zones)
- [ ] Service worker offline entry caching (habits first, sync on reconnect)
- [ ] Universal search across all modules
- [ ] 'On this day' page
- [ ] CSV export per module
- [ ] Performance audit: `EXPLAIN ANALYZE` on any query >100ms, add indexes / matviews
- [ ] **Dream logger**: Alembic migration, voice entry via Web Speech API, full-screen mobile layout, PWA shortcut
- [ ] Tests: offline sync, universal search, dream CRUD
- [ ] **Success:** every form one-handed-friendly, habit check-in offline, Japan search hits all modules, dream logger reachable in <5s from home screen

---

## Cross-cutting reminders (revisit each phase)

- [ ] Every new tracking table has `date DATE NOT NULL` + `(date, ...)` composite index
- [ ] Every new router has a matching `tests/test_<module>.py`
- [ ] Update `docs/schema_for_nlp.md` after every migration
- [ ] Update `backup.sh` if you add a new on-disk artifact
- [ ] Never write to formula cells in Sheets sync
- [ ] **No silent state changes** — every "mark done" / "consume" / "close" / "assign" action requires explicit user confirmation in the UI
- [ ] At every pause: the app should be a tool you actively use today