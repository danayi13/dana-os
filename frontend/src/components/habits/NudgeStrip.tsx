import { useState } from "react";
import { Bell, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useStaleHabits, useSnoozeNudge, useDismissNudge } from "@/lib/nudges-api";
import { useClimbingNudge, useSnoozClimbingNudge, useDismissClimbingNudge } from "@/lib/climbing-api";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { SnoozeDropdown } from "@/components/ui/SnoozeDropdown";
import type { StaleHabit } from "@/lib/nudges-api";

function NudgeCard({ nudge }: { nudge: StaleHabit }) {
  const [dismissConfirm, setDismissConfirm] = useState(false);

  const snoozeMutation = useSnoozeNudge();
  const dismissMutation = useDismissNudge();

  function handleSnooze(days: number) {
    snoozeMutation.mutate({ habitId: nudge.habit_id, days: days as 1 | 3 | 7 | 14 });
  }

  function handleDismiss() {
    dismissMutation.mutate(nudge.habit_id, {
      onSuccess: () => setDismissConfirm(false),
    });
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--nudge-border)", background: "var(--nudge-bg)" }}
    >
      <Bell size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-heading">{nudge.habit_name}</p>
        <p className="text-xs text-body">
          {nudge.last_logged
            ? `Last logged ${nudge.days_since_logged}d ago`
            : "Never logged"}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0 relative">
        <SnoozeDropdown onSnooze={handleSnooze} isPending={snoozeMutation.isPending} />

        {/* Dismiss button */}
        <div className="relative">
          <button
            onClick={() => setDismissConfirm((v) => !v)}
            title="Dismiss nudge"
            disabled={dismissMutation.isPending}
            className="rounded-md p-1.5 transition-opacity hover:opacity-70 disabled:opacity-40 text-body"
          >
            <X size={14} />
          </button>

          {dismissConfirm && (
            <div
              className="absolute right-0 top-full mt-1 z-20 rounded-lg border p-3 shadow-lg"
              style={{
                background: "var(--bg)",
                borderColor: "var(--border)",
                minWidth: "180px",
              }}
            >
              <p className="text-xs mb-2 text-heading">
                Dismiss this nudge? It'll reactivate when you next log this habit.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDismissConfirm(false)}
                  className="text-xs hover:opacity-70 text-body"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-xs font-semibold hover:opacity-80 text-error"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ClimbingNudgeCard() {
  const { data: nudge } = useClimbingNudge();
  const snooze = useSnoozClimbingNudge();
  const dismiss = useDismissClimbingNudge();
  const [dismissConfirm, setDismissConfirm] = useState(false);

  if (!nudge?.is_stale) return null;

  const days = nudge.days_since_last;

  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--nudge-border)", background: "var(--nudge-bg)" }}
    >
      <Bell size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />

      <div className="flex-1 min-w-0">
        <Link to="/climbing" className="text-sm font-medium text-heading hover:opacity-70 transition-opacity">
          Climbing
        </Link>
        <p className="text-xs text-body">
          {days != null ? `Last session ${days}d ago` : "No sessions logged yet"}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0 relative">
        <SnoozeDropdown onSnooze={(d) => snooze.mutate(d)} isPending={snooze.isPending} />

        <div className="relative">
          <button
            onClick={() => setDismissConfirm((v) => !v)}
            title="Dismiss nudge"
            disabled={dismiss.isPending}
            className="rounded-md p-1.5 transition-opacity hover:opacity-70 disabled:opacity-40 text-body"
          >
            <X size={14} />
          </button>
          {dismissConfirm && (
            <div
              className="absolute right-0 top-full mt-1 z-20 rounded-lg border p-3 shadow-lg"
              style={{ background: "var(--bg)", borderColor: "var(--border)", minWidth: "180px" }}
            >
              <p className="text-xs mb-2 text-heading">
                Dismiss this nudge? It'll reactivate after your next climbing session.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setDismissConfirm(false)} className="text-xs hover:opacity-70 text-body">
                  Cancel
                </button>
                <button
                  onClick={() => dismiss.mutate(undefined, { onSuccess: () => setDismissConfirm(false) })}
                  className="text-xs font-semibold hover:opacity-80 text-error"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NudgeStrip() {
  const { data: stale, isLoading } = useStaleHabits();
  const { data: climbingNudge } = useClimbingNudge();

  const hasHabitNudges = stale && stale.length > 0;
  const hasClimbingNudge = climbingNudge?.is_stale;

  if (isLoading || (!hasHabitNudges && !hasClimbingNudge)) return null;

  return (
    <div className="space-y-2">
      <SectionLabel>Nudges</SectionLabel>
      <div className="space-y-1.5">
        {(stale ?? []).map((nudge) => (
          <NudgeCard key={nudge.habit_id} nudge={nudge} />
        ))}
        <ClimbingNudgeCard />
      </div>
    </div>
  );
}
