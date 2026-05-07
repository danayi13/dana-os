import { useState } from "react";
import { Clock } from "lucide-react";

const OPTIONS = [
  { label: "1 day", days: 1 },
  { label: "3 days", days: 3 },
  { label: "1 week", days: 7 },
  { label: "2 weeks", days: 14 },
] as const;

interface SnoozeDropdownProps {
  onSnooze: (days: number) => void;
  isPending?: boolean;
  align?: "left" | "right";
}

export function SnoozeDropdown({ onSnooze, isPending, align = "right" }: SnoozeDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-opacity hover:opacity-70 disabled:opacity-40 text-body"
        style={{ border: "1px solid var(--border)" }}
      >
        <Clock size={12} />
        Snooze
      </button>
      {open && (
        <div
          className={`absolute ${align === "left" ? "left-0" : "right-0"} top-full mt-1 z-20 rounded-lg border py-1 shadow-lg min-w-[110px]`}
          style={{ background: "var(--bg)", borderColor: "var(--border)" }}
        >
          {OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => { onSnooze(opt.days); setOpen(false); }}
              className="flex w-full px-3 py-1.5 text-xs hover:opacity-70 text-left text-heading"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
