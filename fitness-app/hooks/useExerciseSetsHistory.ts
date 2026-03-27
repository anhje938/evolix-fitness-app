// hooks/useExerciseSetsHistory.ts
import { getExerciseSetsHistory } from "@/api/exercise/exerchiseHistory";
import { useQuery } from "@tanstack/react-query";

export function useExerciseSetsHistory(exerciseId: string | null) {
  return useQuery({
    queryKey: ["exerciseSetsHistory", exerciseId],
    queryFn: () => getExerciseSetsHistory(exerciseId!),
    enabled: !!exerciseId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
