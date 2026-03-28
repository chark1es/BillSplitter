import { createClient } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalAction, query } from "./_generated/server";
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

const normalizeAbsoluteUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return null;
  }
};

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

const getTrustedRequestOrigins = (request?: Request) => {
  if (!request) {
    return [];
  }

  const requestUrlOrigin = normalizeAbsoluteUrl(request.url);
  const originHeader = normalizeAbsoluteUrl(request.headers.get("origin"));
  const refererOrigin = normalizeAbsoluteUrl(request.headers.get("referer"));
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedOrigin =
    forwardedHost && forwardedProto
      ? normalizeAbsoluteUrl(`${forwardedProto}://${forwardedHost}`)
      : null;

  return [
    requestUrlOrigin,
    originHeader,
    refererOrigin,
    forwardedOrigin,
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
};

const getServerAuthEnv = () => ({
  convexUrl: process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL,
  appUrl:
    (isLocalhostUrl(process.env.BETTER_AUTH_URL) &&
    (process.env.APP_PUBLIC_URL || process.env.SITE_URL)
      ? process.env.APP_PUBLIC_URL ?? process.env.SITE_URL
      : process.env.BETTER_AUTH_URL) ??
    process.env.SITE_URL ??
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
  trustedOrigins: [
    ...splitCsv(process.env.BETTER_AUTH_TRUSTED_ORIGINS),
    process.env.SITE_URL,
    process.env.APP_PUBLIC_URL,
    process.env.VITE_APP_URL,
  ].filter((value): value is string => Boolean(value?.trim())),
});

export const isAuthBypassEnabled = () => {
  const value = (process.env.TEST_AUTH_BYPASS ?? "").toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
};

export const createAuth = (ctx: Parameters<typeof authComponent.adapter>[0]) => {
  const env = getServerAuthEnv();
  const staticTrustedOrigins = [
    env.appUrl,
    env.convexSiteUrl,
    ...env.trustedOrigins,
  ].filter((value): value is string => Boolean(value));

  return betterAuth({
    baseURL: env.appUrl,
    basePath: "/api/auth",
    secret: env.secret,
    trustedOrigins: (request) => [
      ...staticTrustedOrigins,
      ...getTrustedRequestOrigins(request),
    ],
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

/**
 * Internal action to get the latest JWKS for production setup.
 * Run this to generate and set JWKS in production:
 * npx convex run auth:getLatestJwks --prod | npx convex env set JWKS --prod
 */
export const getLatestJwks = internalAction({
  args: {},
  handler: async (ctx) => {
    const auth = createAuth(ctx);
    return await auth.api.getLatestJwks();
  },
});

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
