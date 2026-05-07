import Highcharts from "highcharts";
import _HighchartsReact from "highcharts-react-official";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HighchartsReact = (_HighchartsReact as any).default ?? _HighchartsReact;
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingText } from "@/components/ui/LoadingText";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useClimbingStats, type ClimbingStats, type CompanionStats, type GymStats } from "@/lib/climbing-api";
import { minutesToHours } from "@/lib/dateUtils";

const axisStyle = { style: { color: "var(--text)", fontSize: "11px" } };

function GradeProgressionChart({ stats }: { stats: ClimbingStats }) {
  const data = stats.grade_progression.map((p) => [
    new Date(p.date + "T12:00:00").getTime(),
    p.grade_int,
  ]);

  if (data.length === 0) {
    return <EmptyState message="No graded sessions yet." />;
  }

  const options: Highcharts.Options = {
    chart: { type: "line", backgroundColor: "transparent", height: 220 },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      type: "datetime",
      labels: axisStyle,
      lineColor: "var(--border)",
      tickColor: "var(--border)",
    },
    yAxis: {
      title: { text: undefined },
      min: 0,
      max: 17,
      tickInterval: 1,
      labels: {
        ...axisStyle,
        formatter() {
          return `V${this.value}`;
        },
      },
      gridLineColor: "var(--border)",
    },
    tooltip: {
      formatter() {
        const d = new Date(this.x as number).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return `<b>V${this.y}</b><br/>${d}`;
      },
    },
    series: [
      {
        type: "line",
        name: "Max grade",
        data,
        color: "var(--accent, #6366f1)",
        marker: { enabled: true, radius: 3 },
      },
    ],
    legend: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

function MonthlyVolumeChart({ stats }: { stats: ClimbingStats }) {
  if (stats.monthly_volume.length === 0) {
    return <EmptyState message="No sessions yet." />;
  }

  const options: Highcharts.Options = {
    chart: { type: "column", backgroundColor: "transparent", height: 220 },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: {
      categories: stats.monthly_volume.map((m) => m.month),
      labels: axisStyle,
      lineColor: "var(--border)",
    },
    yAxis: {
      title: { text: undefined },
      allowDecimals: false,
      gridLineColor: "var(--border)",
      labels: axisStyle,
    },
    tooltip: {
      formatter() {
        const row = stats.monthly_volume.find((m) => m.month === String(this.x));
        const hrs = minutesToHours(row?.total_minutes);
        return `<b>${this.x}</b><br/>${this.y} session${this.y === 1 ? "" : "s"}${hrs !== "—" ? `<br/>${hrs} total` : ""}`;
      },
    },
    series: [
      {
        type: "column",
        name: "Sessions",
        data: stats.monthly_volume.map((m) => m.count),
        color: "var(--accent, #6366f1)",
      },
    ],
    legend: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

function barChartHeight(itemCount: number) {
  return Math.max(160, itemCount * 38 + 52);
}

function GymVisitsChart({ stats }: { stats: ClimbingStats }) {
  const gyms = stats.gym_stats.filter((g) => g.visit_count > 0);
  if (gyms.length === 0) return null;

  const options: Highcharts.Options = {
    chart: { type: "bar", backgroundColor: "transparent", height: barChartHeight(gyms.length) },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: { categories: gyms.map((g) => g.name), labels: axisStyle, lineColor: "var(--border)", tickColor: "var(--border)" },
    yAxis: { title: { text: undefined }, allowDecimals: false, gridLineColor: "var(--border)", labels: axisStyle },
    tooltip: { formatter() { return `<b>${this.x}</b>: ${this.y} visit${this.y === 1 ? "" : "s"}`; } },
    series: [{ type: "bar", name: "Visits", data: gyms.map((g) => g.visit_count), color: "var(--accent, #6366f1)" }],
    legend: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

function GymTimeChart({ stats }: { stats: ClimbingStats }) {
  const gyms = stats.gym_stats.filter((g) => g.total_minutes != null && g.total_minutes > 0);
  if (gyms.length === 0) return null;

  const options: Highcharts.Options = {
    chart: { type: "bar", backgroundColor: "transparent", height: barChartHeight(gyms.length) },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: { categories: gyms.map((g) => g.name), labels: axisStyle, lineColor: "var(--border)", tickColor: "var(--border)" },
    yAxis: {
      title: { text: undefined },
      gridLineColor: "var(--border)",
      labels: { ...axisStyle, formatter() { return minutesToHours(this.value as number); } },
    },
    tooltip: {
      formatter() {
        const gym = gyms.find((g) => g.name === String(this.x));
        return `<b>${this.x}</b>: ${minutesToHours(gym?.total_minutes)}`;
      },
    },
    series: [{ type: "bar", name: "Time", data: gyms.map((g) => g.total_minutes!), color: "var(--accent, #6366f1)" }],
    legend: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

function GymTable({ gyms }: { gyms: GymStats[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-body text-xs">
          <th className="pb-1.5 font-medium">Gym</th>
          <th className="pb-1.5 font-medium text-right">Visits</th>
          <th className="pb-1.5 font-medium text-right">Time</th>
          <th className="pb-1.5 font-medium text-right">Last visit</th>
          <th className="pb-1.5 font-medium text-right">Days ago</th>
        </tr>
      </thead>
      <tbody>
        {gyms.map((g) => (
          <tr key={g.gym_id} className="border-t border-[var(--border)]">
            <td className="py-1.5 text-heading font-medium">{g.name}</td>
            <td className="py-1.5 text-right">{g.visit_count}</td>
            <td className="py-1.5 text-right">{minutesToHours(g.total_minutes)}</td>
            <td className="py-1.5 text-right">{g.last_visit ?? "—"}</td>
            <td className="py-1.5 text-right">{g.days_since_last ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function GymBreakdown({ stats }: { stats: ClimbingStats }) {
  const recurring = stats.gym_stats.filter((g) => g.gym_type === "recurring");
  const infrequent = stats.gym_stats.filter((g) => g.gym_type === "infrequent");

  if (stats.gym_stats.length === 0) {
    return <EmptyState message="No gyms logged yet." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-body uppercase tracking-wide mb-1">Visits</p>
        <GymVisitsChart stats={stats} />
      </div>
      <div>
        <p className="text-xs font-semibold text-body uppercase tracking-wide mb-1">Time</p>
        <GymTimeChart stats={stats} />
      </div>
      {recurring.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-body uppercase tracking-wide mb-2">Recurring</p>
          <GymTable gyms={recurring} />
        </div>
      )}
      {infrequent.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-body uppercase tracking-wide mb-2">Infrequent</p>
          <GymTable gyms={infrequent} />
        </div>
      )}
    </div>
  );
}

function CompanionChart({ companions }: { companions: CompanionStats[] }) {
  if (companions.length === 0) return null;

  const options: Highcharts.Options = {
    chart: { type: "bar", backgroundColor: "transparent", height: barChartHeight(companions.length) },
    title: { text: undefined },
    credits: { enabled: false },
    xAxis: { categories: companions.map((c) => c.name), labels: axisStyle, lineColor: "var(--border)", tickColor: "var(--border)" },
    yAxis: { title: { text: undefined }, allowDecimals: false, gridLineColor: "var(--border)", labels: axisStyle },
    tooltip: { formatter() { return `<b>${this.x}</b>: ${this.y} session${this.y === 1 ? "" : "s"}`; } },
    series: [{ type: "bar", name: "Sessions", data: companions.map((c) => c.session_count), color: "var(--accent, #6366f1)" }],
    legend: { enabled: false },
  };

  return <HighchartsReact highcharts={Highcharts} options={options} />;
}

function CompanionTable({ companions }: { companions: CompanionStats[] }) {
  if (companions.length === 0) {
    return <EmptyState message="No sessions with companions yet." />;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-body text-xs">
          <th className="pb-1.5 font-medium">Person</th>
          <th className="pb-1.5 font-medium text-right">Sessions</th>
          <th className="pb-1.5 font-medium text-right">Last climbed</th>
        </tr>
      </thead>
      <tbody>
        {companions.map((c) => (
          <tr key={c.name} className="border-t border-[var(--border)]">
            <td className="py-1.5 text-heading font-medium">{c.name}</td>
            <td className="py-1.5 text-right">{c.session_count}</td>
            <td className="py-1.5 text-right">{c.last_climbed ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FirstPerGradeTable({ stats }: { stats: ClimbingStats }) {
  if (stats.first_per_grade.length === 0) {
    return <EmptyState message="No graded sessions yet." />;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-body text-xs">
          <th className="pb-1.5 font-medium">Grade</th>
          <th className="pb-1.5 font-medium text-right">First sent</th>
        </tr>
      </thead>
      <tbody>
        {stats.first_per_grade.map((row) => (
          <tr key={row.grade} className="border-t border-[var(--border)]">
            <td className="py-1.5 font-semibold text-heading">{row.grade}</td>
            <td className="py-1.5 text-right">{row.first_date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ClimbingDashboard() {
  const { data: stats, isLoading } = useClimbingStats();

  if (isLoading) return <LoadingText message="Loading stats…" />;
  if (!stats) return null;

  const totalHours = minutesToHours(stats.total_minutes);

  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap">
        <Card className="flex-1 min-w-[120px]">
          <p className="text-xs text-body">Total sessions</p>
          <p className="text-2xl font-semibold text-heading mt-0.5">{stats.total_sessions}</p>
        </Card>
        <Card className="flex-1 min-w-[120px]">
          <p className="text-xs text-body">Total time</p>
          <p className="text-2xl font-semibold text-heading mt-0.5">{totalHours}</p>
        </Card>
        {stats.first_per_grade.length > 0 && (
          <Card className="flex-1 min-w-[120px]">
            <p className="text-xs text-body">Highest grade</p>
            <p className="text-2xl font-semibold text-heading mt-0.5">
              {stats.first_per_grade[stats.first_per_grade.length - 1]?.grade}
            </p>
          </Card>
        )}
      </div>

      <div>
        <SectionHeading className="mb-3">Grade progression</SectionHeading>
        <Card>
          <GradeProgressionChart stats={stats} />
        </Card>
      </div>

      <div>
        <SectionHeading className="mb-3">Monthly volume</SectionHeading>
        <Card>
          <MonthlyVolumeChart stats={stats} />
        </Card>
      </div>

      <div>
        <SectionHeading className="mb-3">Gym breakdown</SectionHeading>
        <Card>
          <GymBreakdown stats={stats} />
        </Card>
      </div>

      <div>
        <SectionHeading className="mb-3">Climbing partners</SectionHeading>
        <Card>
          <div className="space-y-5">
            <CompanionChart companions={stats.companion_stats ?? []} />
            <CompanionTable companions={stats.companion_stats ?? []} />
          </div>
        </Card>
      </div>

      <div>
        <SectionHeading className="mb-3">Grade milestones</SectionHeading>
        <Card>
          <FirstPerGradeTable stats={stats} />
        </Card>
      </div>
    </div>
  );
}
