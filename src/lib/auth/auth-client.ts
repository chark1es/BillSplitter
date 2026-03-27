import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { getPublicEnv } from "../env";

const getAuthBaseUrl = () => {
  if (typeof window !== "undefined") {
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
        hypothesisId: "H6",
        location: "src/lib/auth/auth-client.ts:7",
        message: "Auth client base URL derived from window origin",
        data: {
          origin: window.location.origin,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    return `${window.location.origin}/api/auth`;
  }

  const appUrl = getPublicEnv().appUrl;
  const baseUrl = `${appUrl}/api/auth`;
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
      hypothesisId: "H6,H1",
      location: "src/lib/auth/auth-client.ts:11",
      message: "Auth client base URL derived during SSR",
      data: {
        appUrl,
        baseUrl,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  return baseUrl;
};

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl(),
  plugins: [convexClient()],
});
