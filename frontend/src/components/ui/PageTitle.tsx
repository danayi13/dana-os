import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./Tooltip";

interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
  sheetUrl?: string | null;
  sheetLabel?: string;
}

export function PageTitle({ children, className, sheetUrl, sheetLabel }: PageTitleProps) {
  const label = sheetLabel ?? "Spreadsheet";
  return (
    <h1 className={cn("text-2xl font-semibold tracking-tight text-heading flex items-center gap-2", className)}>
      {children}
      {sheetUrl && (
        <Tooltip content={label} side="right">
          <a
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            className="text-body hover:text-heading transition-colors"
          >
            <ExternalLink size={16} />
          </a>
        </Tooltip>
      )}
    </h1>
  );
}
