import { useMemo } from "react";
import { useCompletedWorkouts } from "./useCompletedWorkouts";

export function useCompletedWorkout(id: string | null) {
  const query = useCompletedWorkouts();

  const data = useMemo(() => {
    if (!id) return undefined;
    return (query.data ?? []).find((workout) => workout.id === id);
  }, [id, query.data]);

  return {
    ...query,
    data,
  };
}
