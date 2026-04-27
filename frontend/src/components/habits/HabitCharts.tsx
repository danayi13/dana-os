import { useEffect, useMemo } from "react";
import Highcharts from "highcharts";
// Highcharts v12: modules auto-initialize against window._Highcharts at import
// time — there is no factory function to call.
import "highcharts/modules/heatmap";
import _HighchartsReact from "highcharts-react-official";
// CJS interop: Vite's pre-bundler may wrap the default export in a module object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HighchartsReact = (_HighchartsReact as any).default ?? _HighchartsReact;
import { useHabits, useHabitLogs, useHabitStats, sortBySheetCol, type HabitDefinition, type HabitLog } from "@/lib/habits-api";
import { Loader2, TrendingUp, BarChart3, CalendarDays } from "lucide-react";
import { useUserSetting } from "@/lib/useUserSetting";
import { DateRangePicker, computeDateRange, type DateRangeValue } from "@/components/ui/DateRangePicker";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingText } from "@/components/ui/LoadingText";
import { dateRange, fmtDate, localDateStr } from "@/lib/dateUtils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function habitType(habit: HabitDefinition) {
  const isText = habit.period_config?.sheet_type === "text";
  const isNumeric = !!habit.unit && !isText;
  return { isText, isNumeric };
}

// Shared axis styles to keep options DRY
const axisStyle = (color = "var(--text)") => ({ style: { color, fontSize: "10px" } });

// Tooltip formatters live at module scope so the React Compiler never sees `this`
type HCPoint = Highcharts.Point & { options?: { custom?: { date?: string; notes?: string } }; value?: number | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeHeatmapFormatter(isNumeric: boolean, isText: boolean, unit: string | undefined) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any) {
    const pt = this.point as HCPoint;
    const dateStr = pt.options?.custom?.date ?? "";
    const notes = pt.options?.custom?.notes;
    const label = dateStr
      ? new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
      : "";
    if (pt.value === null || pt.value === undefined)
      return `<span style="color:var(--text-h)">${label}</span><br/>Not logged`;
    if (isNumeric)
      return `<span style="color:var(--text-h)">${label}</span><br/><b>${pt.value}</b>${unit ? " " + unit : ""}`;
    if (isText && notes)
      return `<span style="color:var(--text-h)">${label}</span><br/>${notes}`;
    return `<span style="color:var(--text-h)">${label}</span><br/>Logged ✓`;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeBinaryFormatter(isText: boolean, notesMap: Map<string, string | undefined>): (this: any) => string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any) {
    const pt = this.point as Highcharts.Point;
    const dateStr = localDateStr(new Date(pt.x!));
    const label = new Date(pt.x!).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!pt.y) return `<span style="color:var(--text-h)">${label}</span><br/>Not logged`;
    const notes = notesMap.get(dateStr);
    if (isText && notes) return `<span style="color:var(--text-h)">${label}</span><br/>${notes}`;
    return `<span style="color:var(--text-h)">${label}</span><br/>Logged ✓`;
  };
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-sm" style={{ color: "var(--text)" }}>No data for this period</p>
    </div>
  );
}

// ─── Stat cards ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 flex items-start gap-3"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <div className="rounded-lg p-2 mt-0.5" style={{ background: "var(--accent-bg)" }}>
        <Icon size={16} style={{ color: "var(--accent)" }} />
      </div>
      <div>
        <p className="text-xs font-medium" style={{ color: "var(--text)" }}>{label}</p>
        <p className="text-xl font-bold" style={{ color: "var(--text-h)" }}>{value}</p>
        {sub && <p className="text-xs" style={{ color: "var(--text)" }}>{sub}</p>}
      </div>
    </div>
  );
}

function CumulativeStats({ habit }: { habit: HabitDefinition }) {
  const { start: start30, end } = dateRange(29);
  const { start: start365 } = dateRange(364);
  const { data: logs30 } = useHabitLogs(habit.id, start30, end);
  const { data: logs365 } = useHabitLogs(habit.id, start365, end);

  const total30 = logs30?.reduce((s, l) => s + l.value, 0) ?? 0;
  const total365 = logs365?.reduce((s, l) => s + l.value, 0) ?? 0;
  const unit = habit.unit ?? "";
  const dec = unit ? 1 : 0;

  return (
    <div className="grid grid-cols-2 gap-3">
      <StatCard icon={CalendarDays} label="Past 30 days" value={total30.toFixed(dec)} sub={unit || "days logged"} />
      <StatCard icon={BarChart3} label="Past year" value={total365.toFixed(dec)} sub={unit || "days logged"} />
    </div>
  );
}

