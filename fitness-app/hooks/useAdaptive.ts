import {
  acceptAdaptiveRecommendation,
  dismissAdaptiveRecommendation,
  generateWeeklyReport,
  getAdaptiveRecommendations,
  getCurrentWeeklyReport,
  getTodayFocus,
  getWeeklyReports,
  regenerateWeeklyReport,
} from "@/api/adaptive";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const adaptiveKeys = {
  all: ["adaptive"] as const,
  today: ["adaptive", "today"] as const,
  currentReport: ["adaptive", "weekly-report", "current"] as const,
  reports: (limit: number) => ["adaptive", "weekly-reports", limit] as const,
  recommendations: ["adaptive", "recommendations"] as const,
};

export function useTodayFocus() {
  return useQuery({
    queryKey: adaptiveKeys.today,
    queryFn: getTodayFocus,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 20,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

export function useCurrentWeeklyReport() {
  return useQuery({
    queryKey: adaptiveKeys.currentReport,
    queryFn: getCurrentWeeklyReport,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

export function useWeeklyReports(limit = 12) {
  return useQuery({
    queryKey: adaptiveKeys.reports(limit),
    queryFn: () => getWeeklyReports(limit),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

export function useAdaptiveRecommendations() {
  return useQuery({
    queryKey: adaptiveKeys.recommendations,
    queryFn: getAdaptiveRecommendations,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 20,
    refetchOnWindowFocus: false,
  });
}

function useInvalidateAdaptive() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adaptiveKeys.all }),
      queryClient.invalidateQueries({ queryKey: ["userSettings"] }),
      queryClient.invalidateQueries({ queryKey: ["completedWorkouts"] }),
      queryClient.invalidateQueries({ queryKey: ["exercises"] }),
    ]);
  };
}

export function useGenerateWeeklyReport() {
  const invalidateAdaptive = useInvalidateAdaptive();

  return useMutation({
    mutationFn: generateWeeklyReport,
    onSuccess: invalidateAdaptive,
  });
}

export function useRegenerateWeeklyReport() {
  const invalidateAdaptive = useInvalidateAdaptive();

  return useMutation({
    mutationFn: regenerateWeeklyReport,
    onSuccess: invalidateAdaptive,
  });
}

export function useAcceptAdaptiveRecommendation() {
  const invalidateAdaptive = useInvalidateAdaptive();

  return useMutation({
    mutationFn: acceptAdaptiveRecommendation,
    onSuccess: invalidateAdaptive,
  });
}

export function useDismissAdaptiveRecommendation() {
  const invalidateAdaptive = useInvalidateAdaptive();

  return useMutation({
    mutationFn: dismissAdaptiveRecommendation,
    onSuccess: invalidateAdaptive,
  });
}
