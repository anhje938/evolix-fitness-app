// hooks/useAllExerciseSetsHistory.ts
import type { ExerciseSessionSetsDto } from "@/api/exercise/exerchiseHistory";
import { getExerciseSetsHistory } from "@/api/exercise/exerchiseHistory";
import { useQueries } from "@tanstack/react-query";

export function useAllExerciseSetsHistory(exerciseIds: string[]) {
  const queries = useQueries({
    queries: exerciseIds.map((exerciseId) => ({
      queryKey: ["exerciseSetsHistory", exerciseId],
      queryFn: () => getExerciseSetsHistory(exerciseId),
      enabled: !!exerciseId,
      staleTime: 60 * 1000,
    })),
  });

  // Build a map: { [exerciseId]: ExerciseSessionSetsDto[] }
  const data: Record<string, ExerciseSessionSetsDto[]> = {};
  for (let i = 0; i < exerciseIds.length; i++) {
    const id = exerciseIds[i];
    const q = queries[i];
    if (id) data[id] = (q.data ?? []) as ExerciseSessionSetsDto[];
  }

  const isLoading = queries.some((q) => q.isLoading);
  const isFetching = queries.some((q) => q.isFetching);
  const error =
    (queries.find((q) => q.error)?.error as Error | null | undefined) ?? null;

  return { data, isLoading, isFetching, error, queries };
}
