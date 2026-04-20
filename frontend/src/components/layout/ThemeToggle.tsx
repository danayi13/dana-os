import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/providers/ThemeProvider";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";

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
    <Tooltip content="Toggle dark / light mode">
      <IconButton onClick={toggle} aria-label="Toggle theme">
        {isDark(theme) ? <Sun size={16} /> : <Moon size={16} />}
      </IconButton>
    </Tooltip>
  );
}
