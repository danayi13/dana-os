"""Google Sheets sync adapter.

Writes scalar values back to a spreadsheet while skipping formula cells,
so that existing sheet formulas remain intact. Degrades gracefully when
credentials are not configured.

period_config convention for habits:
  {"sheet_col": "B", "sheet_type": "checkbox|numeric|text"}
  sheet_type defaults to "numeric" if absent.
"""

import logging
from datetime import date
from pathlib import Path
from typing import Any

import gspread
from google.oauth2.service_account import Credentials
from gspread.cell import Cell
from gspread.utils import ValueInputOption, ValueRenderOption

logger = logging.getLogger(__name__)


def _format_sheet_date(d: date) -> str:
    """Format date to match the Sheets display value: 'Monday, Apr 21'."""
    return d.strftime("%A, %b") + f" {d.day}"


def _col_letter_to_int(col: str) -> int:
    """Convert column letter(s) to 1-based int: A→1, B→2, AA→27."""
    result = 0
    for ch in col.upper():
        result = result * 26 + (ord(ch) - ord("A") + 1)
    return result


class SheetsSync:
    """Write-back adapter for a single Google Sheet.

    Pass `credentials_path=None` or a non-existent path to create a no-op
    instance — all write calls become silent no-ops. This lets the rest of
    the app call sync methods unconditionally without guarding every call
    site.
    """

    def __init__(self, credentials_path: str | None, sheet_id: str | None) -> None:
        self._enabled = False
        self._sheet_id = sheet_id

        if not credentials_path or not sheet_id:
            logger.warning("SheetsSync: credentials_path or sheet_id not set — sync disabled")
            return

        creds_file = Path(credentials_path)
        if not creds_file.exists():
            logger.warning("SheetsSync: credentials file %s not found — sync disabled", creds_file)
            return

        try:
            scopes = [
                "https://www.googleapis.com/auth/spreadsheets",
                "https://www.googleapis.com/auth/drive.readonly",
            ]
            creds = Credentials.from_service_account_file(str(creds_file), scopes=scopes)  # type: ignore[misc]
            self._gc = gspread.authorize(creds)
            self._enabled = True
            logger.info("SheetsSync: connected to sheet %s", sheet_id)
        except Exception as exc:
            logger.warning("SheetsSync: init failed (%s) — sync disabled", exc)

    @property
    def enabled(self) -> bool:
        return self._enabled

    def _write_to_ws(self, ws: Any, updates: list[tuple[int, int, Any]]) -> None:
        """Write (row, col, value) triples to an open worksheet, skipping formula cells."""
        formulas = ws.get_all_values(value_render_option=ValueRenderOption.formula)

        safe: list[tuple[int, int, Any]] = []
        for row, col, value in updates:
            try:
                cell_formula = formulas[row - 1][col - 1]  # type: ignore[index]
            except IndexError:
                cell_formula = ""
            if isinstance(cell_formula, str) and cell_formula.startswith("="):
                logger.debug("SheetsSync: skipping formula cell (%d, %d)", row, col)
                continue
            safe.append((row, col, value))

        if safe:
            ws.update_cells(
                [Cell(row=r, col=c, value=v) for r, c, v in safe],
                value_input_option=ValueInputOption.user_entered,
            )

    def write_cells(
        self,
        updates: list[tuple[int, int, Any]],
        worksheet_name: str = "Sheet1",
    ) -> None:
        """Write (row, col, value) triples to the sheet, skipping formula cells."""
        if not self._enabled:
            return
        try:
            sh = self._gc.open_by_key(self._sheet_id or "")
            ws = sh.worksheet(worksheet_name)
            self._write_to_ws(ws, updates)
        except Exception as exc:
            logger.error("SheetsSync: write_cells failed: %s", exc)

    def write_vocal_lesson(
        self,
        lesson_date: date,
        repertoire: list[str] | None,
        reflection: str | None,
        tab: str = "Vocal",
    ) -> None:
        """Write a vocal lesson to the sheet.

        Looks up the row by ISO date string in column A; appends a new row if
        not found. Columns: A=date, B=songs, C=notes.
        """
        if not self._enabled:
            return
        try:
            sh = self._gc.open_by_key(self._sheet_id or "")
            ws = sh.worksheet(tab)
            date_str = lesson_date.isoformat()
            col_a: list[str] = ws.col_values(1)  # type: ignore[assignment]
            row_data = [date_str, ", ".join(repertoire or []), reflection or ""]
            try:
                row = col_a.index(date_str) + 1  # 1-based
                self._write_to_ws(
                    ws,
                    [(row, col + 1, val) for col, val in enumerate(row_data)],
                )
            except ValueError:
                ws.append_row(row_data, value_input_option=ValueInputOption.user_entered)
        except Exception as exc:
            logger.error("SheetsSync: write_vocal_lesson failed: %s", exc)

    def write_habit_log(
        self,
        log_date: date,
        tab: str,
        col: str,
        value: Any,
        first_data_row: int = 5,
    ) -> None:
        """Write a single habit log value to the correct row for log_date.

        Finds the row by matching the formatted date string in column A
        (e.g. 'Monday, Apr 21'), then delegates to write_cells so formula
        cells are still protected.
        """
        if not self._enabled:
            return
        try:
            sh = self._gc.open_by_key(self._sheet_id or "")
            ws = sh.worksheet(tab)

            date_label = _format_sheet_date(log_date)
            col_a: list[str] = ws.col_values(1)  # type: ignore[assignment]
            try:
                row = col_a.index(date_label, first_data_row - 1) + 1
            except ValueError:
                logger.warning(
                    "SheetsSync: date %r not found in %s/%s — skipping write",
                    date_label,
                    self._sheet_id,
                    tab,
                )
                return

            self._write_to_ws(ws, [(row, _col_letter_to_int(col), value)])
        except Exception as exc:
            logger.error("SheetsSync: write_habit_log failed: %s", exc)
