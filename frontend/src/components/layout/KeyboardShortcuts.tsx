import { useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";

const SHORTCUTS = [
  { keys: ["Cmd", "K"], description: "Open command palette" },
  { keys: ["Cmd", "B"], description: "Toggle sidebar" },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  return (
    <div ref={ref} className="group relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Keyboard shortcuts"
        aria-expanded={open}
        className="flex items-center justify-center rounded-md p-1.5 transition-opacity hover:opacity-70"
        style={{ color: "var(--text)" }}
      >
        <Keyboard size={16} />
      </button>

      {!open && (
        <div
          className="pointer-events-none absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-md border px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
        >
          Global Keyboard Shortcuts
        </div>
      )}

      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-1 w-56 rounded-lg border py-1 shadow-lg"
          style={{ background: "var(--bg)", borderColor: "var(--border)", boxShadow: "var(--shadow)" }}
        >
          <p
            className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--text)", opacity: 0.5 }}
          >
            Keyboard shortcuts
          </p>
          {SHORTCUTS.map(({ keys, description }) => (
            <div key={description} className="flex items-center justify-between px-3 py-1.5">
              <span className="text-sm" style={{ color: "var(--text)" }}>
                {description}
              </span>
              <span className="flex items-center gap-0.5">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border px-1.5 py-0.5 font-mono text-xs"
                    style={{ borderColor: "var(--border)", background: "var(--code-bg)", color: "var(--text-h)" }}
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
