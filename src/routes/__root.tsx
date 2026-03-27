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
import { getViewerSession } from "../lib/auth/session.functions";
import type { RouterContext } from "../lib/router-context";

import appCss from "../styles.css?url";

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const auth = await getViewerSession();
    // #region agent log
    fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "5a9cfe",
      },
      body: JSON.stringify({
        sessionId: "5a9cfe",
        runId: "pre-fix",
        hypothesisId: "H17",
        location: "src/routes/__root.tsx:20",
        message: "Root beforeLoad auth snapshot",
        data: {
          isAuthenticated: auth.isAuthenticated,
          allowed: auth.allowed,
          hasInitialToken: Boolean(auth.initialToken),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return { auth };
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "theme-color",
        content: "#f6f2ea",
      },
      {
        title: "FairShare",
      },
      {
        name: "description",
        content: "Invite-only receipt splitting: upload, assign, review, and share.",
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
