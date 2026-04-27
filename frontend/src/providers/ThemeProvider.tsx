import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const THEME_KEY = "dana-os-theme";
const ACCENT_KEY = "dana-os-accent";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!m) return null;
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(THEME_KEY) as Theme | null) ?? "system";
    } catch {
      return "system";
    }
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    try {
      return localStorage.getItem(ACCENT_KEY) ?? "";
    } catch {
      return "";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (theme !== "system") root.classList.add(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    if (accentColor) {
      const rgb = hexToRgb(accentColor);
      root.style.setProperty("--accent", accentColor);
      if (rgb) {
        root.style.setProperty("--accent-bg", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
        root.style.setProperty("--accent-border", `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`);
      }
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-bg");
      root.style.removeProperty("--accent-border");
    }
    localStorage.setItem(ACCENT_KEY, accentColor);
  }, [accentColor]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme: setThemeState,
        accentColor,
        setAccentColor: setAccentColorState,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
