import { PanelLeft } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";

interface SidebarToggleProps {
  onToggle: () => void;
}

export function SidebarToggle({ onToggle }: SidebarToggleProps) {
  return (
    <Tooltip content="Toggle sidebar" side="left">
      <IconButton onClick={onToggle} aria-label="Toggle sidebar">
        <PanelLeft size={16} />
      </IconButton>
    </Tooltip>
  );
}
