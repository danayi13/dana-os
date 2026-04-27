import { useState } from "react";
import type { HabitDefinition, HabitDefinitionCreate, PeriodType, Direction } from "@/lib/habits-api";
import { Select } from "@/components/ui/Select";
import { FormFieldLabel } from "@/components/ui/FormFieldLabel";
import { FormInputField } from "@/components/ui/FormInputField";
import { FormButton } from "@/components/ui/FormButton";
import { SectionLabel } from "@/components/ui/SectionLabel";

interface HabitFormProps {
  initial?: HabitDefinition;
  onSubmit: (data: HabitDefinitionCreate) => void;
  onCancel: () => void;
  isPending?: boolean;
}

const PERIOD_LABELS: Record<PeriodType, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  custom: "Custom",
};

const DIRECTION_LABELS: Record<Direction, string> = {
  at_least: "At least",
  at_most: "At most",
  track: "Track only",
};

const SHEET_TYPES = ["checkbox", "numeric", "text"];

export function HabitForm({ initial, onSubmit, onCancel, isPending }: HabitFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [periodType, setPeriodType] = useState<PeriodType>(initial?.period_type ?? "daily");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [target, setTarget] = useState(initial?.target != null ? String(initial.target) : "");
  const [direction, setDirection] = useState<Direction>(initial?.direction ?? "at_least");
  const [sheetCol, setSheetCol] = useState(initial?.period_config?.sheet_col ?? "");
  const [sheetType, setSheetType] = useState(initial?.period_config?.sheet_type ?? "checkbox");

  const isNumeric = unit.trim().length > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      name,
      description: description || undefined,
      period_type: periodType,
      unit: unit || undefined,
      // target and direction only apply to numeric habits
      target: isNumeric && target ? Number(target) : undefined,
      direction: isNumeric ? direction : "at_least",
      period_config: sheetCol ? { sheet_col: sheetCol, sheet_type: sheetType } : undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <FormFieldLabel required>
          Name
        </FormFieldLabel>
        <FormInputField
          required
          className="w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Morning run"
        />
      </div>

      <div>
        <FormFieldLabel>
          Description
        </FormFieldLabel>
        <FormInputField
          className="w-full"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional note"
        />
      </div>

      <div>
        <FormFieldLabel>
          Period
        </FormFieldLabel>
        <Select value={periodType} onChange={(e) => setPeriodType(e.target.value as PeriodType)}>
          {Object.entries(PERIOD_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </Select>
      </div>

      {/* Unit — if left blank the habit is binary (checkbox) */}
      <div>
        <FormFieldLabel>
          Unit
          <span className="ml-1.5 font-normal text-xs" style={{ color: "var(--text)" }}>
            — leave blank for a simple checkbox habit
          </span>
        </FormFieldLabel>
        <FormInputField
          className="w-full"
          value={unit}
          onChange={(e) => {
            setUnit(e.target.value);
            if (!e.target.value) { setTarget(""); setDirection("at_least"); }
          }}
          placeholder="km, reps, min… (optional)"
        />
      </div>

      {/* Target + direction — only shown when a unit is set */}
      {isNumeric && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormFieldLabel>
              Target
            </FormFieldLabel>
            <FormInputField
              type="number"
              step="any"
              className="w-full"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder={`e.g. 5 ${unit}`}
            />
          </div>
          <div>
            <FormFieldLabel>
              Direction
            </FormFieldLabel>
            <Select value={direction} onChange={(e) => setDirection(e.target.value as Direction)}>
              {Object.entries(DIRECTION_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </Select>
          </div>
        </div>
      )}

      {/* Sheets sync */}
      <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "var(--border)" }}>
        <SectionLabel variant="subtle">Sheets sync (optional)</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text)" }}>Column</label>
            <FormInputField
              className="w-full"
              value={sheetCol}
              onChange={(e) => setSheetCol(e.target.value)}
              placeholder="B"
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text)" }}>Type</label>
            <Select value={sheetType} onChange={(e) => setSheetType(e.target.value)}>
              {SHEET_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <FormButton intent="cancel" onClick={onCancel}>Cancel</FormButton>
        <FormButton intent="submit" disabled={isPending}>
          {isPending ? "Saving…" : initial ? "Save changes" : "Create habit"}
        </FormButton>
      </div>
    </form>
  );
}
