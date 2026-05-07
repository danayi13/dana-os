import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X, Pencil } from "lucide-react";
import { ClimbingDashboard } from "@/components/climbing/ClimbingDashboard";
import { SnoozeDropdown } from "@/components/ui/SnoozeDropdown";
import { GymAdmin } from "@/components/climbing/GymAdmin";
import { SessionForm } from "@/components/climbing/SessionForm";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { IconButton } from "@/components/ui/IconButton";
import { LoadingText } from "@/components/ui/LoadingText";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Select } from "@/components/ui/Select";
import { TabBar } from "@/components/ui/TabBar";
import {
  useGyms,
  useClimbingSessions,
  useCreateSession,
  useUpdateSession,
  useDeleteSession,
  useClimbingNudge,
  useClimbingReminder,
  useUpdateClimbingReminder,
  useSnoozClimbingNudge,
  useDismissClimbingNudge,
  type ClimbingSession,
} from "@/lib/climbing-api";
import { useSheetUrls } from "@/lib/config-api";


const TABS = [
  { id: "log", label: "Log" },
  { id: "dashboard", label: "Dashboard" },
  { id: "gyms", label: "Gyms" },
] as const;
type TabId = "log" | "dashboard" | "gyms";

// ── Nudge Banner ──────────────────────────────────────────────────────────────

function NudgeBanner() {
  const { data: nudge } = useClimbingNudge();
  const { data: reminder } = useClimbingReminder();
  const updateReminder = useUpdateClimbingReminder();
  const snooze = useSnoozClimbingNudge();
  const dismiss = useDismissClimbingNudge();

  if (!nudge?.is_stale) return null;

  const days = nudge.days_since_last;
  const intervalOptions = [7, 14, 21, 28];

  return (
    <div className="rounded-lg border px-4 py-3 flex items-start justify-between gap-3 text-sm" style={{ background: "var(--nudge-bg)", borderColor: "var(--nudge-border)" }}>
      <div className="space-y-1">
        <p className="text-heading font-medium">
          Time to climb!{" "}
          {days != null ? `It's been ${days} day${days === 1 ? "" : "s"} since your last session.` : "No sessions logged yet."}
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-body text-xs">
            Nudge interval:{" "}
            <Select
              value={String(reminder?.interval_days ?? 14)}
              onChange={(e) =>
                updateReminder.mutate({ interval_days: parseInt(e.target.value, 10) })
              }
              className="text-xs py-0.5 px-2 h-auto inline-block w-auto"
            >
              {intervalOptions.map((n) => (
                <option key={n} value={n}>
                  {n} days
                </option>
              ))}
            </Select>
          </span>
          <SnoozeDropdown onSnooze={(d) => snooze.mutate(d)} isPending={snooze.isPending} align="left" />
          <button
            className="text-xs text-body hover:text-heading underline"
            onClick={() => dismiss.mutate()}
          >
            Dismiss
          </button>
        </div>
      </div>
      <IconButton onClick={() => dismiss.mutate()} aria-label="Dismiss nudge">
        <X size={14} />
      </IconButton>
    </div>
  );
}

// ── Session List ──────────────────────────────────────────────────────────────

