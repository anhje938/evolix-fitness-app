import { GetWorkouts } from "@/api/exercise/workout";
import { useQuery } from "@tanstack/react-query";


export function useWorkouts() {
  return useQuery({
    queryKey: ["workouts"],
    queryFn: GetWorkouts,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}
