import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Dialog } from "@/components/ui/Dialog";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormButton } from "@/components/ui/FormButton";
import { FormInputField } from "@/components/ui/FormInputField";
import { FormFieldLabel } from "@/components/ui/FormFieldLabel";
import { IconButton } from "@/components/ui/IconButton";
import { Select } from "@/components/ui/Select";
import { SectionHeading } from "@/components/ui/SectionHeading";
import {
  useGyms,
  useCreateGym,
  useUpdateGym,
  useDeleteGym,
  useClimbingNudge,
  useClimbingReminder,
  useUpdateClimbingReminder,
  type Gym,
  type GymCreate,
} from "@/lib/climbing-api";

interface GymFormProps {
  name: string;
  location: string;
  gym_type: "recurring" | "infrequent";
}

function GymForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel,
}: {
  initial?: GymFormProps;
  onSubmit: (data: GymFormProps) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [gymType, setGymType] = useState<GymFormProps["gym_type"]>(initial?.gym_type ?? "recurring");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, location, gym_type: gymType });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <FormFieldLabel required>Name</FormFieldLabel>
        <FormInputField
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Brooklyn Boulders"
          required
        />
      </div>
      <div className="space-y-1.5">
        <FormFieldLabel>Location / city</FormFieldLabel>
        <FormInputField
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. New York, NY"
        />
      </div>
      <div className="space-y-1.5">
        <FormFieldLabel>Type</FormFieldLabel>
        <Select value={gymType} onChange={(e) => setGymType(e.target.value as GymFormProps["gym_type"])}>
          <option value="recurring">Recurring</option>
          <option value="infrequent">Infrequent</option>
        </Select>
        <p className="text-xs text-body">
          Recurring = your regular gym(s). Infrequent = travel / one-off gyms.
        </p>
      </div>
      <div className="flex gap-2 pt-1">
        <FormButton intent="submit" disabled={isLoading}>
          {isLoading ? "Saving…" : (submitLabel ?? "Save")}
        </FormButton>
        <FormButton intent="cancel" type="button" onClick={onCancel}>
          Cancel
        </FormButton>
      </div>
    </form>
  );
}

function GymRow({ gym, onEdit, onDelete }: { gym: Gym; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <span className="font-medium text-heading text-sm">{gym.name}</span>
        {gym.location && (
          <span className="text-body text-xs ml-2">{gym.location}</span>
        )}
      </div>
      <div className="flex gap-1">
        <IconButton onClick={onEdit} title="Edit gym" aria-label="Edit gym">
          <Pencil size={14} />
        </IconButton>
        <IconButton onClick={onDelete} title="Delete gym" aria-label="Delete gym">
          <Trash2 size={14} />
        </IconButton>
      </div>
    </div>
  );
}

function GymSection({
  title,
  gyms,
  onEdit,
  onDelete,
}: {
  title: string;
  gyms: Gym[];
  onEdit: (g: Gym) => void;
  onDelete: (g: Gym) => void;
}) {
  if (gyms.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-body uppercase tracking-wide mb-1">{title}</p>
      <Card padding="sm">
        {gyms.map((g, i) => (
          <div key={g.id} className={i > 0 ? "border-t border-[var(--border)]" : ""}>
            <GymRow gym={g} onEdit={() => onEdit(g)} onDelete={() => onDelete(g)} />
          </div>
        ))}
      </Card>
    </div>
  );
}

const INTERVAL_OPTIONS = [7, 14, 21, 28];

function ReminderSettings() {
  const { data: nudge } = useClimbingNudge();
  const { data: reminder } = useClimbingReminder();
  const updateReminder = useUpdateClimbingReminder();

  function countdownLabel(): string {
    if (!reminder?.enabled) return "Reminders disabled";
    if (!nudge) return "—";

    if (nudge.nudge_state === "snoozed" && nudge.snoozed_until) {
      const until = new Date(nudge.snoozed_until).toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return `Snoozed until ${until}`;
    }
    if (nudge.is_stale) return "Overdue now";
    if (nudge.days_since_last == null) return "No sessions logged yet";

    const daysLeft = (reminder?.interval_days ?? 14) - nudge.days_since_last;
    if (daysLeft <= 0) return "Overdue now";
    return `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
  }

  const label = countdownLabel();
  const isOverdue = label === "Overdue now";

  return (
    <div className="space-y-3">
      <SectionHeading>Reminder</SectionHeading>
      <Card padding="sm">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-heading">Nudge interval</p>
            <p className="text-xs" style={{ color: isOverdue ? "#ef4444" : "var(--text)" }}>
              {label}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={String(reminder?.interval_days ?? 14)}
              onChange={(e) => updateReminder.mutate({ interval_days: parseInt(e.target.value, 10) })}
              className="text-xs py-1 px-2 h-auto w-auto"
            >
              {INTERVAL_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} days</option>
              ))}
            </Select>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function GymAdmin() {
  const { data: gyms = [], isLoading } = useGyms();
  const createGym = useCreateGym();
  const updateGym = useUpdateGym();
  const deleteGym = useDeleteGym();

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Gym | null>(null);
  const [deleting, setDeleting] = useState<Gym | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const recurring = gyms.filter((g) => g.gym_type === "recurring");
  const infrequent = gyms.filter((g) => g.gym_type === "infrequent");

  function handleCreate(data: GymFormProps) {
    createGym.mutate(data as GymCreate, {
      onSuccess: () => setShowAdd(false),
    });
  }

  function handleUpdate(data: GymFormProps) {
    if (!editing) return;
    updateGym.mutate(
      { id: editing.id, body: data },
      { onSuccess: () => setEditing(null) }
    );
  }

  function handleDelete() {
    if (!deleting) return;
    setDeleteError(null);
    deleteGym.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
      onError: (err) => setDeleteError((err as Error).message ?? "Failed to delete gym"),
    });
  }

  if (isLoading) return <p className="text-body text-sm">Loading gyms…</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <SectionHeading>Gyms</SectionHeading>
        <FormButton intent="secondary" onClick={() => setShowAdd(true)}>
          + Add gym
        </FormButton>
      </div>

      {gyms.length === 0 ? (
        <EmptyState message="No gyms added yet. Add your first gym above." />
      ) : (
        <div className="space-y-4">
          <GymSection title="Recurring" gyms={recurring} onEdit={setEditing} onDelete={setDeleting} />
          <GymSection title="Infrequent" gyms={infrequent} onEdit={setEditing} onDelete={setDeleting} />
        </div>
      )}

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add gym">
        <GymForm
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
          isLoading={createGym.isPending}
          submitLabel="Add gym"
        />
      </Dialog>

      <Dialog open={!!editing} onClose={() => setEditing(null)} title="Edit gym">
        {editing && (
          <GymForm
            initial={{
              name: editing.name,
              location: editing.location ?? "",
              gym_type: editing.gym_type,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            isLoading={updateGym.isPending}
            submitLabel="Save changes"
          />
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => { setDeleting(null); setDeleteError(null); }}
        title="Delete gym"
        message={`Delete "${deleting?.name}"? This cannot be undone. Sessions linked to this gym must be reassigned first.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isPending={deleteGym.isPending}
      />
      {deleteError && (
        <p className="text-sm text-error mt-1">{deleteError}</p>
      )}

      <ReminderSettings />
    </div>
  );
}
