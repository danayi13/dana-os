import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { HabitChecklist } from "@/components/habits/HabitChecklist";
import { NudgeStrip } from "@/components/habits/NudgeStrip";
import { GoalsWidget } from "@/components/goals/GoalsWidget";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { fmtDateLong, localDateStr } from "@/lib/dateUtils";

export function HomePage() {
  const [selectedDate, setSelectedDate] = useState(() => localDateStr(new Date()));
  const todayStr = localDateStr(new Date());
  const isToday = selectedDate === todayStr;

  const dateLabel = fmtDateLong(selectedDate);

  function prevDay() {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() - 1);
    setSelectedDate(localDateStr(d));
  }

  function nextDay() {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + 1);
    const next = localDateStr(d);
    if (next <= todayStr) setSelectedDate(next);
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <PageTitle>Home</PageTitle>
        <div className="flex items-center gap-1.5 mt-0.5">
          <button
            onClick={prevDay}
            className="rounded p-0.5 hover:opacity-70 transition-opacity"
            aria-label="Previous day"
          >
            <ChevronLeft size={14} className="text-body" />
          </button>
          <p className="text-sm text-body">{dateLabel}</p>
          <button
            onClick={nextDay}
            disabled={isToday}
            className="rounded p-0.5 hover:opacity-70 transition-opacity disabled:opacity-30"
            aria-label="Next day"
          >
            <ChevronRight size={14} className="text-body" />
          </button>
          {!isToday && (
            <button
              onClick={() => setSelectedDate(todayStr)}
              className="ml-1 text-xs hover:opacity-70 transition-opacity"
              style={{ color: "var(--accent)" }}
            >
              Today
            </button>
          )}
        </div>
      </div>

      <CollapsibleSection
        icon={<CheckSquare size={15} style={{ color: "var(--accent)" }} />}
        title="Today's habits"
        right={
          <Link to="/habits" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "var(--accent)" }}>
            Manage →
          </Link>
        }
      >
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <SectionLabel variant="wide">Daily</SectionLabel>
            <HabitChecklist periodFilter={["daily"]} date={selectedDate} />
          </div>
          <div className="space-y-3">
            <SectionLabel variant="wide">Weekly</SectionLabel>
            <HabitChecklist periodFilter={["weekly"]} date={selectedDate} />
          </div>
        </div>
        <HabitChecklist periodFilter={["monthly", "custom"]} date={selectedDate} />
      </CollapsibleSection>

      <GoalsWidget />

      <NudgeStrip />
    </div>
  );
}
