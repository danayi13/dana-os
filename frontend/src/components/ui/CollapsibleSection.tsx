import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ icon, title, right, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          {open
            ? <ChevronDown size={14} style={{ color: "var(--text)" }} />
            : <ChevronRight size={14} style={{ color: "var(--text)" }} />}
          {icon}
          <p className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>{title}</p>
        </button>
        {right}
      </div>
      {open && children}
    </div>
  );
}
