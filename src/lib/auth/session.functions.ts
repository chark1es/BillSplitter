import { createServerFn } from "@tanstack/react-start";
import type { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { getServerEnv, hasConfiguredConvex } from "../env";
import { getServerAuth } from "./server-auth";

const emptySession = {
  user: null,
  deniedProfile: null,
  isAuthenticated: false,
  allowed: false,
  isAdmin: false,
  isBypassMode: false,
  initialToken: null,
};

const isBypassMode = () => {
  const value = (process.env.TEST_AUTH_BYPASS ?? "").toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
};

export const getViewerSession = createServerFn({ method: "GET" }).handler(
  async () => {
    if (isBypassMode()) {
      return {
        user: {
          id: "testing-mode-user",
          name: "Testing Mode",
          email: "testing@fairshare.local",
          image: null,
        },
        deniedProfile: null,
        isAuthenticated: true,
        allowed: true,
        isAdmin: true,
        isBypassMode: true,
        initialToken: null,
      };
    }

    const env = getServerEnv();
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
        hypothesisId: "H2,H5",
        location: "src/lib/auth/session.functions.ts:41",
        message: "getViewerSession invoked",
        data: {
          hasConfiguredConvexUrl: hasConfiguredConvex(env.convexUrl),
          hasConfiguredConvexSiteUrl: hasConfiguredConvex(env.convexSiteUrl),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!hasConfiguredConvex(env.convexUrl) || !hasConfiguredConvex(env.convexSiteUrl)) {
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
          hypothesisId: "H16",
          location: "src/lib/auth/session.functions.ts:43",
          message: "Returning empty session: convex not configured",
          data: {
            convexUrl: env.convexUrl,
            convexSiteUrl: env.convexSiteUrl,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return emptySession;
    }

    const auth = getServerAuth();
    try {
      const viewer = await auth.fetchAuthQuery(api.auth.viewer, {});

      if (!viewer) {
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
            hypothesisId: "H5",
            location: "src/lib/auth/session.functions.ts:53",
            message: "Viewer missing despite auth call",
            data: {
              hasInitialToken: Boolean(initialToken),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        return emptySession;
      }

      if (!viewer.allowed) {
        let initialToken: string | null = null;
        try {
          initialToken = (await auth.getToken()) ?? null;
        } catch (error) {
          // #region agent log
          fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "5a9cfe",
            },
            body: JSON.stringify({
              sessionId: "5a9cfe",
              runId: "post-fix",
              hypothesisId: "H15",
              location: "src/lib/auth/session.functions.ts:58",
              message: "Token fetch failed for denied viewer, continuing without token",
              data: {
                errorMessage: error instanceof Error ? error.message : "unknown",
              },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
        }
        const deniedResult = {
          user: null,
          deniedProfile: {
            id: viewer.id,
            name: viewer.name,
            email: viewer.email,
            image: viewer.image,
          },
          isAuthenticated: true,
          allowed: false,
          isAdmin: false,
          isBypassMode: false,
          initialToken,
        };
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
            hypothesisId: "H16",
            location: "src/lib/auth/session.functions.ts:95",
            message: "Returning denied viewer session",
            data: {
              isAuthenticated: deniedResult.isAuthenticated,
              allowed: deniedResult.allowed,
              hasInitialToken: Boolean(deniedResult.initialToken),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        return deniedResult;
      }

      let initialToken: string | null = null;
      try {
        initialToken = (await auth.getToken()) ?? null;
      } catch (error) {
        // #region agent log
        fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "5a9cfe",
          },
          body: JSON.stringify({
            sessionId: "5a9cfe",
            runId: "post-fix",
            hypothesisId: "H15",
            location: "src/lib/auth/session.functions.ts:88",
            message: "Token fetch failed for allowed viewer, continuing without token",
            data: {
              errorMessage: error instanceof Error ? error.message : "unknown",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      }

      const allowedResult = {
        user: {
          id: viewer.id,
          name: viewer.name,
          email: viewer.email,
          image: viewer.image,
        },
        deniedProfile: null,
        isAuthenticated: true,
        allowed: true,
        isAdmin: viewer.isAdmin,
        isBypassMode: false,
        initialToken,
      };
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
          hypothesisId: "H16",
          location: "src/lib/auth/session.functions.ts:131",
          message: "Returning allowed viewer session",
          data: {
            isAuthenticated: allowedResult.isAuthenticated,
            allowed: allowedResult.allowed,
            hasInitialToken: Boolean(allowedResult.initialToken),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return allowedResult;
    } catch (error) {
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
          hypothesisId: "H3,H5",
          location: "src/lib/auth/session.functions.ts:88",
          message: "getViewerSession threw",
          data: {
            errorMessage: error instanceof Error ? error.message : "unknown",
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      console.error("getViewerSession failed", error);
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
          hypothesisId: "H16",
          location: "src/lib/auth/session.functions.ts:152",
          message: "Returning empty session from catch",
          data: {},
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return emptySession;
    }
  },
);

export const getDashboardSnapshot = createServerFn({ method: "GET" }).handler(
  async () => {
    const env = getServerEnv();
    if (!hasConfiguredConvex(env.convexUrl) || !hasConfiguredConvex(env.convexSiteUrl)) {
      return [];
    }

    const auth = getServerAuth();
    try {
      return await auth.fetchAuthQuery(api.bills.listBills, {});
    } catch {
      return [];
    }
  },
);

export const getBillSnapshot = createServerFn({ method: "POST" })
  .inputValidator((data: { billId: string }) => data)
  .handler(async ({ data }) => {
    const env = getServerEnv();
    if (!hasConfiguredConvex(env.convexUrl) || !hasConfiguredConvex(env.convexSiteUrl)) {
      return null;
    }

    const auth = getServerAuth();
    try {
      return await auth.fetchAuthQuery(api.bills.getBill, {
        billId: data.billId as Id<"bills">,
      });
    } catch {
      return null;
    }
  });

export const getDebugAuthSnapshot = createServerFn({ method: "GET" }).handler(
  async () => {
    const env = getServerEnv();
    const configured =
      hasConfiguredConvex(env.convexUrl) && hasConfiguredConvex(env.convexSiteUrl);
    if (!configured) {
      return {
        configured: false,
        appUrl: env.appUrl,
        convexUrl: env.convexUrl,
        convexSiteUrl: env.convexSiteUrl,
        hasToken: false,
        hasViewer: false,
        errorMessage: null as string | null,
      };
    }

    const auth = getServerAuth();
    try {
      const [initialToken, viewer] = await Promise.all([
        auth.getToken(),
        auth.fetchAuthQuery(api.auth.viewer, {}),
      ]);
      return {
        configured: true,
        appUrl: env.appUrl,
        convexUrl: env.convexUrl,
        convexSiteUrl: env.convexSiteUrl,
        hasToken: Boolean(initialToken),
        hasViewer: Boolean(viewer),
        viewerAllowed: viewer?.allowed ?? null,
        viewerIsAdmin: viewer?.isAdmin ?? null,
        errorMessage: null as string | null,
      };
    } catch (error) {
      return {
        configured: true,
        appUrl: env.appUrl,
        convexUrl: env.convexUrl,
        convexSiteUrl: env.convexSiteUrl,
        hasToken: false,
        hasViewer: false,
        viewerAllowed: null as boolean | null,
        viewerIsAdmin: null as boolean | null,
        errorMessage: error instanceof Error ? error.message : "unknown",
      };
    }
  },
);
