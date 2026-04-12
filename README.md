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

### 3. Start Postgres
```
docker compose up -d
```
Starts `postgres:16` on `localhost:5432` and runs [backend/sql/init.sql](backend/sql/init.sql) on first boot to provision users (`dana_os_app`, `dana_os_ro`), databases (`dana_os`, `dana_os_test`), and extensions (`uuid-ossp`, `pg_trgm`). With `restart: unless-stopped`, **run this once and leave it** — the container survives reboots.

- `docker compose down` — stop container, **keep data**.
- `docker compose down -v` — stop container **and wipe the volume** (re-runs `init.sql` on next `up`). Only use when you want a clean slate. All data is done.

### 4. Run the backend
```
cd backend
uv sync                       # installs deps into .venv
uv run alembic upgrade head   # apply migrations
uv run uvicorn app.main:app --reload
```
Then `curl http://localhost:8000/health` should return `{"status":"ok","database":"ok",...}`.

### 5. Run tests
```
cd backend
uv run pytest                 # needs postgres running (step 3)
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
