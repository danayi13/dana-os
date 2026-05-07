import { useState } from "react";
import type { KeyboardEvent } from "react";
import { FormButton } from "@/components/ui/FormButton";
import { FormInputField } from "@/components/ui/FormInputField";
import { FormTextareaField } from "@/components/ui/FormTextareaField";
import { FormFieldLabel } from "@/components/ui/FormFieldLabel";
import { Select } from "@/components/ui/Select";
import { Tag } from "@/components/ui/Tag";
import { V_GRADES, type ClimbingSessionCreate, type ClimbingSessionUpdate, type Gym } from "@/lib/climbing-api";
import { localDateStr } from "@/lib/dateUtils";

interface SessionFormProps {
  gyms: Gym[];
  initial?: Partial<ClimbingSessionCreate>;
  onSubmit: (data: ClimbingSessionCreate | ClimbingSessionUpdate) => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function SessionForm({ gyms, initial, onSubmit, isLoading, submitLabel = "Save" }: SessionFormProps) {
  const today = localDateStr(new Date());
  const [date, setDate] = useState(initial?.date ?? today);
  const [gymId, setGymId] = useState(initial?.gym_id ?? "");
  const [duration, setDuration] = useState(
    initial?.duration_minutes != null ? String(initial.duration_minutes) : ""
  );
  const [maxGrade, setMaxGrade] = useState(initial?.max_grade ?? "");
  const [companions, setCompanions] = useState<string[]>(initial?.companions ?? []);
  const [companionInput, setCompanionInput] = useState("");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function addCompanion() {
    const name = companionInput.trim();
    if (name && !companions.includes(name)) {
      setCompanions([...companions, name]);
    }
    setCompanionInput("");
  }

  function handleCompanionKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCompanion();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Flush any pending companion input
    const finalCompanions = [...companions];
    const pending = companionInput.trim();
    if (pending && !finalCompanions.includes(pending)) finalCompanions.push(pending);

    onSubmit({
      date,
      gym_id: gymId || undefined,
      duration_minutes: duration ? parseInt(duration, 10) : undefined,
      max_grade: (maxGrade as ClimbingSessionCreate["max_grade"]) || undefined,
      companions: finalCompanions.length > 0 ? finalCompanions : undefined,
      notes: notes || undefined,
    });
  }

  const recurringGyms = gyms.filter((g) => g.gym_type === "recurring");
  const infrequentGyms = gyms.filter((g) => g.gym_type === "infrequent");

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <FormFieldLabel required>Date</FormFieldLabel>
        <FormInputField
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <FormFieldLabel>Gym</FormFieldLabel>
        <Select value={gymId} onChange={(e) => setGymId(e.target.value)}>
          <option value="">— no gym selected —</option>
          {recurringGyms.length > 0 && (
            <optgroup label="Recurring">
              {recurringGyms.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </optgroup>
          )}
          {infrequentGyms.length > 0 && (
            <optgroup label="Infrequent">
              {infrequentGyms.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}{g.location ? ` (${g.location})` : ""}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <FormFieldLabel>Duration (min)</FormFieldLabel>
          <FormInputField
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="e.g. 90"
          />
        </div>

        <div className="space-y-1.5">
          <FormFieldLabel>Max grade</FormFieldLabel>
          <Select value={maxGrade} onChange={(e) => setMaxGrade(e.target.value)}>
            <option value="">— unknown —</option>
            {V_GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <FormFieldLabel>Went with</FormFieldLabel>
        <div className="flex gap-2">
          <FormInputField
            type="text"
            value={companionInput}
            onChange={(e) => setCompanionInput(e.target.value)}
            onKeyDown={handleCompanionKeyDown}
            placeholder="Add a name, press Enter"
            className="flex-1"
          />
          <FormButton intent="secondary" type="button" onClick={addCompanion}>
            Add
          </FormButton>
        </div>
        {companions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {companions.map((name) => (
              <Tag
                key={name}
                onRemove={() => setCompanions(companions.filter((c) => c !== name))}
                removeLabel={`Remove ${name}`}
              >
                {name}
              </Tag>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <FormFieldLabel>Notes</FormFieldLabel>
        <FormTextareaField
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="How did it go?"
        />
      </div>

      <FormButton intent="submit" disabled={isLoading}>
        {isLoading ? "Saving…" : submitLabel}
      </FormButton>
    </form>
  );
}
