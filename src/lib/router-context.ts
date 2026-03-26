import type { ConvexQueryClient } from "@convex-dev/react-query";
import type { QueryClient } from "@tanstack/react-query";
import type { ViewerSession } from "./types";

export type RouterContext = {
  queryClient: QueryClient;
  convexQueryClient: ConvexQueryClient;
  auth: ViewerSession;
};
