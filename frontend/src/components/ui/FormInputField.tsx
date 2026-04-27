import { cn } from "@/lib/utils";

export function FormInputField({ className, style, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  const isEmpty = rest.required && typeof rest.value === "string" && rest.value === "";
  return (
    <input
      className={cn("rounded-lg border px-3 py-2 text-sm outline-none", className)}
      style={{
        background: "var(--code-bg)",
        borderColor: isEmpty ? "#ef4444" : "var(--border)",
        color: "var(--text-h)",
        ...style,
      }}
      {...rest}
    />
  );
}
