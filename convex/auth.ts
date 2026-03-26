import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { getViewerAccess } from "./access";

const FALLBACK_APP_URL = "http://localhost:3000";
const FALLBACK_SECRET =
  "replace-this-dev-secret-before-production-fairshare";

export const authComponent = createClient<DataModel>(components.betterAuth);

const TEST_VIEWER = {
  _id: "testing-mode-user",
  name: "Testing Mode",
  email: "testing@fairshare.local",
  image: null,
};

const getServerAuthEnv = () => ({
  appUrl:
    process.env.BETTER_AUTH_URL ??
    process.env.VITE_APP_URL ??
    FALLBACK_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET ?? FALLBACK_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "google-client-id",
  googleClientSecret:
    process.env.GOOGLE_CLIENT_SECRET ?? "google-client-secret",
  convexSiteUrl:
    process.env.VITE_CONVEX_SITE_URL ?? process.env.CONVEX_SITE_URL,
});

export const isAuthBypassEnabled = () => {
  const value = (process.env.TEST_AUTH_BYPASS ?? "").toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
};

export const createAuth = (ctx: Parameters<typeof authComponent.adapter>[0]) => {
  const env = getServerAuthEnv();

  return betterAuth({
    baseURL: env.appUrl,
    basePath: "/api/auth",
    secret: env.secret,
    trustedOrigins: [env.appUrl, env.convexSiteUrl].filter(
      (value): value is string => Boolean(value),
    ),
    database: authComponent.adapter(ctx),
    socialProviders: {
      google: {
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
      },
    },
    plugins: [convex({ authConfig })],
  });
};

type AuthReaderCtx = QueryCtx | MutationCtx;

export const getCurrentViewer = async (ctx: AuthReaderCtx) => {
  if (isAuthBypassEnabled()) {
    return TEST_VIEWER;
  }

  return await authComponent.safeGetAuthUser(ctx);
};

export const requireCurrentViewer = async (ctx: AuthReaderCtx) => {
  const user = await getCurrentViewer(ctx);
  if (!user) {
    throw new Error("Unauthenticated");
  }

  return user;
};

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const { user, allowed, isAdmin } = await getViewerAccess(ctx);

    if (!user) {
      return null;
    }

    return {
      id: user._id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      allowed,
      isAdmin,
    };
  },
});
