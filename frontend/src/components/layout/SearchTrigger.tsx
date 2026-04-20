import { Search } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Tooltip } from "@/components/ui/Tooltip";

interface SearchTriggerProps {
  onOpen: () => void;
}

export function SearchTrigger({ onOpen }: SearchTriggerProps) {
  return (
    <Tooltip content="Open Command Palette (⌘K)">
      <IconButton onClick={onOpen} aria-label="Search entire app">
        <Search size={16} />
      </IconButton>
    </Tooltip>
  );
}
