import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient } from "@tanstack/react-query";
import { ConvexReactClient } from "convex/react";
import { getPublicEnv } from "./env";

export const createAppClients = () => {
  const convexClient = new ConvexReactClient(getPublicEnv().convexUrl);
  const convexQueryClient = new ConvexQueryClient(convexClient);

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 30_000,
        queryFn: convexQueryClient.queryFn(),
        queryKeyHashFn: convexQueryClient.hashFn(),
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: Infinity,
      },
      mutations: {
        retry: 0,
      },
    },
  });

  convexQueryClient.connect(queryClient);

  return {
    convexClient,
    convexQueryClient,
    queryClient,
  };
};
