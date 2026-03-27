import { CompletedWorkoutSummaryDto, getCompletedWorkouts } from "@/api/exercise/completedWorkouts";
import { useQuery } from "@tanstack/react-query";


export function useCompletedWorkouts() {
  return useQuery<CompletedWorkoutSummaryDto[]>({
    queryKey: ["completedWorkouts"],
    queryFn: getCompletedWorkouts,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}
