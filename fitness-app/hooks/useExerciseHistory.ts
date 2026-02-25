// hooks/useExerciseHistory.ts
import { useQuery } from "@tanstack/react-query";
import {
  getExerciseHistory,
  type ExerciseHistoryPointDto,
} from "@/api/exercise/exerchiseHistory";

// For ProgressTab – én øvelse om gangen
export function useExerciseHistory(exerciseId: string | null) {
  return useQuery<ExerciseHistoryPointDto[]>({
    queryKey: ["exerciseHistory", exerciseId],
    enabled: !!exerciseId,
    queryFn: () => {
      if (!exerciseId) return Promise.resolve([]);
      return getExerciseHistory(exerciseId);
    },
  });
}

// For ExerciseTab – historikk for ALLE øvelser i lista
export function useAllExerciseHistory(exerciseIds: string[]) {
  return useQuery<Record<string, ExerciseHistoryPointDto[]>>({
    queryKey: ["exerciseHistoryBulk", exerciseIds],
    enabled: exerciseIds.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(
        exerciseIds.map(async (id) => {
          try {
            const history = await getExerciseHistory(id);
            return [id, history] as const;
          } catch {
            // Hvis én feiler, kollaps bare til tom liste for den
            return [id, []] as const;
          }
        })
      );

      return Object.fromEntries(entries);
    },
  });
}
