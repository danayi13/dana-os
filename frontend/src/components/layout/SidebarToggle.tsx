import { PanelLeft } from "lucide-react";

interface SidebarToggleProps {
  onToggle: () => void;
}

export function SidebarToggle({ onToggle }: SidebarToggleProps) {
  return (
    <button
      onClick={onToggle}
      aria-label="Toggle sidebar"
      className="flex items-center justify-center rounded-md p-1.5 transition-opacity hover:opacity-70"
      style={{ color: "var(--text)" }}
    >
      <PanelLeft size={16} />
    </button>
  );
}