// ─── Max streak stats ─────────────────────────────────────────────────────────

function MaxStreakStat({ habit }: { habit: HabitDefinition }) {
  const { start, end } = dateRange(364);
  const { data: logs } = useHabitLogs(habit.id, start, end);

  const { count, tooltipLabel } = useMemo(() => {
    if (!logs || logs.length === 0) return { count: 0, tooltipLabel: "" };
    const logged = new Set(logs.filter((l) => l.value > 0).map((l) => l.date));
    let max = 0, cur = 0, curStart = "", bestStart = "", bestEnd = "";
    const d = new Date(start + "T12:00:00");
    const endDate = new Date(end + "T12:00:00");
    while (d <= endDate) {
      const ds = localDateStr(d);
      if (logged.has(ds)) {
        if (cur === 0) curStart = ds;
        cur++;
        if (cur > max) { max = cur; bestStart = curStart; bestEnd = ds; }
      } else { cur = 0; }
      d.setDate(d.getDate() + 1);
    }
    return { count: max, tooltipLabel: max > 0 ? `${fmtDate(bestStart)} – ${fmtDate(bestEnd)}` : "" };
  }, [logs, start, end]);

  return (
    <Tooltip content={tooltipLabel} hidden={!tooltipLabel} side="left">
      <StatCard icon={TrendingUp} label="Max streak" value={count} sub="days" />
    </Tooltip>
  );
}

function MaxWeekStreakStat({ habit }: { habit: HabitDefinition }) {
  const { start, end } = dateRange(364);
  const { data: logs } = useHabitLogs(habit.id, start, end);

  const { count, tooltipLabel } = useMemo(() => {
    if (!logs || logs.length === 0) return { count: 0, tooltipLabel: "" };
    const weekSet = new Set(
      logs
        .filter((l) => l.value > 0)
        .map((l) => {
          const d = new Date(l.date + "T12:00:00");
          const monday = new Date(d);
          monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
          return localDateStr(monday);
        })
    );
    let max = 0, cur = 0, curStart = "", bestStart = "", bestEnd = "";
    const d = new Date(start + "T12:00:00");
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // align to Monday
    const endDate = new Date(end + "T12:00:00");
    while (d <= endDate) {
      const ds = localDateStr(d);
      if (weekSet.has(ds)) {
        if (cur === 0) curStart = ds;
        cur++;
        if (cur > max) {
          max = cur;
          bestStart = curStart;
          const sunday = new Date(d.getTime());
          sunday.setDate(sunday.getDate() + 6);
          bestEnd = localDateStr(sunday);
        }
      } else { cur = 0; }
      d.setDate(d.getDate() + 7);
    }
    return { count: max, tooltipLabel: max > 0 ? `${fmtDate(bestStart)} – ${fmtDate(bestEnd)}` : "" };
  }, [logs, start, end]);

  return (
    <Tooltip content={tooltipLabel} hidden={!tooltipLabel} side="left">
      <StatCard icon={TrendingUp} label="Max streak" value={count} sub="weeks" />
    </Tooltip>
  );
}

// ─── Streak heatmap ───────────────────────────────────────────────────────────

