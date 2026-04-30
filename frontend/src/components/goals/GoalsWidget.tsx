import { useState } from "react";
import { FormInputField } from "@/components/ui/FormInputField";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { Link } from "react-router-dom";
import { Target, Circle, CheckCircle2, Loader2, Check } from "lucide-react";
import {
  useGoals,
  useCompleteGoal,
  useUncompleteGoal,
  useUpdateGoalProgress,
  type Goal,
} from "@/lib/goals-api";
import { CURRENT_YEAR } from "@/lib/dateUtils";

function MilestoneCard({ goal }: { goal: Goal }) {
  const [value, setValue] = useState(
    goal.current_value != null ? String(goal.current_value) : ""
  );
  const progressMutation = useUpdateGoalProgress(goal.id);

  function handleSave() {
    const v = parseFloat(value);
    if (isNaN(v)) return;
    progressMutation.mutate(v);
  }

  const parsed = parseFloat(value);
  const isDirty = !isNaN(parsed) && parsed !== (goal.current_value ?? 0);

  return (
    <div
      className="rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate text-heading">{goal.name}</p>
          {goal.target_value != null && (
            <div className="mt-1.5">
              <ProgressBar
                current={goal.current_value ?? 0}
                target={goal.target_value}
                direction={goal.direction}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <FormInputField
            type="number"
            step="any"
            className="w-16 px-2 py-1 text-xs text-right"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
            placeholder="0"
            style={{ borderColor: isDirty ? "var(--accent-border)" : "var(--border)" }}
          />
          {goal.target_value != null && (
            <span className="text-xs text-body">/ {goal.target_value}</span>
          )}
          <button
            onClick={handleSave}
            disabled={progressMutation.isPending || !isDirty}
            className="rounded-md p-1 hover:opacity-70 disabled:opacity-30 transition-opacity"
            style={{ color: "var(--accent)" }}
          >
            {progressMutation.isPending
              ? <Loader2 size={14} className="animate-spin" />
              : <Check size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function BinaryCard({ goal }: { goal: Goal }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [unconfirmOpen, setUnconfirmOpen] = useState(false);
  const completeMutation = useCompleteGoal();
  const uncompleteMutation = useUncompleteGoal();

  const isCompleted = goal.status === "completed";
  const isBusy = completeMutation.isPending || uncompleteMutation.isPending;

  return (
    <>
      <div
        className="rounded-xl border px-4 py-3"
        style={{
          borderColor: isCompleted ? "transparent" : "var(--border)",
          background: isCompleted ? "var(--accent-bg)" : "var(--bg)",
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => isCompleted ? setUnconfirmOpen(true) : setConfirmOpen(true)}
            disabled={isBusy}
            className="shrink-0 transition-opacity hover:opacity-70 disabled:opacity-40"
            aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
          >
            {isCompleted
              ? <CheckCircle2 size={18} style={{ color: "var(--accent)" }} />
              : <Circle size={18} className="text-body" />}
          </button>
          <p
            className="flex-1 text-sm font-medium truncate text-heading"
            style={{
              textDecoration: isCompleted ? "line-through" : "none",
              opacity: isCompleted ? 0.7 : 1,
            }}
          >
            {goal.name}
          </p>
          {isCompleted && goal.completed_at && (
            <span className="text-xs shrink-0" style={{ color: "var(--accent)" }}>
              ✓ {new Date(goal.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Mark goal complete?"
        message={<>Mark <strong className="text-heading">{goal.name}</strong> as completed?</>}
        onConfirm={() => completeMutation.mutate(goal.id, { onSuccess: () => setConfirmOpen(false) })}
        confirmLabel="Mark complete ✓"
        isPending={completeMutation.isPending}
        pendingLabel="Marking…"
      />

      <ConfirmDialog
        open={unconfirmOpen}
        onClose={() => setUnconfirmOpen(false)}
        title="Mark goal incomplete?"
        message={<>Move <strong className="text-heading">{goal.name}</strong> back to active?</>}
        onConfirm={() => uncompleteMutation.mutate(goal.id, { onSuccess: () => setUnconfirmOpen(false) })}
        confirmLabel="Mark incomplete"
        isPending={uncompleteMutation.isPending}
        pendingLabel="Updating…"
      />
    </>
  );
}

export function GoalsWidget() {
  const { data: goals, isLoading } = useGoals(CURRENT_YEAR);

  if (isLoading) return null;

  const active = goals?.filter((g) => g.status !== "archived") ?? [];
  if (active.length === 0) return null;

  const milestones = active.filter((g) => g.type === "milestone");
  const binaries = active.filter((g) => g.type === "binary");

  return (
    <CollapsibleSection
      icon={<Target size={15} style={{ color: "var(--accent)" }} />}
      title={`${CURRENT_YEAR} goals`}
      right={
        <Link
          to="/habits?tab=goals"
          className="text-xs hover:opacity-70 transition-opacity"
          style={{ color: "var(--accent)" }}
        >
          Manage →
        </Link>
      }
    >
      <>
        {milestones.length > 0 && (
          <div className="space-y-2">
            {milestones.map((g) => <MilestoneCard key={g.id + "-" + (g.current_value ?? "")} goal={g} />)}
          </div>
        )}
        {binaries.length > 0 && (
          <div className="space-y-2">
            {binaries.map((g) => <BinaryCard key={g.id} goal={g} />)}
          </div>
        )}
      </>
    </CollapsibleSection>
  );
}
