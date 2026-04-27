type Direction = "at_least" | "at_most" | "track";

interface ProgressBarProps {
  current: number;
  target: number;
  direction: Direction;
}

export function ProgressBar({ current, target, direction }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const isGood = direction === "at_least" ? pct >= 100 : direction === "at_most" ? pct <= 100 : false;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: isGood && pct >= 100 ? "#22c55e" : "var(--accent)" }}
        />
      </div>
      <span className="text-xs tabular-nums shrink-0" style={{ color: "var(--text)", minWidth: "36px" }}>
        {pct}%
      </span>
    </div>
  );
}
