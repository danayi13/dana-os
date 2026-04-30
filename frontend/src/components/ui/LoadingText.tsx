import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoadingText({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 py-4 text-body", className)}>
      <Loader2 size={16} className="animate-spin" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
