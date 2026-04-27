"""One-time backfill: read historical data from Google Sheets → app via API.

Usage (from repo root, with docker compose running):
    docker compose exec backend python scripts/backfill_from_sheet.py

Env vars used (same as the app — already set in .env):
    GOOGLE_SHEETS_CREDENTIALS_PATH
    HABITS_SHEET_ID
    HABITS_SHEET_TAB          (e.g. "2026" — update this each January)

Behaviour:
    - Reads every row from the configured sheet tab
    - For each habit that has sheet_col set, parses the value
    - POSTs to /habits/{id}/logs/backfill (upsert — safe to re-run)
    - Skips blank cells, FALSE checkboxes, and future dates
"""

import json
import sys
import urllib.error
import urllib.request
from datetime import date, datetime
from pathlib import Path
from typing import Any

import gspread
from google.oauth2.service_account import Credentials

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import get_settings

API_BASE = "http://localhost:8000"


def _col_letter_to_idx(col: str) -> int:
    """Convert column letter(s) to 0-based index: A→0, B→1, AA→26."""
    result = 0
    for ch in col.upper():
        result = result * 26 + (ord(ch) - ord("A") + 1)
    return result - 1


def _parse_sheet_date(label: str, year: int) -> date | None:
    """'Monday, Apr 21' → date(year, 4, 21). Returns None for non-date rows."""
    label = label.strip()
    if not label:
        return None
    try:
        return datetime.strptime(f"{label} {year}", "%A, %b %d %Y").date()
    except ValueError:
        return None


def main() -> None:
    cfg = get_settings()

    sheet_id = cfg.habits_sheet_id
    creds_path = cfg.google_sheets_credentials_path

    if not sheet_id:
        print("ERROR: HABITS_SHEET_ID not set in .env")
        sys.exit(1)
    if not creds_path:
        print("ERROR: GOOGLE_SHEETS_CREDENTIALS_PATH not set in .env")
        sys.exit(1)

    year = int(cfg.habits_sheet_tab)
    today = date.today()

    # ── Connect to Sheets ────────────────────────────────────────────────────
    scopes = [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
        "https://www.googleapis.com/auth/drive.readonly",
    ]
    creds = Credentials.from_service_account_file(creds_path, scopes=scopes)
    gc = gspread.Client(auth=creds)
    ws = gc.open_by_key(sheet_id).worksheet(cfg.habits_sheet_tab)

    print(f"Reading sheet tab '{cfg.habits_sheet_tab}'…")
    rows: list[list[str]] = ws.get_all_values()
    print(f"  {len(rows)} rows found")

    # ── Fetch habit definitions ──────────────────────────────────────────────
    with urllib.request.urlopen(f"{API_BASE}/habits") as r:
        habits = [h for h in json.loads(r.read()) if h.get("period_config", {}).get("sheet_col")]
    print(f"  {len(habits)} habits with sheet_col configured")

    if not habits:
        print("Nothing to do — no habits have sheet_col set.")
        return

    # ── Parse sheet rows into per-habit entry lists ──────────────────────────
    entries_by_habit: dict[str, list[dict[str, Any]]] = {h["id"]: [] for h in habits}

    for row in rows:
        if not row:
            continue
        d = _parse_sheet_date(row[0], year)
        if d is None or d > today:
            continue

        for habit in habits:
            cfg_h = habit["period_config"]
            idx = _col_letter_to_idx(cfg_h["sheet_col"])
            if idx >= len(row):
                continue
            raw = row[idx].strip()
            if not raw:
                continue

            sheet_type = cfg_h.get("sheet_type", "numeric")
            if sheet_type == "checkbox":
                if raw.upper() == "TRUE":
                    value = 1.0
                else:
                    continue  # FALSE = not logged
                entries_by_habit[habit["id"]].append({"date": d.isoformat(), "value": value})
            elif sheet_type == "numeric":
                try:
                    value = float(raw.replace(",", ""))
                except ValueError:
                    continue
                if value <= 0:
                    continue  # API requires gt=0
                entries_by_habit[habit["id"]].append({"date": d.isoformat(), "value": value})
            elif sheet_type == "text":
                if raw:
                    entries_by_habit[habit["id"]].append(
                        {"date": d.isoformat(), "value": 1.0, "notes": raw}
                    )

    # ── POST to backfill endpoint ────────────────────────────────────────────
    total = 0
    for habit in habits:
        entries = entries_by_habit[habit["id"]]
        if not entries:
            print(f"  {habit['name']}: (no data)")
            continue

        req = urllib.request.Request(
            f"{API_BASE}/habits/{habit['id']}/logs/backfill",
            data=json.dumps(entries).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                created = len(json.loads(r.read()))
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f"  {habit['name']}: HTTP {e.code} — {body}")
            continue
        skipped = len(entries) - created
        print(f"  {habit['name']}: {created} created, {skipped} skipped (already existed)")
        total += created

    print(f"\nDone — {total} log entries created total.")


if __name__ == "__main__":
    main()
