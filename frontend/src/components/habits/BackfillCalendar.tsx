import { useState, useMemo } from "react";
import { FormInputField } from "@/components/ui/FormInputField";
import { useQueries } from "@tanstack/react-query";
import { CheckSquare, Square } from "lucide-react";
import {
  useHabits,
  useBackfillAllHabits,
  useDeleteLogs,
  habitLogsQueryOptions,
  sortBySheetCol,
  type HabitDefinition,
  type HabitLog,
} from "@/lib/habits-api";
import { localDateStr, localTodayStr, fmtDateShort } from "@/lib/dateUtils";

// ─── All-habits grid ──────────────────────────────────────────────────────────

type GridValues = Record<string, Record<string, string>>; // [date][habitId]

function AllHabitsGrid() {
  const { data: _habits } = useHabits();
  const habits = _habits ? sortBySheetCol(_habits) : _habits;
  const [daysBack, setDaysBack] = useState(7);
  const [values, setValues] = useState<GridValues>({});
  const backfillAll = useBackfillAllHabits();
  const deleteLogs = useDeleteLogs();

  const today = useMemo(() => localTodayStr(), []);
  const ytdDays = useMemo(() => {
    const now = new Date();
    const jan1 = new Date(now.getFullYear(), 0, 1);
    return Math.floor((now.getTime() - jan1.getTime()) / 86_400_000) + 1;
  }, []);

  const dates = useMemo(() => {
    const result: string[] = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const d = new Date(today + "T12:00:00");
      d.setDate(d.getDate() - i);
      result.push(localDateStr(d));
    }
    return result;
  }, [daysBack, today]);

  const rangeStart = dates.length > 0 ? dates[0] : today;
  const rangeEnd = dates.length > 0 ? dates[dates.length - 1] : today;

  const logQueries = useQueries({
    queries: (habits ?? []).map((h) => habitLogsQueryOptions(h.id, rangeStart, rangeEnd)),
  });

  // [date][habitId] = { value, logId, notes? } for existing DB logs
  const existingLogs = useMemo(() => {
    const map: Record<string, Record<string, { value: number; logId: string; notes?: string }>> = {};
    (habits ?? []).forEach((h, i) => {
      (logQueries[i]?.data ?? []).forEach((log: HabitLog) => {
        if (!map[log.date]) map[log.date] = {};
        map[log.date][h.id] = { value: log.value, logId: log.id, notes: log.notes };
      });
    });
    return map;
  }, [logQueries, habits]);

  function setCellValue(date: string, habitId: string, val: string) {
    setValues((prev) => ({
      ...prev,
      [date]: { ...(prev[date] ?? {}), [habitId]: val },
    }));
  }

  function toggleBinary(date: string, habitId: string) {
    const existingEntry = existingLogs[date]?.[habitId];
    const existingChecked = existingEntry != null && existingEntry.value > 0;
    const userVal = values[date]?.[habitId];
    const currentlyChecked = userVal !== undefined ? !!userVal : existingChecked;
    setCellValue(date, habitId, currentlyChecked ? "" : "1");
  }

  function handleCellKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    dateIdx: number,
    habitIdx: number
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = document.querySelector<HTMLElement>(
        `[data-cell="${dateIdx + 1}-${habitIdx}"]`
      );
      nextInput?.focus();
    }
  }

  function isHabitNumeric(habit: HabitDefinition) {
    return !!habit.unit && habit.period_config?.sheet_type !== "text";
  }

  function isHabitText(habit: HabitDefinition) {
    return habit.period_config?.sheet_type === "text";
  }

  const entryList = useMemo(() => {
    const entries: { habitId: string; date: string; value: number; notes?: string }[] = [];
    for (const date of dates) {
      for (const habit of habits ?? []) {
        const raw = values[date]?.[habit.id] ?? "";
        if (isHabitNumeric(habit)) {
          const v = parseFloat(raw);
          if (!isNaN(v)) entries.push({ habitId: habit.id, date, value: v });
        } else if (isHabitText(habit)) {
          const v = raw.trim();
          if (v) entries.push({ habitId: habit.id, date, value: 1, notes: v });
        } else if (raw) {
          entries.push({ habitId: habit.id, date, value: 1 });
        }
      }
    }
    return entries;
  }, [values, dates, habits]);

  const deletionList = useMemo(() => {
    const list: { habitId: string; logId: string }[] = [];
    for (const date of dates) {
      for (const habit of habits ?? []) {
        if (isHabitNumeric(habit)) continue;
        const existing = existingLogs[date]?.[habit.id];
        if (!existing) continue;
        const userVal = values[date]?.[habit.id];
        if (userVal === "") list.push({ habitId: habit.id, logId: existing.logId });
      }
    }
    return list;
  }, [values, dates, habits, existingLogs]);

  function handleSubmit() {
    if (entryList.length === 0 && deletionList.length === 0) return;
    const after = () => setValues({});
    if (deletionList.length > 0 && entryList.length > 0) {
      deleteLogs.mutate(deletionList, { onSuccess: () => backfillAll.mutate(entryList, { onSuccess: after }) });
    } else if (deletionList.length > 0) {
      deleteLogs.mutate(deletionList, { onSuccess: after });
    } else {
      backfillAll.mutate(entryList, { onSuccess: after });
    }
  }

  return (
    <div className="space-y-4">
      {/* Date range selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-body">Show last</span>
        {[3, 7, 14, 30].map((n) => (
          <button
            key={n}
            onClick={() => setDaysBack(n)}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
            style={{
              background: daysBack === n ? "var(--accent)" : "var(--code-bg)",
              color: daysBack === n ? "#fff" : "var(--text)",
            }}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => setDaysBack(ytdDays)}
          className="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
          style={{
            background: daysBack === ytdDays ? "var(--accent)" : "var(--code-bg)",
            color: daysBack === ytdDays ? "#fff" : "var(--text)",
          }}
        >
          YTD
        </button>
        <FormInputField
          type="number"
          min="1"
          max="365"
          className="w-14 rounded-md px-2 py-1 text-xs text-right"
          value={daysBack}
          onChange={(e) => {
            const n = parseInt(e.target.value);
            if (!isNaN(n) && n >= 1 && n <= 365) setDaysBack(n);
          }}
        />
        <span className="text-xs text-body">days</span>
      </div>

      {/* Grid */}
      <div
        className="overflow-x-auto rounded-xl"
        style={{ background: "var(--bg)" }}
      >
        <table className="border-collapse" style={{ width: "max-content" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th
                className="sticky left-0 z-10 text-left text-xs font-medium py-2.5 px-3 whitespace-nowrap"
                style={{ background: "var(--bg)", color: "var(--text)", width: "9rem" }}
              >
                Date
              </th>
              {(habits ?? []).map((h) => (
                <th
                  key={h.id}
                  className="text-left text-xs font-medium py-2.5 px-2 text-heading"
                  style={{ width: isHabitText(h) ? "12rem" : "5rem", maxWidth: isHabitText(h) ? "12rem" : "5rem" }}
                >
                  <div style={{ wordBreak: "break-word" }}>{h.name}</div>
                  {h.unit && habit_display_unit(h) && (
                    <div className="text-xs font-normal mt-0.5 text-body">
                      {habit_display_unit(h)}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dates.map((date, dateIdx) => (
              <tr
                key={date}
                style={{ borderTop: dateIdx > 0 ? "1px solid var(--border)" : undefined }}
              >
                <td
                  className="sticky left-0 z-10 text-xs font-medium py-2 px-3 whitespace-nowrap"
                  style={{
                    background: "var(--bg)",
                    color: date === today ? "var(--accent)" : "var(--text-h)",
                  }}
                >
                  {date === today ? "Today" : fmtDateShort(date)}
                </td>
                {(habits ?? []).map((habit, habitIdx) => {
                  const existingEntry = existingLogs[date]?.[habit.id];
                  const existingVal = existingEntry?.value;
                  const userVal = values[date]?.[habit.id];
                  const hasExisting = existingEntry !== undefined;
                  const hasUserEdit = userVal !== undefined;

                  if (isHabitNumeric(habit)) {
                    const displayVal = hasUserEdit ? userVal : hasExisting ? String(existingVal) : "";
                    return (
                      <td key={habit.id} className="py-1.5 px-1">
                        <FormInputField
                          type="number"
                          step="any"
                          data-cell={`${dateIdx}-${habitIdx}`}
                          className="w-full rounded px-2 py-1 text-xs text-right"
                          value={displayVal}
                          onChange={(e) => setCellValue(date, habit.id, e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, dateIdx, habitIdx)}
                          placeholder="—"
                          style={{
                            background: hasExisting && !hasUserEdit ? "var(--accent-bg)" : "var(--code-bg)",
                            borderColor: hasUserEdit || hasExisting ? "var(--accent-border)" : "var(--border)",
                            color: hasExisting && !hasUserEdit ? "var(--accent)" : "var(--text-h)",
                            opacity: hasExisting && !hasUserEdit ? 0.75 : 1,
                          }}
                        />
                      </td>
                    );
                  }

                  // Text input
                  if (isHabitText(habit)) {
                    const displayVal = hasUserEdit ? userVal : (hasExisting ? (existingEntry!.notes ?? "") : "");
                    return (
                      <td key={habit.id} className="py-1.5 px-1">
                        <FormInputField
                          type="text"
                          size={1}
                          data-cell={`${dateIdx}-${habitIdx}`}
                          className="w-full rounded px-2 py-1 text-xs"
                          value={displayVal}
                          onChange={(e) => setCellValue(date, habit.id, e.target.value)}
                          onKeyDown={(e) => handleCellKeyDown(e, dateIdx, habitIdx)}
                          placeholder="—"
                          style={{
                            background: hasExisting && !hasUserEdit ? "var(--accent-bg)" : "var(--code-bg)",
                            borderColor: hasUserEdit || hasExisting ? "var(--accent-border)" : "var(--border)",
                            color: hasExisting && !hasUserEdit ? "var(--accent)" : "var(--text-h)",
                            opacity: hasExisting && !hasUserEdit ? 0.75 : 1,
                          }}
                        />
                      </td>
                    );
                  }

                  // Binary: show checkbox
                  const existingChecked = hasExisting && (existingVal ?? 0) > 0;
                  const isChecked = hasUserEdit ? !!userVal : existingChecked;
                  const pendingDelete = existingChecked && hasUserEdit && !userVal;
                  const isExistingOnly = existingChecked && !hasUserEdit;

                  return (
                    <td key={habit.id} className="py-1.5 px-2">
                      <div className="flex justify-center">
                        <button
                          onClick={() => toggleBinary(date, habit.id)}
                          className="hover:opacity-70 transition-opacity"
                          style={{
                            color: pendingDelete ? "#ef4444" : isChecked ? "var(--accent)" : "var(--border)",
                            opacity: isExistingOnly ? 0.6 : 1,
                          }}
                        >
                          {isChecked ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-body">
          Dimmed cells already logged · <span className="text-error">red</span> = will be deleted
        </span>
        <button
          onClick={handleSubmit}
          disabled={backfillAll.isPending || deleteLogs.isPending || (entryList.length === 0 && deletionList.length === 0)}
          className="rounded-lg px-4 py-1.5 text-sm font-semibold hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {backfillAll.isPending || deleteLogs.isPending
            ? "Saving…"
            : (() => {
              const parts = [];
              if (entryList.length > 0) parts.push(`log ${entryList.length}`);
              if (deletionList.length > 0) parts.push(`delete ${deletionList.length}`);
              return parts.length > 0
                ? parts.join(" · ") + ` entr${entryList.length + deletionList.length !== 1 ? "ies" : "y"}`
                : "No changes";
            })()}
        </button>
      </div>
    </div>
  );
}

function habit_display_unit(h: HabitDefinition): string | null {
  if (h.period_config?.sheet_type === "text") return null;
  return h.unit ?? null;
}

export function BackfillCalendar() {
  return <AllHabitsGrid />;
}
