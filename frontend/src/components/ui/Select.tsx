import { ChevronDown } from "lucide-react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>

export function Select({ className = "w-full", style, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select
        className={`appearance-none rounded-lg border px-3 py-2 pr-8 text-sm outline-none ${className}`}
        style={{
          background: "var(--code-bg)",
          borderColor: "var(--border)",
          color: "var(--text-h)",
          ...style,
        }}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-body"
      />
    </div>
  );
}
