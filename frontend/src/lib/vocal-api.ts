import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";

export interface VocalLesson {
  id: string;
  date: string;
  repertoire: string[] | null;
  reflection: string | null;
  created_at: string;
}

export interface VocalLessonCreate {
  date: string;
  repertoire?: string[];
  reflection?: string;
}

export interface VocalLessonUpdate {
  date?: string;
  repertoire?: string[];
  reflection?: string;
}

export interface MonthlyFrequency {
  month: string;
  count: number;
}

export interface RepertoirePiece {
  piece: string;
  count: number;
}

export interface VocalStats {
  monthly_frequency: MonthlyFrequency[];
  repertoire_counts: RepertoirePiece[];
  total_lessons: number;
  lessons_this_year: number;
}

export function useVocalLessons(params?: { start?: string; end?: string }) {
  const qs = new URLSearchParams();
  if (params?.start) qs.set("start", params.start);
  if (params?.end) qs.set("end", params.end);
  const query = qs.toString() ? `?${qs}` : "";
  return useQuery<VocalLesson[]>({
    queryKey: ["vocal-lessons", params],
    queryFn: () => api.get(`/vocal-lessons${query}`),
  });
}

export function useVocalStats() {
  return useQuery<VocalStats>({
    queryKey: ["vocal-stats"],
    queryFn: () => api.get("/vocal-lessons/stats"),
  });
}

export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: VocalLessonCreate) =>
      api.post<VocalLesson>("/vocal-lessons", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vocal-lessons"] });
      qc.invalidateQueries({ queryKey: ["vocal-stats"] });
    },
  });
}

export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: VocalLessonUpdate }) =>
      api.patch<VocalLesson>(`/vocal-lessons/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vocal-lessons"] });
      qc.invalidateQueries({ queryKey: ["vocal-stats"] });
    },
  });
}

export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/vocal-lessons/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vocal-lessons"] });
      qc.invalidateQueries({ queryKey: ["vocal-stats"] });
    },
  });
}
