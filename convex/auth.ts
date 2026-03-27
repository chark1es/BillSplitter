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

const splitCsv = (value?: string) =>
  (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const isLocalhostUrl = (value?: string) =>
  Boolean(value && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value));

const deriveConvexSiteUrl = (convexUrl?: string) => {
  if (!convexUrl) {
    return null;
  }

  try {
    const parsed = new URL(convexUrl);
    if (!parsed.hostname.endsWith(".convex.cloud")) {
      return null;
    }

    parsed.hostname = parsed.hostname.replace(/\.convex\.cloud$/, ".convex.site");
    return parsed.origin;
  } catch {
    return null;
  }
};

const getServerAuthEnv = () => ({
  convexUrl: process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL,
  appUrl:
    (isLocalhostUrl(process.env.BETTER_AUTH_URL) && process.env.APP_PUBLIC_URL
      ? process.env.APP_PUBLIC_URL
      : process.env.BETTER_AUTH_URL) ??
    process.env.APP_PUBLIC_URL ??
    process.env.VITE_APP_URL ??
    FALLBACK_APP_URL,
  secret: process.env.BETTER_AUTH_SECRET ?? FALLBACK_SECRET,
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "google-client-id",
  googleClientSecret:
    process.env.GOOGLE_CLIENT_SECRET ?? "google-client-secret",
  convexSiteUrl:
    process.env.VITE_CONVEX_SITE_URL ??
    process.env.CONVEX_SITE_URL ??
    deriveConvexSiteUrl(process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL) ??
    undefined,
  trustedOrigins: splitCsv(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
});

export const isAuthBypassEnabled = () => {
  const value = (process.env.TEST_AUTH_BYPASS ?? "").toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
};

export const createAuth = (ctx: Parameters<typeof authComponent.adapter>[0]) => {
  const env = getServerAuthEnv();
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
      hypothesisId: "H1,H3",
      location: "convex/auth.ts:78",
      message: "Convex Better Auth env resolved (sanitized)",
      data: {
        appUrl: env.appUrl,
        convexUrl: env.convexUrl ?? null,
        convexSiteUrl: env.convexSiteUrl ?? null,
        trustedOriginsCount: env.trustedOrigins.length,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  return betterAuth({
    baseURL: env.appUrl,
    basePath: "/api/auth",
    secret: env.secret,
    trustedOrigins: [env.appUrl, env.convexSiteUrl, ...env.trustedOrigins].filter(
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