function StreakHeatmap({ habit }: { habit: HabitDefinition }) {
  const { start, end } = dateRange(364);
  const { data: logs, isLoading } = useHabitLogs(habit.id, start, end);
  const { isNumeric, isText } = habitType(habit);

  const chartOptions = useMemo<Highcharts.Options>(() => {
    if (!logs) return {} as Highcharts.Options;

    // Store full log so we can access notes in tooltip
    const logMap = new Map<string, HabitLog>(logs.map((l) => [l.date, l]));

    type HeatPoint = { x: number; y: number; value: number | null; custom: { date: string; notes?: string } };
    const data: HeatPoint[] = [];

    const startDate = new Date(start + "T12:00:00");
    const endDate = new Date(end + "T12:00:00");
    const current = new Date(startDate);

    while (current <= endDate) {
      const dateStr = localDateStr(current);
      const weekIndex = Math.floor((current.getTime() - startDate.getTime()) / (7 * 86_400_000));
      const dayIndex = current.getDay();
      const log = logMap.get(dateStr);
      data.push({
        x: weekIndex,
        y: dayIndex,
        value: log ? (isNumeric ? log.value : 1) : null,
        custom: { date: dateStr, notes: log?.notes },
      });
      current.setDate(current.getDate() + 1);
    }

    const totalWeeks = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 86_400_000)) + 1;

    let colorAxis: Highcharts.ColorAxisOptions;
    if (isNumeric) {
      const vals = logs.map((l) => l.value);
      const minVal = vals.length > 0 ? Math.min(...vals) : 0;
      const maxVal = vals.length > 0 ? Math.max(...vals) : 1;
      const lowColor = habit.direction === "at_most" ? "#22c55e" : "#ef4444";
      const highColor = habit.direction === "at_most" ? "#ef4444" : "#22c55e";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      colorAxis = { min: minVal, max: maxVal, minColor: lowColor, maxColor: highColor, nullColor: "var(--border)" } as any;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      colorAxis = { min: 0, max: 1, minColor: "var(--border)", maxColor: "var(--accent)", nullColor: "var(--border)" } as any;
    }

    return {
      chart: { type: "heatmap", height: 160, backgroundColor: "transparent", margin: [0, 0, 30, 30] },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: { min: 0, max: totalWeeks - 1, visible: false },
      yAxis: {
        min: 0,
        max: 6,
        categories: ["S", "M", "T", "W", "T", "F", "S"],
        reversed: false,
        title: { text: undefined },
        gridLineWidth: 0,
        labels: axisStyle(),
      },
      colorAxis,
      tooltip: {
        formatter: makeHeatmapFormatter(isNumeric, isText, habit.unit),
        useHTML: true,
        backgroundColor: "var(--bg)",
        borderColor: "var(--border)",
        style: { color: "var(--text-h)" },
      },
      series: [
        {
          type: "heatmap",
          data,
          borderWidth: 2,
          borderColor: "var(--bg)",
          pointPadding: 1,
          nullColor: "var(--border)",
        } as Highcharts.SeriesHeatmapOptions,
      ],
    };
  }, [logs, start, end, habit, isNumeric, isText]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--text)" }} />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium mb-2" style={{ color: "var(--text)" }}>Last 365 days</p>
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </div>
  );
}

// ─── Daily values chart ───────────────────────────────────────────────────────
// Numeric → area chart with actual values
// Binary + text → column chart (0/1), notes shown in tooltip for text habits

function DailyChart({ habit, start, end }: { habit: HabitDefinition; start: string; end: string }) {
  const { data: logs, isLoading } = useHabitLogs(habit.id, start, end);
  const { isNumeric, isText } = habitType(habit);
  // Both binary and text habits render as 0/1 column bars
  const showAsColumn = !isNumeric;

  const chartOptions = useMemo<Highcharts.Options>(() => {
    if (!logs) return {} as Highcharts.Options;

    const logMap = new Map<string, HabitLog>(logs.map((l) => [l.date, l]));
    const notesMap = new Map<string, string | undefined>(logs.map((l) => [l.date, l.notes]));

    const today = localDateStr(new Date());
    const seriesData: [number, number | null][] = [];
    const d = new Date(start + "T12:00:00");
    const endDate = new Date(end + "T12:00:00");

    while (d <= endDate) {
      const dateStr = localDateStr(d);
      const log = logMap.get(dateStr);
      const value = log ? log.value : (isNumeric && dateStr === today ? null : 0);
      seriesData.push([d.getTime(), value]);
      d.setDate(d.getDate() + 1);
    }

    const commonXAxis = {
      type: "datetime" as const,
      labels: axisStyle(),
      lineColor: "var(--border)",
      tickColor: "var(--border)",
    };
    const commonYAxis = {
      title: { text: undefined },
      gridLineColor: "var(--border)",
      labels: axisStyle(),
      min: 0,
    };

    if (showAsColumn) {
      return {
        chart: { type: "column", height: 180, backgroundColor: "transparent", margin: [10, 0, 30, 40] },
        title: { text: undefined },
        credits: { enabled: false },
        legend: { enabled: false },
        xAxis: commonXAxis,
        yAxis: { ...commonYAxis, max: 1, allowDecimals: false },
        tooltip: {
          formatter: makeBinaryFormatter(isText, notesMap),
          useHTML: true,
          backgroundColor: "var(--bg)",
          borderColor: "var(--border)",
          style: { color: "var(--text-h)" },
        },
        plotOptions: {
          column: { color: "var(--accent)", borderRadius: 2, borderWidth: 0, pointPadding: 0.05, groupPadding: 0 },
        },
        series: [{ type: "column", name: "Logged", data: seriesData } as Highcharts.SeriesColumnOptions],
      };
    }

    return {
      chart: { type: "area", height: 180, backgroundColor: "transparent", margin: [10, 0, 30, 40] },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: commonXAxis,
      yAxis: commonYAxis,
      tooltip: {
        xDateFormat: "%b %d",
        valueSuffix: habit.unit ? ` ${habit.unit}` : "",
        backgroundColor: "var(--bg)",
        borderColor: "var(--border)",
        style: { color: "var(--text-h)" },
      },
      plotOptions: {
        area: { color: "var(--accent)", fillOpacity: 0.12, lineWidth: 2, marker: { radius: 3, fillColor: "var(--accent)" } },
      },
      series: [{ type: "area", name: habit.unit ?? "Value", data: seriesData } as Highcharts.SeriesAreaOptions],
    };
  }, [logs, start, end, habit, isNumeric, showAsColumn, isText]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--text)" }} />
      </div>
    );
  }

  return <HighchartsReact key={showAsColumn ? "column" : "area"} highcharts={Highcharts} options={chartOptions} />;
}

