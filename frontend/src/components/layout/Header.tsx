import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { SearchTrigger } from "./SearchTrigger";
import { SidebarToggle } from "./SidebarToggle";

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenPalette: () => void;
}

export function Header({ onToggleSidebar, onOpenPalette }: HeaderProps) {
  return (
    <header
      className="flex h-14 shrink-0 items-center gap-2 border-b px-3"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <SidebarToggle onToggle={onToggleSidebar} />
      <div className="flex-1" />
      <SearchTrigger onOpen={onOpenPalette} />
      <KeyboardShortcuts />
    </header>
  );
}
