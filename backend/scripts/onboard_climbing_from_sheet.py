"""Onboard climbing sessions from Google Sheets into the dana-os API.

Sheet layout (your existing columns):
    B — session # (formula, ignored)
    C — date
    D — days since last (formula, ignored)
    E — gym name
    F — duration (HH:mm:ss)
    G — companions (comma-separated)
    H — notes

Usage (from repo root, with docker compose running):
    uv run python backend/scripts/onboard_climbing_from_sheet.py           # dry-run
    uv run python backend/scripts/onboard_climbing_from_sheet.py --commit  # write to DB

The script reads from row 2 onward (skipping row 1 assumed to be a header).
Rows with no date in column C are skipped. Sessions whose date already exists
in the DB are skipped so it is safe to re-run.
"""

import argparse
import json
import sys
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path

import gspread
from google.oauth2.service_account import Credentials

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import get_settings

API_BASE = "http://localhost:8000"

# Column indices, 0-based (A=0, B=1, C=2, …)
COL_DATE = 2  # C
COL_GYM = 4  # E
COL_DURATION = 5  # F
COL_COMPANIONS = 6  # G
COL_NOTES = 7  # H


# ── Parsing helpers ────────────────────────────────────────────────────────────


def parse_date(raw: str) -> date | None:
    raw = raw.strip()
    if not raw:
        return None
    # Try formats most-likely-first
    fmts = [
        "%Y-%m-%d",  # 2026-05-01  (written by the app)
        "%m/%d/%Y",  # 5/1/2026
        "%m/%d/%y",  # 5/1/26
        "%B %d, %Y",  # May 01, 2026
        "%b %d, %Y",  # May 1, 2026
        "%A, %B %d",  # Friday, May 01  (no year)
        "%A, %b %d",  # Fri, May 01     (no year)
    ]
    for fmt in fmts:
        try:
            d = datetime.strptime(raw, fmt)
            if d.year == 1900:
                # Format had no year — use current year, or previous if future
                now = datetime.now()
                d = d.replace(year=now.year)
                if d.date() > now.date():
                    d = d.replace(year=now.year - 1)
            return d.date()
        except ValueError:
            continue
    return None


def parse_duration_minutes(raw: str) -> int | None:
    """Convert HH:mm:ss or H:mm:ss to total minutes (seconds ignored)."""
    raw = raw.strip()
    if not raw:
        return None
    parts = raw.split(":")
    try:
        if len(parts) >= 2:
            h, m = int(parts[0]), int(parts[1])
            return h * 60 + m
    except ValueError:
        pass
    return None


def parse_companions(raw: str) -> list[str] | None:
    raw = raw.strip()
    if not raw:
        return None
    items = [c.strip() for c in raw.split(",") if c.strip()]
    return items or None


# ── API helpers ────────────────────────────────────────────────────────────────


def _api_get(path: str) -> object:
    with urllib.request.urlopen(f"{API_BASE}{path}") as resp:
        return json.loads(resp.read())


