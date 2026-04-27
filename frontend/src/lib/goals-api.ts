import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export type GoalType = "binary" | "milestone";
export type GoalStatus = "active" | "completed" | "archived";
export type GoalDirection = "at_least" | "at_most" | "track";

export interface Goal {
  id: string;
  year: number;
  type: GoalType;
  name: string;
  direction: GoalDirection;
  target_value?: number;
  current_value?: number;
  linked_module?: string;
  status: GoalStatus;
  notes?: string;
  completed_at?: string;
  archived_at?: string;
  created_at: string;
}

export interface GoalCreate {
  year: number;
  type: GoalType;
  name: string;
  direction?: GoalDirection;
  target_value?: number;
  current_value?: number;
  linked_module?: string;
  notes?: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useGoals(year?: number, status?: GoalStatus) {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (status) params.set("status_filter", status);
  const qs = params.toString();
  return useQuery({
    queryKey: ["goals", year, status],
    queryFn: () => api.get<Goal[]>(`/goals${qs ? `?${qs}` : ""}`),
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GoalCreate) => api.post<Goal>("/goals", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useUpdateGoal(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<GoalCreate>) => api.patch<Goal>(`/goals/${goalId}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useCompleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => api.post<Goal>(`/goals/${goalId}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useUncompleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => api.patch<Goal>(`/goals/${goalId}`, { status: "active" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useArchiveGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => api.post<Goal>(`/goals/${goalId}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useUpdateGoalProgress(goalId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (currentValue: number) =>
      api.patch<Goal>(`/goals/${goalId}/progress`, { current_value: currentValue }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => api.delete(`/goals/${goalId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}
