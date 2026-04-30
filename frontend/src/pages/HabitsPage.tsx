import { Suspense, lazy } from "react";
import { useSearchParams } from "react-router-dom";
import { HabitAdmin } from "@/components/habits/HabitAdmin";
import { BackfillCalendar } from "@/components/habits/BackfillCalendar";
import { GoalsList } from "@/components/goals/GoalsList";
import { LoadingText } from "@/components/ui/LoadingText";
import { PageTitle } from "@/components/ui/PageTitle";
import { TabBar } from "@/components/ui/TabBar";

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
        <PageTitle>Habits &amp; Goals</PageTitle>
        <TabBar tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
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
