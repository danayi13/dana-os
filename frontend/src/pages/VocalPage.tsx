import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LessonForm } from "@/components/vocal/LessonForm";
import { LessonList } from "@/components/vocal/LessonList";
import { VocalOverview } from "@/components/vocal/VocalOverview";
import { LoadingText } from "@/components/ui/LoadingText";
import { PageTitle } from "@/components/ui/PageTitle";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { TabBar } from "@/components/ui/TabBar";
import { useVocalLessons, useCreateLesson } from "@/lib/vocal-api";

const TABS = [
  { id: "log", label: "Log" },
  { id: "overview", label: "Overview" },
] as const;

type TabId = "log" | "overview";

export function VocalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabId | null) ?? "log";

  return (
    <div className="max-w-2xl space-y-5">
      <PageTitle>Vocal Lessons</PageTitle>
      <TabBar tabs={TABS} activeTab={activeTab} onChange={(tab) => setSearchParams({ tab }, { replace: true })} />
      {activeTab === "log" && <LogTab />}
      {activeTab === "overview" && <VocalOverview />}
    </div>
  );
}

function LogTab() {
  const createLesson = useCreateLesson();
  const { data: lessons, isLoading } = useVocalLessons();
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="space-y-6">
      <section>
        <SectionHeading className="mb-3">Log a lesson</SectionHeading>
        <LessonForm
          key={formKey}
          isLoading={createLesson.isPending}
          onSubmit={(data) =>
            createLesson.mutate(data as Parameters<typeof createLesson.mutate>[0], {
              onSuccess: () => setFormKey((k) => k + 1),
            })
          }
        />
        {createLesson.isError && (
          <p className="text-sm mt-2 text-error">
            {(createLesson.error as Error)?.message ?? "Something went wrong"}
          </p>
        )}
      </section>

      <section>
        <SectionHeading className="mb-3">Recent lessons</SectionHeading>
        {isLoading ? <LoadingText message="Loading lessons…" /> : <LessonList lessons={lessons ?? []} />}
      </section>
    </div>
  );
}
