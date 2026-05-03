import { CreateExercise } from "@/api/exercise/exercise";
import type { CreateExercisePayload, Exercise } from "@/types/exercise";
import { sortExercisesByPopularity } from "@/utils/exercise/sortExercisesByPopularity";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateExercise() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExercisePayload) => CreateExercise(payload),
    onSuccess: async (created) => {
      qc.setQueryData<Exercise[]>(["exercises"], (current) => {
        const list = Array.isArray(current) ? current : [];
        const withoutDuplicate = list.filter((item) => item.id !== created.id);
        return sortExercisesByPopularity([
          { ...created, usageCount: created.usageCount ?? 0 },
          ...withoutDuplicate,
        ]);
      });
      await qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
