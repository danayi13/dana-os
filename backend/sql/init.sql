-- Dana OS — Postgres bootstrap
--
-- This script runs automatically the first time the postgres container starts
-- against an empty data volume. The official postgres image executes any
-- *.sql / *.sh files mounted into /docker-entrypoint-initdb.d/ as the
-- superuser defined by POSTGRES_USER, against the default database defined
-- by POSTGRES_DB (which postgres creates for us *before* this script runs).
--
-- Idempotency note: this script is NOT idempotent by design. The postgres
-- image only runs init scripts when the data volume is empty, so re-running
-- is never expected. To re-bootstrap during development:
--     docker compose down -v && docker compose up -d
--
-- Passwords are injected from container env vars via psql's \getenv
-- (Postgres 14+). Those vars come from docker-compose.yml → .env.

\getenv app_password DANA_OS_APP_PASSWORD
\getenv ro_password  DANA_OS_RO_PASSWORD

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
-- dana_os_app: read/write application user. The FastAPI backend uses this.
-- dana_os_ro:  read-only user. The Phase 12 NLP query interface uses this
--              so LLM-generated SQL cannot mutate data.

CREATE USER dana_os_app WITH PASSWORD :'app_password';
CREATE USER dana_os_ro  WITH PASSWORD :'ro_password';

-- ---------------------------------------------------------------------------
-- Databases
-- ---------------------------------------------------------------------------
-- `dana_os` is created by the postgres image from POSTGRES_DB before this
-- script runs, so we only need to create the test database here.

CREATE DATABASE dana_os_test OWNER dana_os_app;

-- ---------------------------------------------------------------------------
-- Per-database setup: extensions, ownership, grants, default privileges
-- ---------------------------------------------------------------------------
-- Repeated for both dana_os and dana_os_test so tests mirror prod schema.

\c dana_os

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Hand the public schema to the app user so Alembic migrations (run as
-- dana_os_app) can create tables without needing superuser rights.
ALTER SCHEMA public OWNER TO dana_os_app;
GRANT USAGE ON SCHEMA public TO dana_os_ro;

-- Existing objects (none yet, but harmless) + future objects created by
-- dana_os_app get SELECT granted to dana_os_ro automatically.
GRANT SELECT ON ALL TABLES    IN SCHEMA public TO dana_os_ro;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO dana_os_ro;

ALTER DEFAULT PRIVILEGES FOR ROLE dana_os_app IN SCHEMA public
    GRANT SELECT ON TABLES    TO dana_os_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE dana_os_app IN SCHEMA public
    GRANT SELECT ON SEQUENCES TO dana_os_ro;

\c dana_os_test

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

ALTER SCHEMA public OWNER TO dana_os_app;
GRANT USAGE ON SCHEMA public TO dana_os_ro;

GRANT SELECT ON ALL TABLES    IN SCHEMA public TO dana_os_ro;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO dana_os_ro;

ALTER DEFAULT PRIVILEGES FOR ROLE dana_os_app IN SCHEMA public
    GRANT SELECT ON TABLES    TO dana_os_ro;
ALTER DEFAULT PRIVILEGES FOR ROLE dana_os_app IN SCHEMA public
    GRANT SELECT ON SEQUENCES TO dana_os_ro;
