import { CompletedWorkoutSummaryDto, getCompletedWorkouts } from "@/api/exercise/completedWorkouts";
import { useQuery } from "@tanstack/react-query";


export function useCompletedWorkouts() {
  return useQuery<CompletedWorkoutSummaryDto[]>({
    queryKey: ["completedWorkouts"],
    queryFn: getCompletedWorkouts,
    staleTime: 60 * 1000,
  });
}
