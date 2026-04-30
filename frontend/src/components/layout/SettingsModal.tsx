import { useState } from "react";
import { Settings } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { useTheme } from "@/providers/ThemeProvider";

const ACCENT_PRESETS = [
  { color: "#aa3bff", label: "Purple" },
  { color: "#6366f1", label: "Indigo" },
  { color: "#3b82f6", label: "Blue" },
  { color: "#10b981", label: "Emerald" },
  { color: "#f59e0b", label: "Amber" },
  { color: "#ef4444", label: "Red" },
  { color: "#ec4899", label: "Pink" },
];

export function SettingsModal() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme, accentColor, setAccentColor } = useTheme();

  const effectiveAccent = accentColor || "#aa3bff";
  const isCustomPreset = accentColor !== "" && !ACCENT_PRESETS.find((p) => p.color === accentColor);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:opacity-80 text-body"
      >
        <Settings size={15} strokeWidth={1.6} />
        Settings
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Settings">
        <div className="space-y-6">
          {/* Theme */}
          <div>
            <SectionLabel className="mb-3">
              Theme
            </SectionLabel>
            <div className="flex gap-2">
              {(["light", "system", "dark"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className="flex-1 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all"
                  style={{
                    background: theme === t ? "var(--accent)" : "var(--code-bg)",
                    color: theme === t ? "#fff" : "var(--text)",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Accent color */}
          <div>
            <SectionLabel className="mb-3">
              Accent color
            </SectionLabel>
            <div className="flex items-center gap-2 flex-wrap">
              {ACCENT_PRESETS.map(({ color, label }) => (
                <button
                  key={color}
                  onClick={() => setAccentColor(color)}
                  title={label}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                  style={{
                    background: color,
                    outline: effectiveAccent === color ? `2px solid ${color}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}

              {/* Custom color picker — rainbow swatch wraps a hidden <input type="color"> */}
              <label
                className="relative w-6 h-6 rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-110 shrink-0"
                title="Custom color"
                style={{
                  background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
                  outline: isCustomPreset ? `2px solid ${accentColor}` : "none",
                  outlineOffset: "2px",
                }}
              >
                <input
                  type="color"
                  value={effectiveAccent}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                />
              </label>

              {accentColor && (
                <button
                  onClick={() => setAccentColor("")}
                  className="text-xs hover:opacity-70 ml-1 text-body"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
