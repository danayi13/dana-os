import { useState } from "react";
import { FormInputField } from "@/components/ui/FormInputField";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { LoadingText } from "@/components/ui/LoadingText";
import { useQueries } from "@tanstack/react-query";
import { CheckSquare, Square, Loader2, Check, X } from "lucide-react";
import {
  useHabits,
  useHabitLogs,
  useLogHabit,
  useDeleteHabitLog,
  habitLogsQueryOptions,
  sortBySheetCol,
  type HabitDefinition,
  type PeriodType,
} from "@/lib/habits-api";
import { localTodayStr } from "@/lib/dateUtils";

const PERIOD_SUFFIX: Record<string, string> = {
  daily: "/ day",
  weekly: "/ week",
  monthly: "/ month",
  custom: "",
};


interface HabitCardProps {
  habit: HabitDefinition;
  compact?: boolean;
  date?: string;
}

function HabitCard({ habit, compact, date }: HabitCardProps) {
  const today = date ?? localTodayStr();
  const [numValue, setNumValue] = useState("");
  const [textValue, setTextValue] = useState("");

  const { data: todayLogs, isLoading: logsLoading } = useHabitLogs(habit.id, today, today);
  const logMutation = useLogHabit(habit.id);
  const deleteMutation = useDeleteHabitLog(habit.id);

  const todayLog = todayLogs?.[0];
  const isLogged = !!todayLog;
  const isBusy = logMutation.isPending || deleteMutation.isPending || logsLoading;
  const isText = habit.period_config?.sheet_type === "text";
  const isNumeric = !!habit.unit && !isText;

  function submitNumeric() {
    const v = parseFloat(numValue);
    if (isNaN(v)) return;
    logMutation.mutate({ date: today, value: v }, { onSuccess: () => setNumValue("") });
  }

  function submitText() {
    const v = textValue.trim();
    if (!v) return;
    logMutation.mutate({ date: today, value: 1, notes: v }, { onSuccess: () => setTextValue("") });
  }

  function toggleBinary() {
    if (isLogged) deleteMutation.mutate(todayLog!.id);
    else logMutation.mutate({ date: today, value: 1 });
  }

  function unlog() {
    if (todayLog) deleteMutation.mutate(todayLog.id);
  }

  // ── Compact numeric ──────────────────────────────────────────────────────────
  if (compact && isNumeric) {
    return (
      <div
        className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 min-h-[52px]"
        style={{
          borderColor: isLogged ? "transparent" : "var(--border)",
          background: isLogged ? "var(--accent-bg)" : "var(--bg)",
        }}
      >
        {isBusy ? (
          <Loader2 size={18} className="animate-spin shrink-0" style={{ color: "var(--text)" }} />
        ) : isLogged ? (
          <CheckSquare size={18} className="shrink-0" style={{ color: "var(--accent)" }} />
        ) : (
          <Square size={18} className="shrink-0" style={{ color: "var(--text)" }} />
        )}
        <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--text-h)" }}>
          {habit.name}
        </span>
        {isLogged ? (
          <>
            <span className="text-xs shrink-0" style={{ color: "var(--accent)" }}>
              {todayLog!.value} {habit.unit}
            </span>
            <button
              onClick={unlog}
              disabled={isBusy}
              className="rounded-md p-1 hover:opacity-70 disabled:opacity-40 shrink-0"
              style={{ color: "var(--text)" }}
            >
              {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <FormInputField
              type="number"
              step="any"
              className="w-16 px-2 py-1 text-right"
              value={numValue}
              onChange={(e) => setNumValue(e.target.value)}
              placeholder={habit.target ? String(habit.target) : "0"}
              onKeyDown={(e) => { if (e.key === "Enter") submitNumeric(); }}
            />
            <span className="text-xs" style={{ color: "var(--text)" }}>{habit.unit}</span>
            <button
              onClick={submitNumeric}
              disabled={isBusy || !numValue}
              className="rounded-md p-1 hover:opacity-70 disabled:opacity-40"
              style={{ color: "var(--accent)" }}
            >
              <Check size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Compact text ─────────────────────────────────────────────────────────────
  if (compact && isText) {
    return (
      <div
        className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 min-h-[52px]"
        style={{
          borderColor: isLogged ? "transparent" : "var(--border)",
          background: isLogged ? "var(--accent-bg)" : "var(--bg)",
        }}
      >
        {isBusy ? (
          <Loader2 size={18} className="animate-spin shrink-0" style={{ color: "var(--text)" }} />
        ) : isLogged ? (
          <CheckSquare size={18} className="shrink-0" style={{ color: "var(--accent)" }} />
        ) : (
          <Square size={18} className="shrink-0" style={{ color: "var(--text)" }} />
        )}
        <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--text-h)" }}>
          {habit.name}
        </span>
        {isLogged ? (
          <>
            <span className="text-xs shrink-0 max-w-[8rem] truncate" style={{ color: "var(--accent)" }}>
              {todayLog!.notes ?? "✓"}
            </span>
            <button
              onClick={unlog}
              disabled={isBusy}
              className="rounded-md p-1 hover:opacity-70 disabled:opacity-40 shrink-0"
              style={{ color: "var(--text)" }}
            >
              {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <FormInputField
              type="text"
              className="w-32 px-2 py-1"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitText(); }}
              placeholder="what did you do?"
            />
            <button
              onClick={submitText}
              disabled={isBusy || !textValue.trim()}
              className="rounded-md p-1 hover:opacity-70 disabled:opacity-40"
              style={{ color: "var(--accent)" }}
            >
              <Check size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Compact binary ───────────────────────────────────────────────────────────
  if (compact) {
    return (
      <button
        onClick={toggleBinary}
        disabled={isBusy}
        className="flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all hover:opacity-80 disabled:cursor-default min-h-[52px]"
        style={{
          borderColor: isLogged ? "transparent" : "var(--border)",
          background: isLogged ? "var(--accent-bg)" : "var(--bg)",
        }}
      >
        {isBusy ? (
          <Loader2 size={18} className="animate-spin" style={{ color: "var(--text)" }} />
        ) : isLogged ? (
          <CheckSquare size={18} style={{ color: "var(--accent)" }} />
        ) : (
          <Square size={18} style={{ color: "var(--text)" }} />
        )}
        <span className="text-sm font-medium" style={{ color: "var(--text-h)" }}>
          {habit.name}
        </span>
      </button>
    );
  }

  // ── Full numeric ─────────────────────────────────────────────────────────────
  if (isNumeric) {
    return (
      <div
        className="rounded-xl border px-4 py-4 transition-all"
        style={{
          borderColor: isLogged ? "var(--accent-border)" : "var(--border)",
          background: isLogged ? "var(--accent-bg)" : "var(--bg)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-base font-medium"
                style={{
                  color: "var(--text-h)",
                  textDecoration: isLogged ? "line-through" : "none",
                  opacity: isLogged ? 0.7 : 1,
                }}
              >
                {habit.name}
              </span>
              {habit.target != null && (
                <span className="text-xs" style={{ color: "var(--text)" }}>
                  {habit.direction === "at_least" ? "≥" : habit.direction === "at_most" ? "≤" : ""}{" "}
                  {habit.target} {habit.unit} {PERIOD_SUFFIX[habit.period_type] ?? ""}
                </span>
              )}
            </div>
            {habit.description && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text)" }}>
                {habit.description}
              </p>
            )}
          </div>
          {isLogged && (
            <button
              onClick={unlog}
              disabled={isBusy}
              className="shrink-0 rounded-md p-1 hover:opacity-70 disabled:opacity-40"
              style={{ color: "var(--text)" }}
            >
              {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            </button>
          )}
        </div>

        {isLogged ? (
          <p className="text-xs mt-2" style={{ color: "var(--accent)" }}>
            ✓ {todayLog!.value} {habit.unit}
          </p>
        ) : (
          <div className="flex items-center gap-2 mt-3">
            {isBusy ? (
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--text)" }} />
            ) : (
              <>
                <FormInputField
                  type="number"
                  step="any"
                  className="min-w-0 flex-1 py-1.5"
                  value={numValue}
                  onChange={(e) => setNumValue(e.target.value)}
                  placeholder={habit.target ? String(habit.target) : "0"}
                  onKeyDown={(e) => { if (e.key === "Enter") submitNumeric(); }}
                />
                <span className="shrink-0 text-xs" style={{ color: "var(--text)" }}>{habit.unit}</span>
                <button
                  onClick={submitNumeric}
                  disabled={!numValue || isBusy}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  Log
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Full text ────────────────────────────────────────────────────────────────
  if (isText) {
    return (
      <div
        className="rounded-xl border px-4 py-4 transition-all"
        style={{
          borderColor: isLogged ? "var(--accent-border)" : "var(--border)",
          background: isLogged ? "var(--accent-bg)" : "var(--bg)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span
              className="text-base font-medium"
              style={{
                color: "var(--text-h)",
                textDecoration: isLogged ? "line-through" : "none",
                opacity: isLogged ? 0.7 : 1,
              }}
            >
              {habit.name}
            </span>
            {habit.description && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text)" }}>
                {habit.description}
              </p>
            )}
          </div>
          {isLogged && (
            <button
              onClick={unlog}
              disabled={isBusy}
              className="shrink-0 rounded-md p-1 hover:opacity-70 disabled:opacity-40"
              style={{ color: "var(--text)" }}
            >
              {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
            </button>
          )}
        </div>

        {isLogged ? (
          <p className="text-xs mt-2" style={{ color: "var(--accent)" }}>
            ✓ {todayLog!.notes ?? "Done"}
          </p>
        ) : (
          <div className="flex items-center gap-2 mt-3">
            {isBusy ? (
              <Loader2 size={16} className="animate-spin" style={{ color: "var(--text)" }} />
            ) : (
              <>
                <FormInputField
                  type="text"
                  className="min-w-0 flex-1 py-1.5"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitText(); }}
                  placeholder="what did you do?"
                />
                <button
                  onClick={submitText}
                  disabled={!textValue.trim() || isBusy}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "#fff" }}
                >
                  Log
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Full binary ──────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-xl border px-4 py-4 transition-all"
      style={{
        borderColor: isLogged ? "var(--accent-border)" : "var(--border)",
        background: isLogged ? "var(--accent-bg)" : "var(--bg)",
      }}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={toggleBinary}
          disabled={isBusy}
          className="mt-0.5 shrink-0 transition-opacity hover:opacity-70 disabled:cursor-default"
          aria-label={isLogged ? "Unmark as done" : "Mark as done"}
        >
          {isBusy ? (
            <Loader2 size={22} className="animate-spin" style={{ color: "var(--text)" }} />
          ) : isLogged ? (
            <CheckSquare size={22} style={{ color: "var(--accent)" }} />
          ) : (
            <Square size={22} style={{ color: "var(--text)" }} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <span
            className="text-base font-medium"
            style={{
              color: "var(--text-h)",
              textDecoration: isLogged ? "line-through" : "none",
              opacity: isLogged ? 0.7 : 1,
            }}
          >
            {habit.name}
          </span>
          {habit.description && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text)" }}>
              {habit.description}
            </p>
          )}
          {isLogged && (
            <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>✓ Done</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface HabitChecklistProps {
  compact?: boolean;
  limit?: number;
  periodFilter?: PeriodType[];
  date?: string;
}

export function HabitChecklist({ compact, limit, periodFilter, date }: HabitChecklistProps) {
  const today = date ?? localTodayStr();
  const { data: habits, isLoading, error } = useHabits();

  const sorted = habits ? sortBySheetCol(habits) : undefined;
  const filtered = periodFilter ? sorted?.filter((h) => periodFilter.includes(h.period_type)) : sorted;
  const displayHabits = limit ? filtered?.slice(0, limit) : filtered;

  // Fetch logs for the selected date for all displayed habits to determine done/not-done split.
  // Always called (hooks can't be conditional), but results only used in non-compact mode.
  const todayLogQueries = useQueries({
    queries: (displayHabits ?? []).map((h) => habitLogsQueryOptions(h.id, today, today)),
  });

  if (isLoading) return <LoadingText message="Loading habits…" />;

  if (error) {
    return (
      <p className="text-sm py-2" style={{ color: "#ef4444" }}>
        Could not load habits. Is the backend running?
      </p>
    );
  }

  // When a period filter is active and nothing matches, render nothing
  if (periodFilter && filtered?.length === 0) return null;

  if (!displayHabits || displayHabits.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text)" }}>
        No habits yet. Go to the Manage tab to add some.
      </p>
    );
  }

  if (compact) {
    return (
      <div className="space-y-2">
        {displayHabits.map((habit) => (
          <HabitCard key={habit.id} habit={habit} compact date={date} />
        ))}
        {limit && habits && habits.length > limit && (
          <p className="text-xs" style={{ color: "var(--text)" }}>
            +{habits.length - limit} more — open Habits &amp; Goals for the full list
          </p>
        )}
      </div>
    );
  }

  // Build logged set from parallel queries (only settled queries count)
  const loggedIds = new Set<string>();
  todayLogQueries.forEach((q, i) => {
    if (q.data && q.data.length > 0) loggedIds.add(displayHabits[i].id);
  });

  const notDone = displayHabits.filter((h) => !loggedIds.has(h.id));
  const done = displayHabits.filter((h) => loggedIds.has(h.id));

  return (
    <div className="space-y-2">
      {notDone.map((habit) => (
        <HabitCard key={habit.id} habit={habit} date={date} />
      ))}
      {done.length > 0 && (
        <>
          <SectionLabel variant="wide" className="pt-2">Done</SectionLabel>
          {done.map((habit) => (
            <HabitCard key={habit.id} habit={habit} date={date} />
          ))}
        </>
      )}
      {limit && habits && habits.length > limit && (
        <p className="text-xs" style={{ color: "var(--text)" }}>
          +{habits.length - limit} more — open Habits &amp; Goals for the full list
        </p>
      )}
    </div>
  );
}
