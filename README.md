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

## Setup
```
# required deps
brew install --cask docker
brew install node
brew install python@3.12
curl -LsSf https://astral.sh/uv/install.sh | sh

# running this should succeed
docker --version && node --version && python3.12 --version && uv --version
```

## How to Run/Use

### First-time setup
1. Clone this repo and `cd` into it.
2. Copy the env template and leave the defaults (they're local-only placeholders):
   ```
   cp .env.example .env
   ```
3. Make sure Docker Desktop is running (the whale icon in the menu bar). First launch only: `open -a Docker` and wait ~15s for the daemon.

### Start Postgres
```
docker compose up -d
```
This starts a single `postgres:16` container named `dana_os_postgres` on `localhost:5432`. On first boot (empty data volume) it runs [backend/sql/init.sql](backend/sql/init.sql), which:
- creates two application users — `dana_os_app` (read/write, used by the backend) and `dana_os_ro` (read-only, used by the Phase 12 NLP query path)
- creates two databases — `dana_os` (main) and `dana_os_test` (pytest fixture target)
- enables the `uuid-ossp` and `pg_trgm` extensions in both

The container has `restart: unless-stopped`, so **run `up -d` once and leave it** — it'll survive laptop reboots and come back automatically. You don't need to shut it down at the end of the day.

Check status / tail logs:
```
docker compose ps
docker compose logs -f postgres
```

**Stop vs wipe:**
- `docker compose down` — stops and removes the container. **Data is preserved** in the named volume. Next `up` resumes with everything intact; `init.sql` does NOT re-run.
- `docker compose down -v` — stops the container **AND deletes the volume**. All data is gone. Next `up` is a cold boot that re-runs `init.sql`. Only use this when you *want* a clean slate (e.g. you edited `init.sql` and need it re-applied).

### Interact with the database
Pick whichever is most convenient:

**psql inside the container** — no host install needed:
```
docker exec -it dana_os_postgres psql -U dana_os_app -d dana_os
```

**psql from the host** — if you'd rather have history + tab completion:
```
brew install libpq && brew link --force libpq
psql "postgresql://dana_os_app:localdev_app@localhost:5432/dana_os"
```

Swap `dana_os_app` for `dana_os_ro` to poke at the read-only boundary, or `dana_os_test` for the test database. Useful commands once you're at the `dana_os=>` prompt:
```
\l                            -- list databases
\du                           -- list users/roles
\dx                           -- list installed extensions
\dn                           -- list schemas
\dt                           -- list tables (empty until PR 2 adds Alembic)
SELECT version();
SELECT uuid_generate_v4();            -- sanity-check uuid-ossp
SELECT 'hello world' % 'helo wrld';   -- sanity-check pg_trgm
\q                            -- quit
```

### What's next
Backend (FastAPI) and frontend (Vite/React) services are added to `docker-compose.yml` in follow-up PRs — see [DANA_OS_TRACKER.md](DANA_OS_TRACKER.md).