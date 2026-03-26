import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { routerWithQueryClient } from "@tanstack/react-router-with-query";
import { routeTree } from "./routeTree.gen";
import { DefaultCatchBoundary, DefaultNotFound } from "./components/layout/route-fallbacks";
import { createAppClients } from "./lib/convex-clients";
import type { RouterContext } from "./lib/router-context";

const emptyAuth: RouterContext["auth"] = {
  user: null,
  deniedProfile: null,
  isAuthenticated: false,
  allowed: false,
  isAdmin: false,
  isBypassMode: false,
  initialToken: null,
};

export function getRouter() {
  const { queryClient, convexQueryClient } = createAppClients();

  const router = createTanStackRouter({
    routeTree,
    context: {
      auth: emptyAuth,
      convexQueryClient,
      queryClient,
    },
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: DefaultNotFound,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  });

  return routerWithQueryClient(router, queryClient);
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
