import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateCompletedWorkout(id: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (_payload: unknown) => {
      throw new Error(
        "updateCompletedWorkout is not implemented in api/exercise/completedWorkouts.ts"
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["completedWorkout", id] });
      await qc.invalidateQueries({ queryKey: ["completedWorkouts"] });
    },
  });
}
