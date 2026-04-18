export function HomePage() {
  return (
    <div>
      <h1
        className="mb-1 text-2xl font-semibold tracking-tight"
        style={{ color: "var(--text-h)" }}
      >
        Home
      </h1>
      <p className="text-sm" style={{ color: "var(--text)" }}>
        Dashboard coming soon. Press <kbd
          className="rounded border px-1 py-0.5 text-xs font-mono"
          style={{ borderColor: "var(--border)", background: "var(--code-bg)", color: "var(--text-h)" }}
        >⌘K</kbd> to navigate anywhere.
      </p>
    </div>
  );
}
