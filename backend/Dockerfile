FROM python:3.12-slim

WORKDIR /app

RUN pip install uv --no-cache-dir

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY . .

# Run migrations then start the dev server with hot reload.
# Volume mount at /app keeps host changes in sync; /app/.venv is an
# anonymous volume so the container-built venv isn't overwritten by the mount.
CMD ["sh", "-c", "uv run alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
