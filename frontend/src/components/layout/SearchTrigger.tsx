import { Search } from "lucide-react";

interface SearchTriggerProps {
  onOpen: () => void;
}

export function SearchTrigger({ onOpen }: SearchTriggerProps) {
  return (
    <div className="group relative">
      <button
        onClick={onOpen}
        aria-label="Search entire app"
        className="flex items-center justify-center rounded-md p-1.5 transition-opacity hover:opacity-70"
        style={{ color: "var(--text)" }}
      >
        <Search size={16} />
      </button>
      <div
        className="pointer-events-none absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-md border px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
      >
        Open Command Palette (⌘K)
      </div>
    </div>
  );
}
