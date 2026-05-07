import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const V_GRADES = [
  "V0", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8",
  "V9", "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17",
] as const;
export type VGrade = (typeof V_GRADES)[number];

export const GYM_TYPES = ["recurring", "infrequent"] as const;
export type GymType = (typeof GYM_TYPES)[number];

// ── Gyms ──────────────────────────────────────────────────────────────────────

export interface Gym {
  id: string;
  name: string;
  location: string | null;
  gym_type: GymType;
  created_at: string;
}

export interface GymCreate {
  name: string;
  location?: string;
  gym_type?: GymType;
}

export interface GymUpdate {
  name?: string;
  location?: string;
  gym_type?: GymType;
}

export function useGyms() {
  return useQuery<Gym[]>({
    queryKey: ["gyms"],
    queryFn: () => api.get("/climbing/gyms"),
  });
}

export function useCreateGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GymCreate) => api.post<Gym>("/climbing/gyms", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gyms"] }),
  });
}

export function useUpdateGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: GymUpdate }) =>
      api.patch<Gym>(`/climbing/gyms/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gyms"] }),
  });
}

export function useDeleteGym() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/climbing/gyms/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gyms"] });
      qc.invalidateQueries({ queryKey: ["climbing-stats"] });
    },
  });
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export interface ClimbingSession {
  id: string;
  date: string;
  gym_id: string | null;
  gym_name: string | null;
  duration_minutes: number | null;
  max_grade: VGrade | null;
  companions: string[] | null;
  notes: string | null;
  created_at: string;
}

export interface ClimbingSessionCreate {
  date: string;
  gym_id?: string;
  duration_minutes?: number;
  max_grade?: VGrade;
  companions?: string[];
  notes?: string;
}

export interface ClimbingSessionUpdate {
  date?: string;
  gym_id?: string;
  duration_minutes?: number;
  max_grade?: VGrade;
  companions?: string[];
  notes?: string;
}

export function useClimbingSessions(params?: { start?: string; end?: string }) {
  const qs = new URLSearchParams();
  if (params?.start) qs.set("start", params.start);
  if (params?.end) qs.set("end", params.end);
  const query = qs.toString() ? `?${qs}` : "";
  return useQuery<ClimbingSession[]>({
    queryKey: ["climbing-sessions", params],
    queryFn: () => api.get(`/climbing/sessions${query}`),
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClimbingSessionCreate) =>
      api.post<ClimbingSession>("/climbing/sessions", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["climbing-sessions"] });
      qc.invalidateQueries({ queryKey: ["climbing-stats"] });
      qc.invalidateQueries({ queryKey: ["climbing-nudge"] });
    },
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ClimbingSessionUpdate }) =>
      api.patch<ClimbingSession>(`/climbing/sessions/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["climbing-sessions"] });
      qc.invalidateQueries({ queryKey: ["climbing-stats"] });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/climbing/sessions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["climbing-sessions"] });
      qc.invalidateQueries({ queryKey: ["climbing-stats"] });
      qc.invalidateQueries({ queryKey: ["climbing-nudge"] });
    },
  });
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface GradeProgressionPoint {
  date: string;
  grade: VGrade;
  grade_int: number;
}

export interface MonthlyVolume {
  month: string;
  count: number;
  total_minutes: number | null;
}

export interface GymStats {
  gym_id: string;
  name: string;
  gym_type: GymType;
  visit_count: number;
  total_minutes: number | null;
  last_visit: string | null;
  days_since_last: number | null;
}

export interface FirstPerGrade {
  grade: VGrade;
  grade_int: number;
  first_date: string;
}

export interface CompanionStats {
  name: string;
  session_count: number;
  last_climbed: string | null;
}

export interface ClimbingStats {
  grade_progression: GradeProgressionPoint[];
  monthly_volume: MonthlyVolume[];
  gym_stats: GymStats[];
  first_per_grade: FirstPerGrade[];
  companion_stats: CompanionStats[];
  total_sessions: number;
  total_minutes: number | null;
}

export function useClimbingStats() {
  return useQuery<ClimbingStats>({
    queryKey: ["climbing-stats"],
    queryFn: () => api.get("/climbing/sessions/stats"),
  });
}

// ── Nudge ─────────────────────────────────────────────────────────────────────

export interface ClimbingNudge {
  is_stale: boolean;
  days_since_last: number | null;
  last_session_date: string | null;
  nudge_state: string | null;
  snoozed_until: string | null;
}

export interface ClimbingReminder {
  id: string;
  interval_days: number;
  enabled: boolean;
}

export function useClimbingNudge() {
  return useQuery<ClimbingNudge>({
    queryKey: ["climbing-nudge"],
    queryFn: () => api.get("/climbing/sessions/nudge"),
  });
}

export function useSnoozClimbingNudge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (days: number) =>
      api.post<ClimbingNudge>("/climbing/sessions/nudge/snooze", { days }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["climbing-nudge"] }),
  });
}

export function useDismissClimbingNudge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ClimbingNudge>("/climbing/sessions/nudge/dismiss", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["climbing-nudge"] }),
  });
}

export function useClimbingReminder() {
  return useQuery<ClimbingReminder>({
    queryKey: ["climbing-reminder"],
    queryFn: () => api.get("/climbing/sessions/reminder"),
  });
}

export function useUpdateClimbingReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { interval_days?: number; enabled?: boolean }) =>
      api.patch<ClimbingReminder>("/climbing/sessions/reminder", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["climbing-reminder"] });
      qc.invalidateQueries({ queryKey: ["climbing-nudge"] });
    },
  });
}
