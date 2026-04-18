import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { CommandPalette } from "@/commands/CommandPalette";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const toggleSidebar = useCallback(() => setSidebarOpen((prev) => !prev), []);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // ⌘B / Ctrl+B — toggle sidebar
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
        return;
      }
      // ⌘K / Ctrl+K — command palette
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {sidebarOpen && <Sidebar />}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onToggleSidebar={toggleSidebar} onOpenPalette={openPalette} />
        <main
          className="flex-1 overflow-y-auto p-6"
          style={{ background: "var(--bg)" }}
        >
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={closePalette} />
    </div>
  );
}
