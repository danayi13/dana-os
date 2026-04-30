import { cn } from "@/lib/utils";

export function FormTextareaField({ className, style, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn("w-full rounded-lg border px-3 py-2 text-sm outline-none resize-none", className)}
      style={{
        background: "var(--code-bg)",
        borderColor: "var(--border)",
        color: "var(--text-h)",
        ...style,
      }}
      {...rest}
    />
  );
}
