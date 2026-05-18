import { fetchMyUser, type UserMe } from "@/api/user";
import { useAuth } from "@/context/AuthProvider";
import { useQuery } from "@tanstack/react-query";

export const myUserQueryKey = ["myUser"] as const;

export function useMyUser() {
  const { authReady, token } = useAuth();

  return useQuery<UserMe | null>({
    queryKey: myUserQueryKey,
    queryFn: () => fetchMyUser(token as string),
    enabled: authReady && !!token,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
  });
}
