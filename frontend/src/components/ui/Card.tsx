import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md";
}

export function Card({ className, padding = "md", style, children, ...rest }: CardProps) {
  return (
    <div
      className={cn("rounded-xl border", padding === "sm" ? "px-4 py-3" : "p-4", className)}
      style={{ borderColor: "var(--border)", background: "var(--bg)", ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
