/**
 * Cmd+K command palette — navigation + future action/settings commands.
 *
 * Built on cmdk. Open via AppShell's keyboard handler or the header trigger.
 * Add new commands to navigation.ts (static) or via useCommands() once built.
 */
import { useEffect } from "react";
import { Command } from "cmdk";
import { useNavigate } from "react-router-dom";
import { NAV_COMMANDS } from "./navigation";

// cmdk exposes internal elements via data attributes — these can't be inline
// styles, so they live here as a scoped style tag injected with the component.
const paletteStyles = `
  [cmdk-root] {
    background: var(--bg);
    color: var(--text);
    font-size: 14px;
  }
  [cmdk-input] {
    width: 100%;
    padding: 14px 16px;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--border);
    outline: none;
    font-size: 15px;
    color: var(--text-h);
    caret-color: var(--accent);
  }
  [cmdk-input]::placeholder {
    color: var(--text);
    opacity: 0.5;
  }
  [cmdk-list] {
    max-height: 360px;
    overflow-y: auto;
    padding: 6px 0;
  }
  [cmdk-group-heading] {
    padding: 6px 16px 4px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text);
    opacity: 0.5;
  }
  [cmdk-item] {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 16px;
    cursor: pointer;
    border-radius: 6px;
    margin: 0 6px;
    color: var(--text-h);
    transition: background 80ms;
  }
  [cmdk-item][aria-selected="true"],
  [cmdk-item]:hover {
    background: var(--accent-bg);
    color: var(--accent);
  }
  [cmdk-empty] {
    padding: 20px 16px;
    text-align: center;
    color: var(--text);
    opacity: 0.5;
    font-size: 13px;
  }
`;

const styles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    zIndex: 50,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    paddingTop: "15vh",
    background: "rgba(0, 0, 0, 0.45)",
    backdropFilter: "blur(2px)",
  },
  container: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    boxShadow: "var(--shadow)",
  },
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [onClose]);

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose} aria-modal="true" role="dialog">
      <style>{paletteStyles}</style>
      <div style={styles.container} onClick={(e) => e.stopPropagation()}>
        <Command label="Command palette">
          <Command.Input placeholder="Go to…" autoFocus />
          <Command.List>
            <Command.Empty>No results.</Command.Empty>
            <Command.Group heading="Navigate">
              {NAV_COMMANDS.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  value={`${cmd.label} ${cmd.keywords ?? ""}`}
                  onSelect={() => {
                    if (cmd.path) navigate(cmd.path);
                    onClose();
                  }}
                >
                  {cmd.label}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
