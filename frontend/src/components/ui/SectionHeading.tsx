import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  children: React.ReactNode;
  as?: "h2" | "h3" | "h4";
  className?: string;
}

export function SectionHeading({ children, as: Tag = "h2", className }: SectionHeadingProps) {
  return (
    <Tag className={cn("text-sm font-semibold text-heading", className)}>
      {children}
    </Tag>
  );
}
