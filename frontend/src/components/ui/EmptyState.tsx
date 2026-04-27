interface EmptyStateProps {
  message: React.ReactNode;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div
      className="rounded-xl border-2 border-dashed p-8 text-center"
      style={{ borderColor: "var(--border)" }}
    >
      <p className="text-sm" style={{ color: "var(--text)" }}>{message}</p>
    </div>
  );
}
