import type { ReactNode } from "react";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { AppShell } from "../components/layout/app-shell";
import { authClient } from "../lib/auth/auth-client";
import { getBuildMarker } from "../lib/build-info";
import { getViewerSession } from "../lib/auth/session.functions";
import type { RouterContext } from "../lib/router-context";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async (ctx) => {
    const auth = await getViewerSession();
    if (auth.initialToken) {
      ctx.context.convexQueryClient.serverHttpClient?.setAuth(auth.initialToken);
    }
    return { auth };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        title: "FairShare",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "theme-color",
        content: "#f6f2ea",
      },
      {
        name: "application-name",
        content: "FairShare",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "FairShare",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "description",
        content: "Invite-only receipt splitting: upload, assign, review, and share.",
      },
      {
        name: "x-build-marker",
        content: getBuildMarker(),
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/favicons/favicon-32x32.png",
      },
      {
        rel: "icon",
        type: "image/png",
        sizes: "16x16",
        href: "/favicons/favicon-16x16.png",
      },
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/favicons/apple-touch-icon.png",
      },
      {
        rel: "manifest",
        href: "/favicons/manifest.json",
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
});

function RootComponent() {
  const context = Route.useRouteContext();

  const app =
    context.auth.user && context.auth.allowed ? (
      <AppShell auth={{ ...context.auth, user: context.auth.user }}>
        <Outlet />
      </AppShell>
    ) : (
      <Outlet />
    );

  return (
    <QueryClientProvider client={context.queryClient}>
      <ConvexBetterAuthProvider
        authClient={authClient}
        client={context.convexQueryClient.convexClient}
        initialToken={context.auth.initialToken}
      >
        {app}
      </ConvexBetterAuthProvider>
    </QueryClientProvider>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  );
}
