import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { LOCAL_TZ } from "./habits-api";

export type NudgeState = "active" | "snoozed" | "dismissed";

export interface NudgeStateOut {
  id: string;
  subject_type: string;
  subject_id: string;
  state: NudgeState;
  snoozed_until?: string;
  dismissed_at?: string;
  updated_at: string;
}

export interface StaleHabit {
  habit_id: string;
  habit_name: string;
  last_logged?: string;
  days_since_logged: number;
  nudge_state?: NudgeStateOut;
}

export interface ReminderConfig {
  id: string;
  subject_type: string;
  subject_id: string;
  interval_days: number;
  enabled: boolean;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useStaleHabits() {
  return useQuery({
    queryKey: ["nudges", "stale"],
    queryFn: () =>
      api.get<StaleHabit[]>(`/nudges/stale?tz=${encodeURIComponent(LOCAL_TZ)}`),
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useSnoozeNudge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ habitId, days }: { habitId: string; days: 1 | 3 | 7 | 14 }) =>
      api.post(`/nudges/habits/${habitId}/snooze`, { days }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nudges", "stale"] }),
  });
}

export function useDismissNudge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (habitId: string) => api.post(`/nudges/habits/${habitId}/dismiss`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nudges", "stale"] }),
  });
}

export function useResetNudge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (habitId: string) => api.post(`/nudges/habits/${habitId}/reset`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nudges", "stale"] }),
  });
}
