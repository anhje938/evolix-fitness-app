import { QueryClient } from "@tanstack/react-query";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const queryStaleTimes = {
  short: 2 * MINUTE,
  medium: 5 * MINUTE,
  long: 10 * MINUTE,
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: queryStaleTimes.medium,
      gcTime: 30 * MINUTE,
      refetchOnMount: false,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});
