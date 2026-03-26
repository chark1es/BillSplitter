const FALLBACK_APP_URL = "http://localhost:3000";
const FALLBACK_CONVEX_URL = "https://example.convex.cloud";
const FALLBACK_CONVEX_SITE_URL = "https://example.convex.site";

const normalizeAbsoluteUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const repaired = trimmed
    .replace(/^(https?):\/(?!\/)/i, "$1://")
    .replace(/^(https?):(?=[^/])/i, "$1://");

  try {
    const parsed = new URL(repaired);
    const pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
    return `${parsed.origin}${pathname}`;
  } catch {
    return null;
  }
};

const isLocalhostUrl = (value?: string | null) =>
  Boolean(
    normalizeAbsoluteUrl(value) &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(
        normalizeAbsoluteUrl(value)!,
      ),
  );

const deriveConvexSiteUrl = (convexUrl?: string | null) => {
  const normalizedConvexUrl = normalizeAbsoluteUrl(convexUrl);
  if (!normalizedConvexUrl) {
    return null;
  }

  try {
    const parsed = new URL(normalizedConvexUrl);
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
    normalizeAbsoluteUrl(value) &&
      normalizeAbsoluteUrl(value) !== FALLBACK_CONVEX_URL &&
      normalizeAbsoluteUrl(value) !== FALLBACK_CONVEX_SITE_URL &&
      !normalizeAbsoluteUrl(value)!.includes("example.convex."),
  );

export const getPublicEnv = () => ({
  appUrl: normalizeAbsoluteUrl(import.meta.env.VITE_APP_URL) || FALLBACK_APP_URL,
  convexUrl:
    normalizeAbsoluteUrl(import.meta.env.VITE_CONVEX_URL) || FALLBACK_CONVEX_URL,
});

export const getServerEnv = () => {
  const convexUrl =
    normalizeAbsoluteUrl(process.env.VITE_CONVEX_URL) ??
    normalizeAbsoluteUrl(process.env.CONVEX_URL) ??
    normalizeAbsoluteUrl(import.meta.env.VITE_CONVEX_URL) ??
    FALLBACK_CONVEX_URL;

  const preferredSiteUrl =
    normalizeAbsoluteUrl(process.env.VITE_CONVEX_SITE_URL) ??
    normalizeAbsoluteUrl(process.env.CONVEX_SITE_URL) ??
    normalizeAbsoluteUrl(import.meta.env.VITE_CONVEX_SITE_URL);

  const convexSiteUrl =
    (preferredSiteUrl?.endsWith(".convex.cloud")
      ? deriveConvexSiteUrl(preferredSiteUrl)
      : preferredSiteUrl) ??
    deriveConvexSiteUrl(convexUrl) ??
    FALLBACK_CONVEX_SITE_URL;

  return {
    convexUrl,
    convexSiteUrl,
    appUrl:
      normalizeAbsoluteUrl(
        isLocalhostUrl(process.env.BETTER_AUTH_URL) && process.env.APP_PUBLIC_URL
          ? process.env.APP_PUBLIC_URL
          : process.env.BETTER_AUTH_URL,
      ) ??
      normalizeAbsoluteUrl(process.env.APP_PUBLIC_URL) ??
      normalizeAbsoluteUrl(process.env.VITE_APP_URL) ??
      normalizeAbsoluteUrl(import.meta.env.VITE_APP_URL) ??
      FALLBACK_APP_URL,
    betterAuthSecret:
      process.env.BETTER_AUTH_SECRET ??
      "replace-this-dev-secret-before-production-fairshare",
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "google-client-id",
    googleClientSecret:
      process.env.GOOGLE_CLIENT_SECRET ?? "google-client-secret",
  };
};
