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
    if (!hasConfiguredConvex(env.convexUrl) || !hasConfiguredConvex(env.convexSiteUrl)) {
      return emptySession;
    }

    const auth = getServerAuth();
    try {
      const [viewer, initialToken] = await Promise.all([
        auth.fetchAuthQuery(api.auth.viewer, {}),
        auth.getToken(),
      ]);

      if (!viewer) {
        return emptySession;
      }

      if (!viewer.allowed) {
        return {
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
          initialToken: initialToken ?? null,
        };
      }

      return {
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
        initialToken: initialToken ?? null,
      };
    } catch (error) {
      console.error("getViewerSession failed", error);
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
