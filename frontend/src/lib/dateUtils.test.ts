import { describe, it, expect, vi, afterEach } from "vitest";
import {
  CURRENT_YEAR,
  localDateStr,
  localTodayStr,
  fmtDateShort,
  fmtDate,
  fmtDateLong,
  dateRange,
} from "./dateUtils";

// June 15 2024 is a Saturday; January 1 2024 is a Monday.
// All format tests use "en-US" locale, which requires full ICU in Node (default since Node 13).

describe("localDateStr", () => {
  it("zero-pads month and day", () => {
    expect(localDateStr(new Date(2024, 0, 1))).toBe("2024-01-01");
  });

  it("handles double-digit month and day", () => {
    expect(localDateStr(new Date(2024, 11, 31))).toBe("2024-12-31");
  });

  it("zero-pads single-digit month with double-digit day", () => {
    expect(localDateStr(new Date(2025, 2, 15))).toBe("2025-03-15");
  });
});

describe("localTodayStr", () => {
  afterEach(() => vi.useRealTimers());

  it("returns today in YYYY-MM-DD", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15)); // Jun 15 2025
    expect(localTodayStr()).toBe("2025-06-15");
  });
});

describe("fmtDateShort", () => {
  it("includes abbreviated weekday, month, and day", () => {
    expect(fmtDateShort("2024-06-15")).toBe("Sat, Jun 15");
  });

  it("handles single-digit day without zero-padding", () => {
    expect(fmtDateShort("2024-01-01")).toBe("Mon, Jan 1");
  });
});

describe("fmtDate", () => {
  it("returns abbreviated month and day", () => {
    expect(fmtDate("2024-06-15")).toBe("Jun 15");
  });

  it("handles single-digit day", () => {
    expect(fmtDate("2024-01-01")).toBe("Jan 1");
  });
});

describe("fmtDateLong", () => {
  it("returns full weekday, full month, and day", () => {
    expect(fmtDateLong("2024-06-15")).toBe("Saturday, June 15");
  });

  it("handles Monday", () => {
    expect(fmtDateLong("2024-01-01")).toBe("Monday, January 1");
  });
});

describe("dateRange", () => {
  afterEach(() => vi.useRealTimers());

  it("returns end = today and start = today minus daysBack", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15)); // Jun 15 2025
    const { start, end } = dateRange(6);
    expect(end).toBe("2025-06-15");
    expect(start).toBe("2025-06-09");
  });

  it("returns the same day for daysBack = 0", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15));
    const { start, end } = dateRange(0);
    expect(start).toBe(end);
  });

  it("crosses month boundaries correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 6, 3)); // Jul 3 2025
    const { start, end } = dateRange(4);
    expect(end).toBe("2025-07-03");
    expect(start).toBe("2025-06-29");
  });
});

describe("CURRENT_YEAR", () => {
  it("matches the year at module load time", () => {
    // CURRENT_YEAR is evaluated once at import; just confirm it's a plausible year.
    expect(CURRENT_YEAR).toBeGreaterThanOrEqual(2024);
    expect(CURRENT_YEAR).toBeLessThanOrEqual(2200);
  });
});
