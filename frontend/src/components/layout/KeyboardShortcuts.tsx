import { useEffect, useRef, useState } from "react";
import { Keyboard } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Tooltip } from "@/components/ui/Tooltip";

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
    <Tooltip ref={ref} content="Global Keyboard Shortcuts" hidden={open}>
      <IconButton
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Keyboard shortcuts"
        aria-expanded={open}
      >
        <Keyboard size={16} />
      </IconButton>

      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-1 w-56 rounded-lg border py-1 shadow-lg"
          style={{ background: "var(--bg)", borderColor: "var(--border)", boxShadow: "var(--shadow)" }}
        >
          <SectionLabel variant="wide" className="px-3 pb-1 pt-2" style={{ opacity: 0.5 }}>
            Keyboard shortcuts
          </SectionLabel>
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
    </Tooltip>
  );
}
