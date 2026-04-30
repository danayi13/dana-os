import Highcharts from "highcharts";
import _HighchartsReact from "highcharts-react-official";
import { Music, Calendar } from "lucide-react";
import { useVocalStats } from "@/lib/vocal-api";
import { LoadingText } from "@/components/ui/LoadingText";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tag } from "@/components/ui/Tag";

// CJS interop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HighchartsReact = (_HighchartsReact as any).default ?? _HighchartsReact;

export function VocalOverview() {
  const { data: stats, isLoading } = useVocalStats();

  if (isLoading) return <LoadingText message="Loading stats…" />;
  if (!stats) return null;

  const monthlyOptions: Highcharts.Options = {
    chart: { type: "column", backgroundColor: "transparent", height: 220 },
    title: { text: undefined },
    xAxis: {
      categories: stats.monthly_frequency.map((m) => {
        const [year, month] = m.month.split("-");
        return new Date(Number(year), Number(month) - 1).toLocaleString("default", {
          month: "short",
          year: "2-digit",
        });
      }),
      labels: { style: { color: "var(--text)" } },
    },
    yAxis: {
      title: { text: undefined },
      allowDecimals: false,
      labels: { style: { color: "var(--text)" } },
      gridLineColor: "var(--border)",
    },
    series: [
      {
        type: "column",
        name: "Lessons",
        data: stats.monthly_frequency.map((m) => m.count),
        color: "var(--accent, #6366f1)",
      },
    ],
    legend: { enabled: false },
    tooltip: { valueSuffix: " lesson(s)" },
    credits: { enabled: false },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Calendar size={16} />}
          label="Total lessons"
          value={String(stats.total_lessons)}
        />
        <StatCard
          icon={<Calendar size={16} />}
          label="This year"
          value={String(stats.lessons_this_year)}
        />
      </div>

      {stats.monthly_frequency.length > 0 && (
        <section>
          <SectionHeading as="h3" className="mb-2">Lessons per month</SectionHeading>
          <HighchartsReact highcharts={Highcharts} options={monthlyOptions} />
        </section>
      )}

      {stats.repertoire_counts.length > 0 && (
        <section>
          <SectionHeading as="h3" className="mb-2">Repertoire</SectionHeading>
          <div className="space-y-1.5">
            {stats.repertoire_counts.map((entry) => (
              <div key={entry.piece} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-body">
                  <Music size={13} className="text-body" />
                  {entry.piece}
                </span>
                <Tag>×{entry.count}</Tag>
              </div>
            ))}
          </div>
        </section>
      )}

      {stats.total_lessons === 0 && (
        <p className="text-sm text-body">No lessons logged yet — head to the Log tab to add your first one.</p>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl p-3 space-y-1 bg-subtle">
      <div className="flex items-center gap-1.5 text-xs text-body">
        {icon}
        {label}
      </div>
      <p className="text-xl font-semibold text-heading">{value}</p>
    </div>
  );
}
