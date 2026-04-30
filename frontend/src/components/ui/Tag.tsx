import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagProps {
  children: React.ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Tag({ children, onRemove, removeLabel, className, style }: TagProps) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", className)}
      style={{ background: "var(--code-bg)", color: "var(--text-h)", ...style }}
    >
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} className="hover:opacity-70" aria-label={removeLabel}>
          <X size={11} />
        </button>
      )}
    </span>
  );
}
