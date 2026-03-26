const FALLBACK_APP_URL = "http://localhost:3000";
const FALLBACK_CONVEX_URL = "https://example.convex.cloud";
const FALLBACK_CONVEX_SITE_URL = "https://example.convex.site";

const isLocalhostUrl = (value?: string | null) =>
  Boolean(value && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(value));

const deriveConvexSiteUrl = (convexUrl?: string | null) => {
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

export const hasConfiguredConvex = (value?: string | null) =>
  Boolean(
    value &&
      value !== FALLBACK_CONVEX_URL &&
      value !== FALLBACK_CONVEX_SITE_URL &&
      !value.includes("example.convex."),
  );

export const getPublicEnv = () => ({
  appUrl: import.meta.env.VITE_APP_URL || FALLBACK_APP_URL,
  convexUrl: import.meta.env.VITE_CONVEX_URL || FALLBACK_CONVEX_URL,
});

export const getServerEnv = () => ({
  convexUrl:
    process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL ?? FALLBACK_CONVEX_URL,
  convexSiteUrl:
    process.env.VITE_CONVEX_SITE_URL ??
    process.env.CONVEX_SITE_URL ??
    deriveConvexSiteUrl(process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL) ??
    FALLBACK_CONVEX_SITE_URL,
  appUrl:
    (isLocalhostUrl(process.env.BETTER_AUTH_URL) && process.env.APP_PUBLIC_URL
      ? process.env.APP_PUBLIC_URL
      : process.env.BETTER_AUTH_URL) ??
    process.env.APP_PUBLIC_URL ??
    process.env.VITE_APP_URL ??
    FALLBACK_APP_URL,
  betterAuthSecret:
    process.env.BETTER_AUTH_SECRET ??
    "replace-this-dev-secret-before-production-fairshare",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "google-client-id",
  googleClientSecret:
    process.env.GOOGLE_CLIENT_SECRET ?? "google-client-secret",
});
