import { cn } from "@/lib/utils";

const VARIANT_CLASSES = {
  default: "text-xs font-semibold uppercase tracking-wide",
  wide: "text-xs font-semibold uppercase tracking-wider",
  subtle: "text-xs font-medium uppercase tracking-wide",
} as const;

interface SectionLabelProps {
  children: React.ReactNode;
  variant?: keyof typeof VARIANT_CLASSES;
  className?: string;
  style?: React.CSSProperties;
}

export function SectionLabel({ children, variant = "default", className, style }: SectionLabelProps) {
  return (
    <p
      className={cn(VARIANT_CLASSES[variant], "text-body", className)}
      style={style}
    >
      {children}
    </p>
  );
}