def _api_post(path: str, payload: dict) -> tuple[int, dict]:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{API_BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def get_gyms() -> dict[str, str]:
    """Return {name_lower: id}."""
    gyms = _api_get("/climbing/gyms")
    return {g["name"].lower(): g["id"] for g in gyms}  # type: ignore[union-attr]


def get_existing_dates() -> set[str]:
    sessions = _api_get("/climbing/sessions")
    return {s["date"] for s in sessions}  # type: ignore[union-attr]


# ── Main ───────────────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--commit", action="store_true", help="Write sessions to DB (default: dry-run)"
    )
    args = parser.parse_args()
    dry_run = not args.commit

    s = get_settings()
    # Inside Docker the path is /secrets/...; locally it may not exist.
    # Fall back to the repo-relative path so the script works outside the container.
    creds_path = Path(s.google_sheets_credentials_path)
    if not creds_path.exists():
        local_fallback = Path(__file__).parents[2] / "secrets" / creds_path.name
        if local_fallback.exists():
            creds_path = local_fallback
        else:
            print(f"ERROR: credentials file not found at {creds_path} or {local_fallback}")
            sys.exit(1)
    sheet_id = s.climbing_sheet_id
    sheet_tab = s.climbing_sheet_tab

    if not sheet_id:
        print("ERROR: CLIMBING_SHEET_ID is not set in .env")
        sys.exit(1)

    print(f"Sheet:  {sheet_id}")
    print(f"Tab:    {sheet_tab}")
    print(f"Mode:   {'DRY RUN — pass --commit to write' if dry_run else '*** COMMIT ***'}")
    print()

    # Open sheet
    scopes = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    creds = Credentials.from_service_account_file(str(creds_path), scopes=scopes)
    gc = gspread.authorize(creds)
    ws = gc.open_by_key(sheet_id).worksheet(sheet_tab)
    rows = ws.get_all_values()
    print(f"Sheet rows read: {len(rows)}")

    gyms = get_gyms()
    existing_dates = get_existing_dates()
    print(f"Gyms in app:     {', '.join(gyms) or '(none)'}")
    print(f"Sessions in DB:  {len(existing_dates)}")
    print()

    to_import: list[dict] = []
    skipped_existing = 0
    warnings: list[str] = []

    for i, row in enumerate(rows[1:], start=2):  # skip row 1 (header)
        row = list(row) + [""] * (COL_NOTES + 1 - len(row))  # pad short rows

        raw_date = row[COL_DATE].strip()
        if not raw_date:
            continue

        parsed = parse_date(raw_date)
        if parsed is None:
            warnings.append(f"Row {i}: unrecognised date {raw_date!r} — skipped")
            continue

        date_iso = parsed.isoformat()
        if date_iso in existing_dates:
            skipped_existing += 1
            continue

        raw_gym = row[COL_GYM].strip()
        gym_id: str | None = None
        if raw_gym:
            gym_id = gyms.get(raw_gym.lower())
            if gym_id is None:
                warnings.append(
                    f"Row {i} ({date_iso}): gym {raw_gym!r} not found in app — gym_id left blank"
                )

        duration = parse_duration_minutes(row[COL_DURATION])
        companions = parse_companions(row[COL_COMPANIONS])
        notes = row[COL_NOTES].strip() or None

        to_import.append(
            {
                "_row": i,
                "date": date_iso,
                "_gym_name": raw_gym or "—",
                "gym_id": gym_id,
                "duration_minutes": duration,
                "companions": companions,
                "notes": notes,
            }
        )

    # ── Diagnostics ───────────────────────────────────────────────────────────
    print(f"Already in DB (skip): {skipped_existing}")
    print(f"To import:            {len(to_import)}")
    print()

    if to_import:
        header = f"{'Row':<5}  {'Date':<12}  {'Gym':<20}  {'Min':>5}  {'Companions':<22}  Notes"
        print(header)
        print("─" * len(header))
        for s in to_import:
            companions_str = ", ".join(s["companions"]) if s["companions"] else "—"
            notes_str = (
                ((s["notes"] or "")[:28] + "…")
                if len(s["notes"] or "") > 28
                else (s["notes"] or "—")
            )
            gym_str = s["_gym_name"][:18] + ("…" if len(s["_gym_name"]) > 18 else "")
            dur_str = str(s["duration_minutes"]) if s["duration_minutes"] is not None else "—"
            print(
                f"{s['_row']:<5}  {s['date']:<12}  {gym_str:<20}  {dur_str:>5}  {companions_str:<22}  {notes_str}"
            )

    if warnings:
        print()
        print("Warnings:")
        for w in warnings:
            print(f"  ! {w}")

    if dry_run or not to_import:
        if not to_import:
            print("Nothing to import.")
        else:
            print()
            print("Dry run complete — rerun with --commit to write.")
        return

    # ── Commit ────────────────────────────────────────────────────────────────
    print()
    created = errors = 0
    for entry in to_import:
        payload = {k: v for k, v in entry.items() if not k.startswith("_") and v is not None}
        status, body = _api_post("/climbing/sessions", payload)
        if status == 201:
            created += 1
            print(f"  ✓  {entry['date']}")
        else:
            errors += 1
            detail = body.get("detail", body) if isinstance(body, dict) else body
            print(f"  ✗  {entry['date']}: HTTP {status} — {detail}")

    print()
    print(f"Done: {created} created, {errors} errors.")


if __name__ == "__main__":
    main()
