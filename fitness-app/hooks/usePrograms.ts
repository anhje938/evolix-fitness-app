import { GetProgramsForUser } from "@/api/exercise/program";
import { useQuery } from "@tanstack/react-query";


export function usePrograms() {
    return useQuery({
      queryKey: ["programs"],
      queryFn: GetProgramsForUser,
      staleTime: 1000 * 60 * 10, // 10 min
    });
  }
  