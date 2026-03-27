import { createFileRoute, redirect } from "@tanstack/react-router";
import { LoginPage } from "../features/auth/login-page";

type LoginSearch = {
  redirect?: string;
};

const validateSearch = (search: Record<string, unknown>): LoginSearch => ({
  redirect: typeof search.redirect === "string" ? search.redirect : undefined,
});

export const Route = createFileRoute("/login")({
  validateSearch,
  beforeLoad: ({ context, search }) => {
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
        location: "src/routes/login.tsx:14",
        message: "Login guard evaluated",
        data: {
          isAuthenticated: context.auth.isAuthenticated,
          allowed: context.auth.allowed,
          redirect: search.redirect || "/dashboard",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (context.auth.isAuthenticated && context.auth.allowed) {
      throw redirect({
        to: search.redirect || "/dashboard",
      });
    }
  },
  component: LoginRoute,
});

function LoginRoute() {
  const { redirect: redirectTo } = Route.useSearch();
  return <LoginPage redirectTo={redirectTo} />;
}
