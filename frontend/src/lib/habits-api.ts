import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export type PeriodType = "daily" | "weekly" | "monthly" | "custom";
export type Direction = "at_least" | "at_most" | "track";

export interface HabitDefinition {
  id: string;
  name: string;
  description?: string;
  period_type: PeriodType;
  unit?: string;
  target?: number;
  direction: Direction;
  period_config?: { sheet_col?: string; sheet_type?: string };
  created_at: string;
}

export interface HabitActivationPeriod {
  id: string;
  habit_id: string;
  starts_on: string;
  ends_on?: string;
  archived_at?: string;
}

export interface HabitLog {
  id: string;
  habit_id: string;
  date: string;
  value: number;
  notes?: string;
  created_at: string;
}

export interface HabitStats {
  habit_id: string;
  weekly_total: number;
  weekly_average: number;
  current_streak: number;
}

export interface HabitDefinitionCreate {
  name: string;
  description?: string;
  period_type: PeriodType;
  unit?: string;
  target?: number;
  direction?: Direction;
  period_config?: { sheet_col?: string; sheet_type?: string };
}

export interface HabitLogCreate {
  date: string;
  value: number;
  notes?: string;
}

export const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;


function sheetColToIndex(col?: string): number {
  if (!col) return Infinity;
  let n = 0;
  for (const c of col.toUpperCase()) n = n * 26 + (c.charCodeAt(0) - 64);
  return n;
}

export function sortBySheetCol<T extends { period_config?: { sheet_col?: string } }>(
  habits: T[]
): T[] {
  return [...habits].sort(
    (a, b) =>
      sheetColToIndex(a.period_config?.sheet_col) -
      sheetColToIndex(b.period_config?.sheet_col)
  );
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useHabits() {
  return useQuery({
    queryKey: ["habits"],
    queryFn: () => api.get<HabitDefinition[]>("/habits"),
  });
}

export function useHabitActivationPeriods(habitId: string) {
  return useQuery({
    queryKey: ["habits", habitId, "periods"],
    queryFn: () => api.get<HabitActivationPeriod[]>(`/habits/${habitId}/activate`),
    enabled: !!habitId,
  });
}

export function habitLogsQueryOptions(habitId: string, start: string, end: string) {
  return {
    queryKey: ["habits", habitId, "logs", start, end] as const,
    queryFn: () =>
      api.get<HabitLog[]>(`/habits/${habitId}/logs?start=${start}&end=${end}`),
    enabled: !!habitId,
  };
}

export function useHabitLogs(habitId: string, start?: string, end?: string) {
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const qs = params.toString();
  return useQuery({
    queryKey: ["habits", habitId, "logs", start, end],
    queryFn: () => api.get<HabitLog[]>(`/habits/${habitId}/logs${qs ? `?${qs}` : ""}`),
    enabled: !!habitId,
  });
}

export function useHabitStats(habitId: string) {
  return useQuery({
    queryKey: ["habits", habitId, "stats"],
    queryFn: () =>
      api.get<HabitStats>(`/habits/${habitId}/stats?tz=${encodeURIComponent(LOCAL_TZ)}`),
    enabled: !!habitId,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: HabitDefinitionCreate) => api.post<HabitDefinition>("/habits", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useUpdateHabit(habitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<HabitDefinitionCreate>) =>
      api.patch<HabitDefinition>(`/habits/${habitId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (habitId: string) => api.delete(`/habits/${habitId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useActivateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, starts_on }: { habitId: string; starts_on: string }) =>
      api.post<HabitActivationPeriod>(`/habits/${habitId}/activate`, { starts_on }),
    onSuccess: (_data, { habitId }) => {
      qc.invalidateQueries({ queryKey: ["habits", habitId, "periods"] });
    },
  });
}

export function useArchivePeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, periodId }: { habitId: string; periodId: string }) =>
      api.delete(`/habits/${habitId}/activate/${periodId}`),
    onSuccess: (_data, { habitId }) => {
      qc.invalidateQueries({ queryKey: ["habits", habitId, "periods"] });
    },
  });
}

export function useLogHabit(habitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: HabitLogCreate) => api.post<HabitLog>(`/habits/${habitId}/logs`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits", habitId, "logs"] });
      qc.invalidateQueries({ queryKey: ["habits", habitId, "stats"] });
      qc.invalidateQueries({ queryKey: ["nudges", "stale"] });
    },
  });
}

export function useBackfillAllHabits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entries: { habitId: string; date: string; value: number; notes?: string }[]) => {
      // Group by habitId so we fire one batched call per habit
      const byHabit = new Map<string, { date: string; value: number; notes?: string }[]>();
      for (const { habitId, date, value, notes } of entries) {
        if (!byHabit.has(habitId)) byHabit.set(habitId, []);
        byHabit.get(habitId)!.push({ date, value, ...(notes !== undefined ? { notes } : {}) });
      }
      return Promise.all(
        Array.from(byHabit.entries()).map(([habitId, logs]) =>
          api.post<HabitLog[]>(`/habits/${habitId}/logs/backfill`, logs)
        )
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["nudges", "stale"] });
    },
  });
}

export function useBackfillHabit(habitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entries: HabitLogCreate[]) =>
      api.post<HabitLog[]>(`/habits/${habitId}/logs/backfill`, entries),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits", habitId, "logs"] });
      qc.invalidateQueries({ queryKey: ["habits", habitId, "stats"] });
    },
  });
}

export function useDeleteLogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entries: { habitId: string; logId: string }[]) =>
      Promise.all(entries.map(({ habitId, logId }) => api.delete(`/habits/${habitId}/logs/${logId}`))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits"] });
      qc.invalidateQueries({ queryKey: ["nudges", "stale"] });
    },
  });
}

export function useDeleteHabitLog(habitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (logId: string) => api.delete(`/habits/${habitId}/logs/${logId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits", habitId, "logs"] });
      qc.invalidateQueries({ queryKey: ["habits", habitId, "stats"] });
      qc.invalidateQueries({ queryKey: ["nudges", "stale"] });
    },
  });
}

export function useUpdateHabitLog(habitId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ logId, data }: { logId: string; data: { value?: number; notes?: string } }) =>
      api.patch<HabitLog>(`/habits/${habitId}/logs/${logId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits", habitId, "logs"] }),
  });
}
