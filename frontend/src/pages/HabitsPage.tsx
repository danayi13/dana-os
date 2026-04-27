import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { HabitAdmin } from "@/components/habits/HabitAdmin";
import { BackfillCalendar } from "@/components/habits/BackfillCalendar";
import { GoalsList } from "@/components/goals/GoalsList";
import { LoadingText } from "@/components/ui/LoadingText";

const HabitCharts = lazy(() =>
  import("@/components/habits/HabitCharts").then((m) => ({ default: m.HabitCharts }))
);

const TABS = [
  { id: "charts", label: "Charts" },
  { id: "backfill", label: "Backfill" },
  { id: "manage", label: "Manage" },
  { id: "goals", label: "Goals" },
];

type TabId = (typeof TABS)[number]["id"];

export function HabitsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId | null) ?? "charts";

  function setActiveTab(tab: TabId) {
    setSearchParams({ tab }, { replace: true });
  }

  return (
    <div className="space-y-5">
      <div className="max-w-2xl space-y-5">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--text-h)" }}
        >
          Habits &amp; Goals
        </h1>

        <div
          className="flex gap-1 rounded-xl p-1"
          style={{ background: "var(--code-bg)" }}
          role="tablist"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
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
      </div>

      <div role="tabpanel">
        {activeTab === "manage" && <div className="max-w-2xl"><HabitAdmin /></div>}
        {activeTab === "backfill" && <BackfillCalendar />}
        {activeTab === "goals" && <div className="max-w-2xl"><GoalsList /></div>}
        {activeTab === "charts" && (
          <div className="max-w-2xl">
            <Suspense fallback={<LoadingText message="Loading charts…" className="py-8" />}>
              <HabitCharts />
            </Suspense>
          </div>
        )}
      </div>
    </div>
  );
}
