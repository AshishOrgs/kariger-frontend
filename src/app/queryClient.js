import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,   // 5 minutes — prevents refetch on every navigation
      gcTime: 10 * 60_000,     // 10 minutes cache retention
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
