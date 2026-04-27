import { cn } from "@/lib/utils";

const INTENT_STYLES = {
  cancel: {
    className: "rounded-lg px-4 py-2 text-sm font-medium hover:opacity-70",
    style: { color: "var(--text)" } as React.CSSProperties,
    defaultType: "button" as const,
  },
  submit: {
    className: "rounded-lg px-4 py-2 text-sm font-semibold hover:opacity-80 disabled:opacity-50",
    style: { background: "var(--accent)", color: "#fff" } as React.CSSProperties,
    defaultType: "submit" as const,
  },
};

interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  intent: "cancel" | "submit";
}

export function FormButton({ intent, className, type, style, children, ...rest }: FormButtonProps) {
  const { className: intentClass, style: intentStyle, defaultType } = INTENT_STYLES[intent];
  return (
    <button
      type={type ?? defaultType}
      className={cn(intentClass, className)}
      style={{ ...intentStyle, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
