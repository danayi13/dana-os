import { useState } from "react";
import { Bell, X, Clock } from "lucide-react";
import { useStaleHabits, useSnoozeNudge, useDismissNudge } from "@/lib/nudges-api";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { StaleHabit } from "@/lib/nudges-api";

const SNOOZE_OPTIONS: Array<{ label: string; days: 1 | 3 | 7 | 14 }> = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
];

function NudgeCard({ nudge }: { nudge: StaleHabit }) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [dismissConfirm, setDismissConfirm] = useState(false);

  const snoozeMutation = useSnoozeNudge();
  const dismissMutation = useDismissNudge();

  function handleSnooze(days: 1 | 3 | 7 | 14) {
    snoozeMutation.mutate(
      { habitId: nudge.habit_id, days },
      { onSuccess: () => setSnoozeOpen(false) }
    );
  }

  function handleDismiss() {
    dismissMutation.mutate(nudge.habit_id, {
      onSuccess: () => setDismissConfirm(false),
    });
  }

  return (
    <div
      className="flex items-center gap-3 rounded-xl border px-4 py-3"
      style={{ borderColor: "var(--border)", background: "var(--social-bg)" }}
    >
      <Bell size={14} style={{ color: "var(--accent)", flexShrink: 0 }} />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "var(--text-h)" }}>
          {nudge.habit_name}
        </p>
        <p className="text-xs" style={{ color: "var(--text)" }}>
          {nudge.last_logged
            ? `Last logged ${nudge.days_since_logged}d ago`
            : "Never logged"}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0 relative">
        {/* Snooze button */}
        <div className="relative">
          <button
            onClick={() => {
              setSnoozeOpen((v) => !v);
              setDismissConfirm(false);
            }}
            title="Snooze nudge"
            disabled={snoozeMutation.isPending}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: "var(--text)", border: "1px solid var(--border)" }}
          >
            <Clock size={12} />
            Snooze
          </button>

          {snoozeOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-20 rounded-lg border py-1 shadow-lg min-w-[110px]"
              style={{ background: "var(--bg)", borderColor: "var(--border)" }}
            >
              {SNOOZE_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  onClick={() => handleSnooze(opt.days)}
                  className="flex w-full px-3 py-1.5 text-xs hover:opacity-70 text-left"
                  style={{ color: "var(--text-h)" }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        <div className="relative">
          <button
            onClick={() => {
              setDismissConfirm((v) => !v);
              setSnoozeOpen(false);
            }}
            title="Dismiss nudge"
            disabled={dismissMutation.isPending}
            className="rounded-md p-1.5 transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: "var(--text)" }}
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
              <p className="text-xs mb-2" style={{ color: "var(--text-h)" }}>
                Dismiss this nudge? It'll reactivate when you next log this habit.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDismissConfirm(false)}
                  className="text-xs hover:opacity-70"
                  style={{ color: "var(--text)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-xs font-semibold hover:opacity-80"
                  style={{ color: "#ef4444" }}
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

  if (isLoading || !stale || stale.length === 0) return null;

  return (
    <div className="space-y-2">
      <SectionLabel>Nudges</SectionLabel>
      <div className="space-y-1.5">
        {stale.map((nudge) => (
          <NudgeCard key={nudge.habit_id} nudge={nudge} />
        ))}
      </div>
    </div>
  );
}
