import { useState } from "react";
import { FormInputField } from "@/components/ui/FormInputField";
import { localDateStr, localTodayStr } from "@/lib/dateUtils";

export type DateRangeValue =
  | { type: "preset"; days: number }
  | { type: "custom"; start: string; end: string };

// eslint-disable-next-line react-refresh/only-export-components
export function computeDateRange(v: DateRangeValue): { start: string; end: string } {
  if (v.type === "custom") return { start: v.start, end: v.end };
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (v.days - 1));
  return { start: localDateStr(start), end: localDateStr(end) };
}

export interface DateRangePreset {
  label: string;
  days: number;
}

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  presets: DateRangePreset[];
}

export function DateRangePicker({ value, onChange, presets }: DateRangePickerProps) {
  const today = localTodayStr();

  // Custom input state — kept in sync when switching to custom mode
  const [customStart, setCustomStart] = useState(() => {
    if (value.type === "custom") return value.start;
    return computeDateRange(value).start;
  });
  const [customEnd, setCustomEnd] = useState(() => {
    if (value.type === "custom") return value.end;
    return today;
  });

  function activateCustom() {
    if (value.type === "preset") {
      const range = computeDateRange(value);
      setCustomStart(range.start);
      setCustomEnd(range.end);
      onChange({ type: "custom", start: range.start, end: range.end });
    }
  }

  function updateCustomStart(s: string) {
    setCustomStart(s);
    if (value.type === "custom") onChange({ type: "custom", start: s, end: customEnd });
  }

  function updateCustomEnd(e: string) {
    setCustomEnd(e);
    if (value.type === "custom") onChange({ type: "custom", start: customStart, end: e });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {presets.map(({ label, days }) => (
          <button
            key={days}
            onClick={() => onChange({ type: "preset", days })}
            className="rounded-md px-2 py-0.5 text-xs font-medium transition-all"
            style={{
              background:
                value.type === "preset" && value.days === days ? "var(--accent)" : "var(--code-bg)",
              color:
                value.type === "preset" && value.days === days ? "#fff" : "var(--text)",
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={activateCustom}
          className="rounded-md px-2 py-0.5 text-xs font-medium transition-all"
          style={{
            background: value.type === "custom" ? "var(--accent)" : "var(--code-bg)",
            color: value.type === "custom" ? "#fff" : "var(--text)",
          }}
        >
          Custom
        </button>
      </div>

      {value.type === "custom" && (
        <div className="flex items-center gap-1.5">
          <FormInputField
            type="date"
            max={today}
            className="px-2 py-0.5 text-xs"
            value={customStart}
            onChange={(e) => updateCustomStart(e.target.value)}
          />
          <span className="text-xs" style={{ color: "var(--text)" }}>→</span>
          <FormInputField
            type="date"
            max={today}
            className="px-2 py-0.5 text-xs"
            value={customEnd}
            onChange={(e) => updateCustomEnd(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
