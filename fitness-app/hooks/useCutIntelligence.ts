import {
  applyCutRecommendation,
  getCurrentCutReport,
  getCutReadiness,
  undoLastCutRecommendation,
} from "@/api/cutIntelligence";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const cutIntelligenceKeys = {
  all: ["cutIntelligence"] as const,
  current: ["cutIntelligence", "current"] as const,
  readiness: ["cutIntelligence", "readiness"] as const,
};

export function useCurrentCutReport(enabled = true) {
  return useQuery({
    queryKey: cutIntelligenceKeys.current,
    queryFn: getCurrentCutReport,
    enabled,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
  });
}

export function useCutReadiness(enabled = true) {
  return useQuery({
    queryKey: cutIntelligenceKeys.readiness,
    queryFn: getCutReadiness,
    enabled,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 20,
    refetchOnWindowFocus: false,
  });
}

export function useApplyCutRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: applyCutRecommendation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: cutIntelligenceKeys.all });
    },
  });
}

export function useUndoLastCutRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: undoLastCutRecommendation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: cutIntelligenceKeys.all });
    },
  });
}
