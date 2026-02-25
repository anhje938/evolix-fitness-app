import { getExercisesForUser } from "@/api/exercise/exercise";
import { useQuery } from "@tanstack/react-query";


export function useExercises() {
    return useQuery({
      queryKey: ["exercises"],
      queryFn: getExercisesForUser,
      staleTime: 1000 * 60 * 10, // 10 min
    });
  }
  