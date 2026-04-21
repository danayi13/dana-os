"""Tests for SheetsSync graceful degradation (no real Google credentials required)."""

from app.services.sheets_sync import SheetsSync


def test_no_credentials_is_disabled() -> None:
    sync = SheetsSync(credentials_path=None, sheet_id=None)
    assert not sync.enabled


def test_missing_file_is_disabled(tmp_path: object) -> None:
    sync = SheetsSync(credentials_path="/nonexistent/path/creds.json", sheet_id="sheet123")
    assert not sync.enabled


def test_no_sheet_id_is_disabled(tmp_path: object) -> None:
    sync = SheetsSync(credentials_path="/some/path.json", sheet_id=None)
    assert not sync.enabled


def test_write_cells_noop_when_disabled() -> None:
    sync = SheetsSync(credentials_path=None, sheet_id=None)
    # Should not raise even though disabled
    sync.write_cells("Sheet1", [(1, 1, "hello")])
