#!/usr/bin/env python3
"""Import vocal lesson history from Google Sheets into the dana-os database.

Usage (from the repo root):
    uv run --directory backend python ../scripts/import_vocal_lessons.py
    uv run --directory backend python ../scripts/import_vocal_lessons.py --dry-run

Column layout assumed: A=date, B=repertoire (comma-separated songs), C=notes
Rows where column A is empty or unparseable are skipped with a warning.

Set HEADER_ROWS = 1 if row 1 is a header; set to 0 if data starts at row 1.
"""

import argparse
import sys
from datetime import date
from pathlib import Path

# ---------------------------------------------------------------------------
# Config — edit SHEET_TAB to match the label at the bottom of your sheet
# ---------------------------------------------------------------------------
SHEET_TAB = "Voice"
HEADER_ROWS = 1  # rows to skip at the top (set 0 if no header row)

_REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_REPO_ROOT / "backend"))

from app.config import get_settings  # noqa: E402 (sys.path must be set first)
from app.db import engine  # noqa: E402
from app.models.vocal import VocalLesson  # noqa: E402

import gspread  # noqa: E402
from google.oauth2.service_account import Credentials  # noqa: E402
from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

# ---------------------------------------------------------------------------
# Date parsing — tries common Google Sheets date display formats
# ---------------------------------------------------------------------------
_DATE_FORMATS = [
    "%Y-%m-%d",  # 2026-04-27  (ISO)
    "%m/%d/%Y",  # 04/27/2026  (US)
    "%-m/%-d/%Y",  # 4/27/2026   (US no-pad, Unix only)
    "%d/%m/%Y",  # 27/04/2026  (EU)
    "%B %d, %Y",  # April 27, 2026
    "%b %d, %Y",  # Apr 27, 2026
    "%b. %d, %Y",  # Apr. 27, 2026
    "%A, %B %d, %Y",  # Monday, April 27, 2026
    "%A, %b %d, %Y",  # Monday, Apr 27, 2026
    "%d-%b-%Y",  # 27-Apr-2026
    "%d %b %Y",  # 27 Apr 2026
    "%d %B %Y",  # 27 April 2026
]


def _parse_date(raw: str) -> date | None:
    raw = raw.strip()
    for fmt in _DATE_FORMATS:
        try:
            return (
                date.fromisoformat(raw)
                if fmt == "%Y-%m-%d"
                else __import__("datetime").datetime.strptime(raw, fmt).date()
            )
        except (ValueError, TypeError):
            continue
    return None


def _parse_repertoire(raw: str) -> list[str]:
    if not raw.strip():
        return []
    return [p.strip() for p in raw.split(",") if p.strip()]


def _open_worksheet(settings: object) -> gspread.Worksheet:
    creds_path = getattr(settings, "google_sheets_credentials_path", None)
    sheet_id = getattr(settings, "vocal_sheet_id", None)

    if not creds_path or not sheet_id:
        sys.exit(
            "ERROR: GOOGLE_SHEETS_CREDENTIALS_PATH and VOCAL_SHEET_ID must be set in .env"
        )

    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
    ]
    creds = Credentials.from_service_account_file(creds_path, scopes=scopes)  # type: ignore[misc]
    gc = gspread.authorize(creds)
    sh = gc.open_by_key(sheet_id)
    return sh.worksheet(SHEET_TAB)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="Parse and print without writing to DB"
    )
    args = parser.parse_args()

    settings = get_settings()
    print(f"Opening sheet '{SHEET_TAB}' …")
    ws = _open_worksheet(settings)

    all_rows: list[list[str]] = ws.get_all_values()
    data_rows = all_rows[HEADER_ROWS:]
    print(f"Found {len(data_rows)} data rows (skipped {HEADER_ROWS} header rows)")

    parsed: list[tuple[date, list[str], str | None]] = []
    skipped = 0
    for i, row in enumerate(data_rows, start=HEADER_ROWS + 1):
        raw_date = row[0] if len(row) > 0 else ""
        raw_songs = row[1] if len(row) > 1 else ""
        raw_notes = row[2] if len(row) > 2 else ""

        if not raw_date.strip():
            continue  # blank row

        lesson_date = _parse_date(raw_date)
        if lesson_date is None:
            print(f"  WARN row {i}: could not parse date {raw_date!r} — skipped")
            skipped += 1
            continue

        repertoire = _parse_repertoire(raw_songs)
        notes = raw_notes.strip() or None
        parsed.append((lesson_date, repertoire, notes))

    print(f"Parsed {len(parsed)} lessons ({skipped} skipped)")

    if args.dry_run:
        print("\nDry-run — no DB writes. Sample rows:")
        for d, rep, notes in parsed[:5]:
            print(f"  {d}  |  {rep}  |  {notes!r}")
        return

    # Upsert into DB — bypass sheets sync entirely (direct SQLAlchemy)
    created = updated = 0
    with Session(engine) as db:
        for lesson_date, repertoire, notes in parsed:
            existing = (
                db.execute(select(VocalLesson).where(VocalLesson.date == lesson_date))
                .scalars()
                .first()
            )

            if existing:
                existing.repertoire = repertoire or None
                existing.reflection = notes
                updated += 1
            else:
                db.add(
                    VocalLesson(
                        date=lesson_date,
                        repertoire=repertoire or None,
                        reflection=notes,
                    )
                )
                created += 1

        db.commit()

    print(f"\nDone: {created} created, {updated} updated.")
    print("Existing rows in the sheet were not modified.")


if __name__ == "__main__":
    main()
