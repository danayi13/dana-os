# dana-os
personalized centralized life management/tracking/storage (running on Mac)

## Motivation
I love tracking/visualizing/analyzing data, and in general being a very organized person. There is no one-stop-shop that solves every use case I have, so my workflows are scattered across apps. The goal is to create one application I can use to replace everything. For example, here are some products I currently use:
- Google Calendar
- Google Sheets (a lot of them)
- Apple Notes
- Google Drive
- Google Tasks
- Trello
- and more...

## Setup / Usage

### 1. Install prerequisites (one-time)
```
brew install --cask docker
brew install node
brew install python@3.12
curl -LsSf https://astral.sh/uv/install.sh | sh

docker --version && node --version && python3.12 --version && uv --version
```

### 2. Clone and seed env
```
git clone https://github.com/danayi13/dana-os.git && cd dana-os
cp .env.example .env          # defaults are fine for local dev
```
Then launch Docker Desktop (`open -a Docker`) if it isn't already running.

### 3. Start all services
```
docker compose up -d
```
Starts three containers: `postgres:16`, the FastAPI backend, and the Vite frontend.

- **Postgres** (`localhost:5432`) — runs [backend/sql/init.sql](backend/sql/init.sql) on first boot to provision users (`dana_os_app`, `dana_os_ro`), databases (`dana_os`, `dana_os_test`), and extensions (`uuid-ossp`, `pg_trgm`).
- **API** (`localhost:8000`) — runs `uvicorn --reload`; runs `alembic upgrade head` before starting. Source is bind-mounted so code changes hot-reload without rebuilding.
- **Web** (`localhost:5173`) — runs `vite dev`; source is bind-mounted for the same reason.

With `restart: unless-stopped`, **run this once and leave it** — all three containers survive reboots.

```
docker compose down          # stop all containers, keep data
docker compose down -v       # stop all containers and wipe volumes (re-runs init.sql on next up)
docker compose build         # rebuild images (needed after adding a new Python/npm dependency)
```

<details>
<summary>Run without Docker (alternative)</summary>

```bash
# Backend
cd backend
uv sync                       # installs deps into .venv
uv run alembic upgrade head   # apply migrations
uv run uvicorn app.main:app --reload

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```
Postgres must still be running (step 3 postgres-only, or a host install).
</details>

### 4. Install the daily backup (one-time)
```bash
# From repo root:
sed -e "s|__REPO_ROOT__|$(pwd)|g" -e "s|__HOME__|$HOME|g" \
  infra/com.danaos.backup.plist \
  > ~/Library/LaunchAgents/com.danaos.backup.plist
launchctl load ~/Library/LaunchAgents/com.danaos.backup.plist
```
Runs `scripts/backup.sh` daily at 02:00. Backups land in `~/Documents/dana-os-backups/` as `dana_os_YYYY-MM-DD_HH-MM.dump.gz`. Kept for 30 days.

```bash
launchctl start com.danaos.backup   # run immediately to test
```

**Restore** a backup:
```bash
gunzip -c ~/Documents/dana-os-backups/dana_os_YYYY-MM-DD_HH-MM.dump.gz \
  | docker exec -i dana_os_postgres psql -U postgres -d dana_os
```

### 5. Run tests
```
# Backend (needs postgres running — step 3)
cd backend && uv run pytest

# Frontend
cd frontend && npm run test:run
```

### 6. Install the pre-commit hook (one-time per clone)
```
uv tool install pre-commit
pre-commit install            # from repo root
```
After this, every `git commit` runs ruff + hygiene hooks against staged files. CI runs the same checks on every push/PR.

### Interacting with the database
**psql inside the container** — no host install needed:
```
docker exec -it dana_os_postgres psql -U dana_os_app -d dana_os
```

**psql from the host** — if you'd rather have history + tab completion:
```
brew install libpq && brew link --force libpq
psql "postgresql://dana_os_app:localdev_app@localhost:5432/dana_os"
```

Swap `dana_os_app` for `dana_os_ro` to poke at the read-only boundary, or `dana_os_test` for the test database. Useful commands at the `dana_os=>` prompt:
```
\l                            -- list databases
\du                           -- list users/roles
\dx                           -- list installed extensions
\dn                           -- list schemas
\dt                           -- list tables
SELECT version();
SELECT uuid_generate_v4();            -- sanity-check uuid-ossp
SELECT 'hello world' % 'helo wrld';   -- sanity-check pg_trgm
\q                            -- quit
```

## Features done
_A running log of what's actually usable. Roadmap lives in [DANA_OS_TRACKER.md](DANA_OS_TRACKER.md)._

- **Phase 0 — foundation** (in progress)
  - Postgres 16 via docker compose, with `dana_os` / `dana_os_test` databases and `dana_os_app` / `dana_os_ro` users provisioned on first boot
  - FastAPI backend scaffold with `/health` endpoint, CORS for `localhost:5173`, uniform JSON error envelope
  - SQLAlchemy 2.x engines (read/write + read-only) driven by pydantic-settings from `.env`
  - Alembic migrations with empty `0001_baseline`
  - pytest suite: `/health` smoke test + integration tests pinning the postgres read-only permission boundary
  - Ruff lint/format enforced via pre-commit hook and GitHub Actions CI
  - Vite 8 + React 19 + TypeScript 6 frontend scaffold at `localhost:5173` — sidebar nav for all 15 phases, header with ⌘K trigger, dark/light theme toggle
  - TanStack Query + typed `apiClient` wrapper, React Router 7 with stub routes for every planned module
  - PWA-ready: `vite-plugin-pwa` manifest + service worker wired up
  - Vitest + React Testing Library with smoke tests + command palette tests; frontend CI via GitHub Actions
  - **⌘K command palette** — press `Cmd+K` (or `Ctrl+K`) anywhere to fuzzy-search and navigate to any page; commands in `frontend/src/commands/navigation.ts` with keyword hints for future phases
  - **Docker multi-service compose** — `docker compose up -d` starts all three services (`postgres`, `api`, `web`) with hot-reload bind mounts and `restart: unless-stopped`
  - **Daily backup** — `scripts/backup.sh` dumps postgres + archives `uploads/`, gzipped with 30-day retention in `~/Documents/dana-os-backups/`; scheduled via `infra/com.danaos.backup.plist` at 02:00
