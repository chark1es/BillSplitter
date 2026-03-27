import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
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
        hypothesisId: "H4,H5",
        location: "src/routes/_authenticated.tsx:4",
        message: "Authenticated guard evaluated",
        data: {
          isAuthenticated: context.auth.isAuthenticated,
          allowed: context.auth.allowed,
          href: location.href,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
    if (!context.auth.allowed) {
      throw redirect({ to: "/access-denied" });
    }
  },
  component: Outlet,
});
