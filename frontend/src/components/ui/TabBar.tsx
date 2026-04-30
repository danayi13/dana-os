import { cn } from "@/lib/utils";

interface Tab<T extends string> {
  id: T;
  label: string;
}

interface TabBarProps<T extends string> {
  tabs: readonly Tab<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
}

export function TabBar<T extends string>({ tabs, activeTab, onChange, className }: TabBarProps<T>) {
  return (
    <div
      className={cn("flex gap-1 rounded-xl p-1 bg-subtle", className)}
      role="tablist"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          onClick={() => onChange(tab.id)}
          className="flex-1 rounded-lg py-1.5 text-sm font-medium transition-all"
          style={{
            color: activeTab === tab.id ? "var(--text-h)" : "var(--text)",
            background: activeTab === tab.id ? "var(--bg)" : "transparent",
            boxShadow: activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