// ─── Weekly bar chart ─────────────────────────────────────────────────────────

function WeeklyChart({ habit, start, end }: { habit: HabitDefinition; start: string; end: string }) {
  const { data: logs, isLoading } = useHabitLogs(habit.id, start, end);
  const { isNumeric } = habitType(habit);
  // Numeric habits: sum values per week. Binary/text: count distinct logged days.
  const sumValues = isNumeric;
  // Daily-period numeric: show avg per logged day rather than weekly total
  const showDailyAvg = isNumeric && habit.period_type === "daily";

  const { weeks, weeksReached, weekAvg, successPct } = useMemo(() => {
    if (!logs) return { weeks: [] as [string, number][], weeksReached: 0, weekAvg: 0, successPct: 0 };

    const weekMap = new Map<string, number>();
    const weekCountMap = new Map<string, number>();
    logs.forEach((l) => {
      if (l.value <= 0) return;
      const d = new Date(l.date + "T12:00:00");
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const key = localDateStr(monday);
      weekMap.set(key, (weekMap.get(key) ?? 0) + (sumValues ? l.value : 1));
      if (showDailyAvg) weekCountMap.set(key, (weekCountMap.get(key) ?? 0) + 1);
    });

    // Enumerate every week in the date range so 0-weeks show as missed bars
    const allWeekKeys: string[] = [];
    const walker = new Date(start + "T12:00:00");
    walker.setDate(walker.getDate() - ((walker.getDay() + 6) % 7)); // align to Monday
    const endDate = new Date(end + "T12:00:00");
    while (walker <= endDate) {
      allWeekKeys.push(localDateStr(walker));
      walker.setDate(walker.getDate() + 7);
    }

    const sorted: [string, number][] = allWeekKeys.map((key) => {
      const sum = weekMap.get(key) ?? 0;
      const count = weekCountMap.get(key) ?? 1;
      return [key, showDailyAvg && weekMap.has(key) ? sum / count : sum];
    });

    let reached = 0;
    if (habit.target != null) {
      sorted.forEach(([, val]) => {
        const hit = habit.direction === "at_most" ? val <= habit.target! : val >= habit.target!;
        if (hit) reached++;
      });
    }

    const avg = sorted.length > 0 ? sorted.reduce((s, [, v]) => s + v, 0) / sorted.length : 0;

    // Success = logged something (val > 0), and target condition met if a target exists
    let successCount = 0;
    sorted.forEach(([, val]) => {
      if (val === 0) return;
      if (habit.target == null || habit.direction === "track") { successCount++; return; }
      if (habit.direction === "at_most" ? val <= habit.target : val >= habit.target) successCount++;
    });
    const pct = sorted.length > 0 ? Math.round((successCount / sorted.length) * 100) : 0;

    return { weeks: sorted, weeksReached: reached, weekAvg: avg, successPct: pct };
  }, [logs, habit, sumValues, showDailyAvg, start, end]);

  const chartOptions = useMemo<Highcharts.Options>(() => {
    if (!weeks.length) return {} as Highcharts.Options;

    const plotLines: Highcharts.YAxisPlotLinesOptions[] = [];

    // Target line for habits with a goal
    if (habit.target != null) {
      plotLines.push({
        value: habit.target,
        color: "#ef4444",
        dashStyle: "Dash",
        width: 2,
        zIndex: 5,
        label: {
          text: `Target: ${habit.target}${habit.unit ? " " + habit.unit : ""}`,
          style: { color: "#ef4444", fontSize: "10px" },
          align: "left",
          x: 4,
        },
      });
    }

    // Average line for all habit types
    if (weeks.length > 1) {
      const avgLabel = showDailyAvg
        ? `Avg: ${weekAvg.toFixed(1)}${habit.unit ? " " + habit.unit : ""}/day`
        : isNumeric
          ? `Avg: ${weekAvg.toFixed(1)}${habit.unit ? " " + habit.unit : ""}/wk`
          : `Avg: ${weekAvg.toFixed(1)} days/wk`;
      plotLines.push({
        value: weekAvg,
        color: "var(--accent)",
        dashStyle: "LongDash",
        width: 1,
        zIndex: 5,
        label: {
          text: avgLabel,
          style: { color: "var(--text)", fontSize: "10px" },
          align: "right",
          x: -4,
        },
      });
    }

    return {
      chart: { type: "column", height: 180, backgroundColor: "transparent", margin: [10, 0, 40, 40] },
      title: { text: undefined },
      credits: { enabled: false },
      legend: { enabled: false },
      xAxis: {
        categories: weeks.map(([w]) => {
          const d = new Date(w + "T12:00:00");
          return `${d.toLocaleString("default", { month: "short" })} ${d.getDate()}`;
        }),
        labels: { ...axisStyle(), rotation: -35 },
        lineColor: "var(--border)",
      },
      yAxis: {
        title: { text: undefined },
        gridLineColor: "var(--border)",
        labels: axisStyle(),
        min: 0,
        allowDecimals: showDailyAvg,
        plotLines,
      },
      tooltip: {
        headerFormat: "Week of {point.key}<br/>",
        pointFormat: showDailyAvg
          ? `<b>{point.y:.1f}</b>${habit.unit ? " " + habit.unit : ""}/day avg`
          : sumValues
            ? `<b>{point.y}</b>${habit.unit ? " " + habit.unit : ""}`
            : "<b>{point.y}</b> days logged",
        backgroundColor: "var(--bg)",
        borderColor: "var(--border)",
        style: { color: "var(--text-h)" },
      },
      plotOptions: {
        column: { borderRadius: 4, borderWidth: 0 },
      },
      series: [
        {
          type: "column",
          name: showDailyAvg ? `avg ${habit.unit ?? "value"}/day` : sumValues ? (habit.unit ?? "Value") : "Days logged",
          data: weeks.map(([, v]) => {
            if (v === 0) return { y: 0, color: "var(--border)" };
            let success = true;
            if (habit.target != null && habit.direction !== "track") {
              success = habit.direction === "at_most" ? v <= habit.target : v >= habit.target;
            }
            return { y: v, color: success ? "#22c55e" : "#ef4444" };
          }),
        } as Highcharts.SeriesColumnOptions,
      ],
    };
  }, [weeks, habit, isNumeric, sumValues, weekAvg, showDailyAvg]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--text)" }} />
      </div>
    );
  }

  if (!weeks.length) return <EmptyChart />;

  return (
    <div className="space-y-2">
      {weeks.length > 0 && (
        <p className="text-xs" style={{ color: "var(--text)" }}>
          <span className="font-semibold" style={{ color: "var(--text-h)" }}>
            {successPct}%
          </span>{" "}
          of weeks successful
          {habit.target != null && (
            <span style={{ opacity: 0.6 }}> · {weeksReached}/{weeks.length} reached target</span>
          )}
        </p>
      )}
      <HighchartsReact highcharts={Highcharts} options={chartOptions} />
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const DAILY_PRESETS = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y", days: 365 },
];

