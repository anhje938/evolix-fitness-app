import { GetWorkouts } from "@/api/exercise/workout";
import { useQuery } from "@tanstack/react-query";


export function useWorkouts() {
  return useQuery({
    queryKey: ["workouts"],
    queryFn: GetWorkouts,
  });
}
