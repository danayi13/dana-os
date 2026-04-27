interface FormFieldLabelProps {
  children: React.ReactNode;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
}

export function FormFieldLabel({ children, htmlFor, required, optional }: FormFieldLabelProps) {
  if (required && optional) throw new Error("FormFieldLabel: required and optional cannot both be true");
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium mb-1"
      style={{ color: "var(--text-h)" }}
    >
      {children}
      {required && (
        <span className="ml-1.5 font-normal text-xs" style={{ color: "var(--text)" }}>
          (required)
        </span>
      )}
      {optional && (
        <span className="ml-1.5 font-normal text-xs" style={{ color: "var(--text)" }}>
          (optional)
        </span>
      )}
    </label>
  );
}
