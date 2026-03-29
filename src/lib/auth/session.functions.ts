import { createServerFn } from "@tanstack/react-start";
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

// Session is fetched every time this runs; the app caches results in React Query (see __root `beforeLoad`).
export const getViewerSession = createServerFn({ method: "POST" }).handler(
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
    if (!hasConfiguredConvex(env.convexUrl) || !hasConfiguredConvex(env.convexSiteUrl)) {
      return emptySession;
    }

    const auth = getServerAuth();
    try {
      const viewer = await auth.fetchAuthQuery(api.auth.viewer, {});

      if (!viewer) {
        return emptySession;
      }

      if (!viewer.allowed) {
        let initialToken: string | null = null;
        try {
          initialToken = (await auth.getToken()) ?? null;
        } catch {
          // continue without token
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
        return deniedResult;
      }

      let initialToken: string | null = null;
      try {
        initialToken = (await auth.getToken()) ?? null;
      } catch {
        // continue without token
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
      return allowedResult;
    } catch (error) {
      console.error("getViewerSession failed", error);
      return emptySession;
    }
  },
);
