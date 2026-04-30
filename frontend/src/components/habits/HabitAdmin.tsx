import { useState } from "react";
import { FormButton } from "@/components/ui/FormButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Edit2, Archive, RotateCcw, Trash2 } from "lucide-react";
import {
  useHabits,
  useCreateHabit,
  useUpdateHabit,
  useDeleteHabit,
  useHabitActivationPeriods,
  useActivateHabit,
  useArchivePeriod,
  sortBySheetCol,
  type HabitDefinition,
  type HabitDefinitionCreate,
} from "@/lib/habits-api";
import { localTodayStr } from "@/lib/dateUtils";

const PERIOD_SUFFIX: Record<string, string> = {
  daily: "/ day",
  weekly: "/ week",
  monthly: "/ month",
  custom: "",
};
import { Dialog } from "@/components/ui/Dialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { HabitForm } from "./HabitForm";


const PERIOD_COLORS: Record<string, { bg: string; fg: string }> = {
  daily:   { bg: "rgba(34, 197, 94, 0.15)",  fg: "#22c55e" },
  weekly:  { bg: "rgba(59, 130, 246, 0.15)", fg: "#3b82f6" },
  monthly: { bg: "rgba(249, 115, 22, 0.15)", fg: "#f97316" },
  custom:  { bg: "rgba(148, 163, 184, 0.15)", fg: "#94a3b8" },
};

function PeriodBadge({ periodType }: { periodType: string }) {
  const { bg, fg } = PERIOD_COLORS[periodType] ?? { bg: "var(--accent-bg)", fg: "var(--accent)" };
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ background: bg, color: fg }}
    >
      {periodType}
    </span>
  );
}

function HabitRow({ habit }: { habit: HabitDefinition }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: periods, isLoading: periodsLoading } = useHabitActivationPeriods(habit.id);

  const updateMutation = useUpdateHabit(habit.id);
  const deleteMutation = useDeleteHabit();
  const activateMutation = useActivateHabit();
  const archiveMutation = useArchivePeriod();

  const activePeriod = periods?.find(
    (p) => !p.archived_at && (!p.ends_on || p.ends_on >= localTodayStr())
  );
  const isActive = !!activePeriod;

  function handleActivate() {
    activateMutation.mutate({ habitId: habit.id, starts_on: localTodayStr() });
  }

  function handleArchive() {
    if (!activePeriod) return;
    archiveMutation.mutate({ habitId: habit.id, periodId: activePeriod.id });
  }

  function handleUpdate(data: HabitDefinitionCreate) {
    updateMutation.mutate(data, { onSuccess: () => setEditOpen(false) });
  }

  function handleDelete() {
    deleteMutation.mutate(habit.id, { onSuccess: () => setDeleteConfirm(false) });
  }

  const statusLabel = periodsLoading
    ? "…"
    : isActive
    ? `Active since ${activePeriod!.starts_on}`
    : periods && periods.length > 0
    ? "Inactive"
    : "Not started";

  return (
    <div
      className="rounded-xl border"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Left: name + badges + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-heading">{habit.name}</span>
            <PeriodBadge periodType={habit.period_type} />
            {habit.target != null && (
              <span className="text-xs text-body">
                {habit.target} {habit.unit} {PERIOD_SUFFIX[habit.period_type] ?? ""}
              </span>
            )}
          </div>
          {habit.description && (
            <p className="text-xs truncate mt-0.5 text-body">
              {habit.description}
            </p>
          )}
        </div>

        {/* Middle: status + sheets info */}
        <div className="shrink-0 text-right space-y-0.5">
          <div className="flex items-center gap-1.5 justify-end">
            <span
              className="inline-block w-1.5 h-1.5 rounded-full"
              style={{ background: isActive ? "#22c55e" : "var(--border)" }}
            />
            <span className="text-xs" style={{ color: "var(--text)" }}>
              {statusLabel}
            </span>
          </div>
          {habit.period_config?.sheet_col && (
            <p className="text-xs text-body">
              col {habit.period_config.sheet_col} · {habit.period_config.sheet_type}
            </p>
          )}
        </div>

        {/* Right: action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip content="Edit">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-md p-1.5 transition-opacity hover:opacity-70 text-body"
            >
              <Edit2 size={14} />
            </button>
          </Tooltip>

          {!periodsLoading && (
            <Tooltip content={isActive ? "Archive (stop tracking)" : "Activate (start tracking)"}>
              <button
                onClick={isActive ? handleArchive : handleActivate}
                disabled={activateMutation.isPending || archiveMutation.isPending}
                className="rounded-md p-1.5 transition-opacity hover:opacity-70 disabled:opacity-40"
                style={{ color: isActive ? "var(--text)" : "var(--accent)" }}
              >
                {isActive ? <Archive size={14} /> : <RotateCcw size={14} />}
              </button>
            </Tooltip>
          )}

          <Tooltip content="Delete">
            <button
              onClick={() => setDeleteConfirm(true)}
              className="rounded-md p-1.5 transition-opacity hover:opacity-70 text-body"
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit habit">
        <HabitForm
          initial={habit}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
          isPending={updateMutation.isPending}
        />
      </Dialog>

      <Dialog open={deleteConfirm} onClose={() => setDeleteConfirm(false)} title="Delete habit?">
        <p className="text-sm mb-4 text-body">
          This will permanently delete <strong className="text-heading">{habit.name}</strong>{" "}
          and all its logs.
        </p>
        <div className="flex justify-end gap-2">
          <FormButton intent="cancel" onClick={() => setDeleteConfirm(false)}>Cancel</FormButton>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-50"
            style={{ background: "#ef4444", color: "#fff" }}
          >
            {deleteMutation.isPending ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}

export function HabitAdmin() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: habits, isLoading, error } = useHabits();
  const createMutation = useCreateHabit();

  function handleCreate(data: HabitDefinitionCreate) {
    createMutation.mutate(data, { onSuccess: () => setCreateOpen(false) });
  }

  if (isLoading) {
    return <p className="text-sm text-body">Loading habits…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-error">Failed to load habits. Is the backend running?</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-body">{habits?.length ?? 0} habit{habits?.length !== 1 ? "s" : ""} defined</p>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <Plus size={14} />
          New habit
        </button>
      </div>

      {habits && habits.length === 0 && (
        <EmptyState message="No habits yet. Create your first one." />
      )}

      <div className="space-y-2">
        {(habits ? sortBySheetCol(habits) : []).map((habit) => (
          <HabitRow key={habit.id} habit={habit} />
        ))}
      </div>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New habit">
        <HabitForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          isPending={createMutation.isPending}
        />
      </Dialog>
    </div>
  );
}