function SessionRow({
  session,
  onDelete,
}: {
  session: ClimbingSession;
  onDelete: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const deleteSession = useDeleteSession();
  const updateSession = useUpdateSession();
  const { data: gyms = [] } = useGyms();
  const { data: sheetUrls } = useSheetUrls();

  return (
    <>
      <div className="flex items-start justify-between py-2.5 gap-3">
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-heading text-sm">{session.date}</span>
            {session.gym_name && (
              <span className="text-xs text-body">{session.gym_name}</span>
            )}
            {session.max_grade && (
              <span className="text-xs bg-subtle px-1.5 py-0.5 rounded font-semibold text-heading">
                {session.max_grade}
              </span>
            )}
            {session.duration_minutes != null && (
              <span className="text-xs text-body">{session.duration_minutes} min</span>
            )}
          </div>
          {session.companions && session.companions.length > 0 && (
            <p className="text-xs text-body">With: {session.companions.join(", ")}</p>
          )}
          {session.notes && (
            <p className="text-xs text-body truncate">{session.notes}</p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <IconButton onClick={() => setEditing(true)} aria-label="Edit session">
            <Pencil size={14} />
          </IconButton>
          <IconButton onClick={() => setConfirmDelete(true)} aria-label="Delete session">
            <X size={14} />
          </IconButton>
        </div>
      </div>
      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit session">
        <SessionForm
          gyms={gyms}
          isLoading={updateSession.isPending}
          submitLabel="Save changes"
          initial={{
            date: session.date,
            gym_id: session.gym_id ?? undefined,
            duration_minutes: session.duration_minutes ?? undefined,
            max_grade: session.max_grade ?? undefined,
            companions: session.companions ?? undefined,
            notes: session.notes ?? undefined,
          }}
          onSubmit={(data) =>
            updateSession.mutate(
              { id: session.id, body: data },
              { onSuccess: () => setEditing(false) }
            )
          }
        />
      </Dialog>
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete session"
        message={
          <span>
            Delete the session on {session.date}? This cannot be undone.{" "}
            <span className="block mt-1 text-xs text-error">
              Remember to also delete this row from{" "}
              {sheetUrls?.climbing ? (
                <a href={sheetUrls.climbing} target="_blank" rel="noreferrer" className="underline hover:opacity-70">
                  the sheet
                </a>
              ) : "the sheet"}.
            </span>
          </span>
        }
        confirmLabel="Delete"
        onConfirm={() => {
          deleteSession.mutate(session.id, {
            onSuccess: () => { setConfirmDelete(false); onDelete(session.id); },
          });
        }}
        isPending={deleteSession.isPending}
      />
    </>
  );
}

// ── Log Tab ───────────────────────────────────────────────────────────────────

function LogTab() {
  const { data: gyms = [] } = useGyms();
  const { data: sessions = [], isLoading } = useClimbingSessions();
  const createSession = useCreateSession();
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="space-y-6">
      <section>
        <SectionHeading className="mb-3">Log a session</SectionHeading>
        <SessionForm
          key={formKey}
          gyms={gyms}
          isLoading={createSession.isPending}
          onSubmit={(data) =>
            createSession.mutate(
              data as Parameters<typeof createSession.mutate>[0],
              { onSuccess: () => setFormKey((k) => k + 1) }
            )
          }
        />
        {createSession.isError && (
          <p className="text-sm mt-2 text-error">
            {(createSession.error as Error)?.message ?? "Something went wrong"}
          </p>
        )}
      </section>

      <section>
        <SectionHeading className="mb-3">Recent sessions</SectionHeading>
        {isLoading ? (
          <LoadingText message="Loading sessions…" />
        ) : sessions.length === 0 ? (
          <EmptyState message="No sessions logged yet." />
        ) : (
          <Card padding="sm">
            {sessions.map((s, i) => (
              <div key={s.id} className={i > 0 ? "border-t border-[var(--border)]" : ""}>
                <SessionRow session={s} onDelete={() => {}} />
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ClimbingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId | null) ?? "log";
  const { data: sheetUrls } = useSheetUrls();

  return (
    <div className="max-w-2xl space-y-5">
      <PageTitle sheetUrl={sheetUrls?.climbing} sheetLabel="Climbing Spreadsheet">Climbing</PageTitle>
      <NudgeBanner />
      <TabBar
        tabs={TABS}
        activeTab={activeTab}
        onChange={(tab) => setSearchParams({ tab }, { replace: true })}
      />
      {activeTab === "log" && <LogTab />}
      {activeTab === "dashboard" && <ClimbingDashboard />}
      {activeTab === "gyms" && <GymAdmin />}
    </div>
  );
}
