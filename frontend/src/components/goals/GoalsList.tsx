import { useState } from "react";
import { Plus, CheckCircle2, Circle, Edit2, Archive, Loader2 } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { FormInputField } from "@/components/ui/FormInputField";
import { FormButton } from "@/components/ui/FormButton";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { LoadingText } from "@/components/ui/LoadingText";
import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useCompleteGoal,
  useUncompleteGoal,
  useArchiveGoal,
  useUpdateGoalProgress,
  type Goal,
  type GoalCreate,
} from "@/lib/goals-api";
import { Dialog } from "@/components/ui/Dialog";
import { GoalForm } from "./GoalForm";
import { CURRENT_YEAR } from "@/lib/dateUtils";

// ─── Goal row ─────────────────────────────────────────────────────────────────

function GoalRow({ goal }: { goal: Goal }) {
  const [editOpen, setEditOpen] = useState(false);
  const [completeConfirm, setCompleteConfirm] = useState(false);
  const [uncompleteConfirm, setUncompleteConfirm] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState(false);
  const [progressEdit, setProgressEdit] = useState(false);
  const [progressValue, setProgressValue] = useState(
    goal.current_value != null ? String(goal.current_value) : "0"
  );

  const updateMutation = useUpdateGoal(goal.id);
  const completeMutation = useCompleteGoal();
  const uncompleteMutation = useUncompleteGoal();
  const archiveMutation = useArchiveGoal();
  const progressMutation = useUpdateGoalProgress(goal.id);

  const isCompleted = goal.status === "completed";
  const isArchived = goal.status === "archived";
  const isActive = goal.status === "active";

  function handleUpdate(data: GoalCreate) {
    updateMutation.mutate(data, { onSuccess: () => setEditOpen(false) });
  }

  function handleComplete() {
    completeMutation.mutate(goal.id, { onSuccess: () => setCompleteConfirm(false) });
  }

  function handleArchive() {
    archiveMutation.mutate(goal.id, { onSuccess: () => setArchiveConfirm(false) });
  }

  function handleUpdateProgress() {
    const val = parseFloat(progressValue);
    if (isNaN(val)) return;
    progressMutation.mutate(val, { onSuccess: () => setProgressEdit(false) });
  }

  return (
    <div
      className="rounded-xl border px-4 py-3 space-y-2"
      style={{
        borderColor: isCompleted ? "transparent" : "var(--border)",
        background: isCompleted ? "var(--accent-bg)" : "var(--bg)",
        opacity: isArchived ? 0.5 : 1,
      }}
    >
      <div className="flex items-start gap-3">
        {/* Complete toggle */}
        {goal.type === "binary" && isActive && (
          <button
            onClick={() => setCompleteConfirm(true)}
            className="mt-0.5 shrink-0 transition-opacity hover:opacity-70"
            aria-label="Mark complete"
          >
            <Circle size={20} style={{ color: "var(--text)" }} />
          </button>
        )}
        {goal.type === "binary" && isCompleted && (
          <button
            onClick={() => setUncompleteConfirm(true)}
            className="mt-0.5 shrink-0 transition-opacity hover:opacity-70"
            aria-label="Mark incomplete"
          >
            <CheckCircle2 size={20} style={{ color: "var(--accent)" }} />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium"
            style={{
              color: "var(--text-h)",
              textDecoration: isCompleted ? "line-through" : "none",
              opacity: isCompleted ? 0.7 : 1,
            }}
          >
            {goal.name}
          </p>
          {goal.notes && (
            <p className="text-xs mt-0.5" style={{ color: "var(--text)" }}>{goal.notes}</p>
          )}

          {/* Milestone progress */}
          {goal.type === "milestone" && goal.target_value != null && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs" style={{ color: "var(--text)" }}>
                <span>{goal.current_value ?? 0} / {goal.target_value}</span>
                {goal.linked_module && <span>via {goal.linked_module}</span>}
              </div>
              {goal.direction !== "track" && (
                <ProgressBar
                  current={goal.current_value ?? 0}
                  target={goal.target_value}
                  direction={goal.direction}
                />
              )}
            </div>
          )}

          {isCompleted && goal.completed_at && (
            <p className="text-xs mt-1" style={{ color: "var(--accent)" }}>
              Completed {new Date(goal.completed_at).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        {!isArchived && (
          <div className="flex items-center gap-1 shrink-0">
            {goal.type === "milestone" && isActive && (
              <button
                onClick={() => setProgressEdit((v) => !v)}
                className="rounded-md px-2 py-1 text-xs font-medium hover:opacity-70"
                style={{ color: "var(--accent)", border: "1px solid var(--accent-border)" }}
              >
                Update
              </button>
            )}
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-md p-1.5 hover:opacity-70"
              style={{ color: "var(--text)" }}
            >
              <Edit2 size={13} />
            </button>
            <button
              onClick={() => setArchiveConfirm(true)}
              className="rounded-md p-1.5 hover:opacity-70"
              style={{ color: "var(--text)" }}
            >
              <Archive size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Progress edit inline */}
      {progressEdit && (
        <div
          className="flex items-center gap-2 rounded-lg border p-2"
          style={{ borderColor: "var(--accent-border)", background: "var(--accent-bg)" }}
        >
          <FormInputField
            type="number"
            step="any"
            autoFocus
            className="flex-1 rounded px-2 py-1"
            value={progressValue}
            onChange={(e) => setProgressValue(e.target.value)}
            style={{ background: "var(--bg)" }}
            onKeyDown={(e) => { if (e.key === "Enter") handleUpdateProgress(); }}
          />
          <button
            onClick={handleUpdateProgress}
            disabled={progressMutation.isPending}
            className="rounded px-3 py-1 text-xs font-semibold disabled:opacity-50"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            {progressMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : "Save"}
          </button>
          <button
            onClick={() => setProgressEdit(false)}
            className="text-xs hover:opacity-70"
            style={{ color: "var(--text)" }}
          >
            ✕
          </button>
        </div>
      )}

      <ConfirmDialog
        open={completeConfirm}
        onClose={() => setCompleteConfirm(false)}
        title="Mark goal complete?"
        message={<>Mark <strong style={{ color: "var(--text-h)" }}>{goal.name}</strong> as completed?</>}
        onConfirm={handleComplete}
        confirmLabel="Mark complete ✓"
        isPending={completeMutation.isPending}
        pendingLabel="Marking…"
      />

      <ConfirmDialog
        open={uncompleteConfirm}
        onClose={() => setUncompleteConfirm(false)}
        title="Mark goal incomplete?"
        message={<>Move <strong style={{ color: "var(--text-h)" }}>{goal.name}</strong> back to active?</>}
        onConfirm={() => uncompleteMutation.mutate(goal.id, { onSuccess: () => setUncompleteConfirm(false) })}
        confirmLabel="Mark incomplete"
        isPending={uncompleteMutation.isPending}
        pendingLabel="Updating…"
      />

      {/* Confirm archive dialog */}
      <Dialog
        open={archiveConfirm}
        onClose={() => setArchiveConfirm(false)}
        title="Archive goal?"
      >
        <p className="text-sm mb-4" style={{ color: "var(--text)" }}>
          Archive <strong style={{ color: "var(--text-h)" }}>{goal.name}</strong>? History is preserved.
        </p>
        <div className="flex justify-end gap-2">
          <FormButton intent="cancel" onClick={() => setArchiveConfirm(false)}>Cancel</FormButton>
          <button
            onClick={handleArchive}
            disabled={archiveMutation.isPending}
            className="rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-80 disabled:opacity-50"
            style={{ background: "var(--text)", color: "var(--bg)" }}
          >
            {archiveMutation.isPending ? "Archiving…" : "Archive"}
          </button>
        </div>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit goal">
        <GoalForm
          initial={goal}
          onSubmit={handleUpdate}
          onCancel={() => setEditOpen(false)}
          isPending={updateMutation.isPending}
        />
      </Dialog>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function GoalsList() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [showArchived, setShowArchived] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: goals, isLoading, error } = useGoals(year);
  const createMutation = useCreateGoal();

  const filtered = goals?.filter((g) =>
    showArchived ? true : g.status !== "archived"
  );

  const binaryGoals = filtered?.filter((g) => g.type === "binary") ?? [];
  const milestoneGoals = filtered?.filter((g) => g.type === "milestone") ?? [];

  function handleCreate(data: GoalCreate) {
    createMutation.mutate(data, { onSuccess: () => setCreateOpen(false) });
  }

  if (isLoading) return <LoadingText message="Loading goals…" />;

  if (error) {
    return (
      <p className="text-sm py-2" style={{ color: "#ef4444" }}>
        Failed to load goals.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ paddingTop: "0.375rem", paddingBottom: "0.375rem" }}>
          {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>

        <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "var(--text)" }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
          />
          Show archived
        </label>

        <button
          onClick={() => setCreateOpen(true)}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold hover:opacity-80"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          <Plus size={14} />
          New goal
        </button>
      </div>

      {/* Binary goals */}
      {binaryGoals.length > 0 && (
        <div className="space-y-2">
          <SectionLabel>Yes / No goals</SectionLabel>
          {binaryGoals.map((g) => (
            <GoalRow key={g.id} goal={g} />
          ))}
        </div>
      )}

      {milestoneGoals.length > 0 && (
        <div className="space-y-2">
          <SectionLabel>Milestone goals</SectionLabel>
          {milestoneGoals.map((g) => (
            <GoalRow key={g.id + "-" + (g.current_value ?? "")} goal={g} />
          ))}
        </div>
      )}

      {filtered && filtered.length === 0 && (
        <EmptyState message={`No goals for ${year}. Create one to get started.`} />
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="New goal">
        <GoalForm
          onSubmit={handleCreate}
          onCancel={() => setCreateOpen(false)}
          isPending={createMutation.isPending}
        />
      </Dialog>
    </div>
  );
}
