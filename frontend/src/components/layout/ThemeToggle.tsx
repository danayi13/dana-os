import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";

function isDark(theme: string) {
  return (
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggle = () => setTheme(isDark(theme) ? "light" : "dark");

  return (
    <div className="group relative">
      <button
        onClick={toggle}
        aria-label="Toggle theme"
        className="flex items-center justify-center rounded-md p-1.5 transition-opacity hover:opacity-70"
        style={{ color: "var(--text)" }}
      >
        {isDark(theme) ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <div
        className="pointer-events-none absolute right-0 top-full z-50 mt-1 whitespace-nowrap rounded-md border px-2 py-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }}
      >
        Toggle dark / light mode
      </div>
    </div>
  );
}
