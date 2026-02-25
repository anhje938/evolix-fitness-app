// hooks/useExerciseSetsHistory.ts
import { getExerciseSetsHistory } from "@/api/exercise/exerchiseHistory";
import { useQuery } from "@tanstack/react-query";

export function useExerciseSetsHistory(exerciseId: string | null) {
  return useQuery({
    queryKey: ["exerciseSetsHistory", exerciseId],
    queryFn: () => getExerciseSetsHistory(exerciseId!),
    enabled: !!exerciseId,
    staleTime: 60 * 1000,
  });
}
