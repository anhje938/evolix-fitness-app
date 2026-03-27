import { CreateExercise } from "@/api/exercise/exercise";
import type { CreateExercisePayload } from "@/types/exercise";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useCreateExercise() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateExercisePayload) => CreateExercise(payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["exercises"] });
    },
  });
}