const WEEKLY_PRESETS = [
  { label: "12 wks", days: 84 },
  { label: "26 wks", days: 182 },
  { label: "52 wks", days: 364 },
];

export function HabitCharts() {
  const [selectedHabitId, setSelectedHabitId] = useUserSetting<string>("charts-habit", "");
  const [dailyRange, setDailyRange] = useUserSetting<DateRangeValue>("charts-daily-range", { type: "preset", days: 30 });
  const [weeklyRange, setWeeklyRange] = useUserSetting<DateRangeValue>("charts-weekly-range", { type: "preset", days: 84 });

  const { data: _rawHabits, isLoading: habitsLoading } = useHabits();
  const habits = _rawHabits ? sortBySheetCol(_rawHabits) : _rawHabits;
  const { data: stats } = useHabitStats(selectedHabitId);
  const selectedHabit = habits?.find((h) => h.id === selectedHabitId);

  // Auto-select first habit when none is selected or the persisted id is gone
  useEffect(() => {
    if (habits && habits.length > 0 && !habits.find((h) => h.id === selectedHabitId)) {
      setSelectedHabitId(habits[0].id);
    }
  }, [habits, selectedHabitId, setSelectedHabitId]);

  const dailyDateRange = computeDateRange(dailyRange);
  const weeklyDateRange = computeDateRange(weeklyRange);

  const { isNumeric, isText } = selectedHabit ? habitType(selectedHabit) : { isNumeric: false, isText: false };
  const isBinary = !isNumeric && !isText;
  const isWeeklyPeriod = selectedHabit?.period_type === "weekly";

  if (habitsLoading) return <LoadingText message="Loading habits…" />;

  // Stat cards — vary by habit type:
  // Binary: streak (days) + weekly logged count. No avg.
  // Numeric: weekly total + avg/week (long-term). No streak. + cumulative 30d/365d.
  // Weekly period: streak in weeks instead of days.
  const streakValue = isWeeklyPeriod && stats
    ? Math.max(0, Math.floor(stats.current_streak / 7))
    : stats?.current_streak ?? 0;
  const streakSub = isWeeklyPeriod ? "weeks" : "days";

  return (
    <div className="space-y-6">
      {/* Habit pill selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {habits?.map((h) => (
          <button
            key={h.id}
            onClick={() => setSelectedHabitId(h.id)}
            className="rounded-md px-2.5 py-1 text-xs font-medium transition-all"
            style={{
              background: selectedHabitId === h.id ? "var(--accent)" : "var(--code-bg)",
              color: selectedHabitId === h.id ? "#fff" : "var(--text)",
            }}
          >
            {h.name}
          </button>
        ))}
      </div>

      {selectedHabitId && stats && selectedHabit && (
        <div className="space-y-3">
          {/* Row 1: primary stats */}
          <div className={`grid ${isBinary ? "grid-cols-3" : "grid-cols-2"} gap-3`}>
            {/* Binary/text: streak + (binary: max streak) + weekly logged. Numeric: weekly total + avg/week. */}
            {(isBinary || isText) ? (
              <>
                <StatCard
                  icon={BarChart3}
                  label="Current streak"
                  value={streakValue}
                  sub={streakSub}
                />
                {isBinary && (
                  isWeeklyPeriod
                    ? <MaxWeekStreakStat habit={selectedHabit} />
                    : <MaxStreakStat habit={selectedHabit} />
                )}
                <StatCard
                  icon={TrendingUp}
                  label="This week"
                  value={stats.weekly_total}
                  sub="times logged"
                />
              </>
            ) : (
              <>
                <StatCard
                  icon={TrendingUp}
                  label="This week"
                  value={stats.weekly_total}
                  sub={selectedHabit.unit ?? ""}
                />
                <StatCard
                  icon={BarChart3}
                  label="Avg / week"
                  value={Number(stats.weekly_average.toFixed(1))}
                  sub={selectedHabit.unit ? `${selectedHabit.unit} per week` : "per week"}
                />
              </>
            )}
          </div>

          {/* Row 2: cumulative stats for numeric habits only */}
          {isNumeric && <CumulativeStats habit={selectedHabit} />}
        </div>
      )}

      {selectedHabit ? (
        <div className="space-y-6">
          {/* Heatmap — fixed 365-day window */}
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--text-h)" }}>
              Streak heatmap
            </p>
            <StreakHeatmap habit={selectedHabit} />
          </div>

          {/* Daily values */}
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
              <p className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Daily values</p>
              <DateRangePicker value={dailyRange} onChange={setDailyRange} presets={DAILY_PRESETS} />
            </div>
            <DailyChart habit={selectedHabit} start={dailyDateRange.start} end={dailyDateRange.end} />
          </div>

          {/* Weekly overview */}
          <div
            className="rounded-xl border p-4"
            style={{ borderColor: "var(--border)", background: "var(--bg)" }}
          >
            <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
              <p className="text-sm font-semibold" style={{ color: "var(--text-h)" }}>Weekly overview</p>
              <DateRangePicker value={weeklyRange} onChange={setWeeklyRange} presets={WEEKLY_PRESETS} />
            </div>
            <WeeklyChart habit={selectedHabit} start={weeklyDateRange.start} end={weeklyDateRange.end} />
          </div>
        </div>
      ) : (
        <EmptyState message="Select a habit to view charts" />
      )}
    </div>
  );
}
