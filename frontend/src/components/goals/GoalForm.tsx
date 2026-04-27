import { useState } from "react";
import type { Goal, GoalCreate, GoalType, GoalDirection } from "@/lib/goals-api";
import { Select } from "@/components/ui/Select";
import { FormFieldLabel } from "@/components/ui/FormFieldLabel";
import { FormInputField } from "@/components/ui/FormInputField";
import { FormButton } from "@/components/ui/FormButton";
import { CURRENT_YEAR } from "@/lib/dateUtils";

interface GoalFormProps {
  initial?: Goal;
  onSubmit: (data: GoalCreate) => void;
  onCancel: () => void;
  isPending?: boolean;
}

export function GoalForm({ initial, onSubmit, onCancel, isPending }: GoalFormProps) {
  const [year, setYear] = useState(initial?.year ?? CURRENT_YEAR);
  const [type, setType] = useState<GoalType>(initial?.type ?? "binary");
  const [name, setName] = useState(initial?.name ?? "");
  const [direction, setDirection] = useState<GoalDirection>(initial?.direction ?? "at_least");
  const [targetValue, setTargetValue] = useState(
    initial?.target_value != null ? String(initial.target_value) : ""
  );
  const [currentValue, setCurrentValue] = useState(
    initial?.current_value != null ? String(initial.current_value) : ""
  );
  const [linkedModule] = useState(initial?.linked_module ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      year,
      type,
      name,
      direction,
      target_value: targetValue ? Number(targetValue) : undefined,
      current_value: currentValue ? Number(currentValue) : undefined,
      linked_module: linkedModule || undefined,
      notes: notes || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FormFieldLabel>
            Year
          </FormFieldLabel>
          <Select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {[CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
        </div>

        <div>
          <FormFieldLabel>
            Type
          </FormFieldLabel>
          <Select value={type} onChange={(e) => setType(e.target.value as GoalType)}>
            <option value="binary">Binary (yes/no)</option>
            <option value="milestone">Milestone (progress)</option>
          </Select>
        </div>
      </div>

      <div>
        <FormFieldLabel required>
          Goal name
        </FormFieldLabel>
        <FormInputField
          required
          className="w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Read 12 books"
        />
      </div>

      {type === "milestone" && (
        <>
          <div>
            <FormFieldLabel>
              Direction
            </FormFieldLabel>
            <Select value={direction} onChange={(e) => setDirection(e.target.value as GoalDirection)}>
              <option value="at_least">At least (reach a target)</option>
              <option value="at_most">At most (stay under a limit)</option>
              <option value="track">Track only (no threshold)</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormFieldLabel>
                Target value
              </FormFieldLabel>
              <FormInputField
                type="number"
                step="any"
                className="w-full"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="e.g. 12"
              />
            </div>
            <div>
              <FormFieldLabel>
                Current value
              </FormFieldLabel>
              <FormInputField
                type="number"
                step="any"
                className="w-full"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                placeholder="e.g. 0"
              />
            </div>
          </div>
        </>
      )}

      <div>
        <FormFieldLabel optional>
          Notes
        </FormFieldLabel>
        <FormInputField
          className="w-full"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any context…"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <FormButton intent="cancel" onClick={onCancel}>Cancel</FormButton>
        <FormButton intent="submit" disabled={isPending}>
          {isPending ? "Saving…" : initial ? "Save changes" : "Create goal"}
        </FormButton>
      </div>
    </form>
  );
}
