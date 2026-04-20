import { forwardRef } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  hidden?: boolean;
  side?: "left" | "right";
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  ({ content, children, hidden = false, side = "right" }, ref) => (
    <div ref={ref} className="group relative">
      {children}
      {!hidden && (
        <div
          className={`pointer-events-none absolute top-full z-50 mt-1 whitespace-nowrap rounded-md border px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100 ${side === "left" ? "left-0" : "right-0"}`}
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          {content}
        </div>
      )}
    </div>
  )
);

Tooltip.displayName = "Tooltip";
