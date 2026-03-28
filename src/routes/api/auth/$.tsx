import { createFileRoute } from "@tanstack/react-router";
import { getServerEnv } from "../../../lib/env";

const PROXIED_AUTH_HEADERS = [
  "accept",
  "authorization",
  "better-auth-cookie",
  "content-type",
  "cookie",
  "origin",
  "referer",
  "user-agent",
] as const;

const APP_DOMAIN_CONVEX_JWT_COOKIE_NAMES = [
  "better-auth.convex_jwt",
  "__Secure-better-auth.convex_jwt",
] as const;

const getSetCookieHeaders = (headers: Headers) => {
  const cookieHeaders =
    (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];

  if (cookieHeaders.length > 0) {
    return cookieHeaders;
  }

  const combined = headers.get("set-cookie");
  return combined ? [combined] : [];
};

const buildDeleteCookieHeader = (name: string, secure: boolean) =>
  `${name}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;

const forwardAuthRequest = async (request: Request) => {
  const { convexSiteUrl } = getServerEnv();
  const upstreamUrl = new URL(request.url);
  const targetUrl = `${convexSiteUrl}${upstreamUrl.pathname}${upstreamUrl.search}`;
  const targetHost = new URL(convexSiteUrl).host;
  const headers = new Headers();
  const secure = upstreamUrl.protocol === "https:";

  for (const headerName of PROXIED_AUTH_HEADERS) {
    const value = request.headers.get(headerName);
    if (value) {
      if (headerName === "cookie") {
        const filteredCookies = value
          .split(/;\s*/)
          .filter(
            (cookie) =>
              !APP_DOMAIN_CONVEX_JWT_COOKIE_NAMES.some((name) =>
                cookie.startsWith(`${name}=`),
              ),
          )
          .join("; ");

        if (filteredCookies) {
          headers.set(headerName, filteredCookies);
        }
        continue;
      }

      headers.set(headerName, value);
    }
  }

  headers.set("accept-encoding", "identity");
  headers.set("host", targetHost);

  const upstreamResponse = await fetch(targetUrl, {
    method: request.method,
    headers,
    redirect: "manual",
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : request.body,
    // @ts-expect-error duplex is required for streaming request bodies in modern fetch
    duplex: "half",
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  const setCookieHeaders = getSetCookieHeaders(upstreamResponse.headers);
  if (setCookieHeaders.length > 0) {
    responseHeaders.delete("set-cookie");
    for (const setCookieHeader of setCookieHeaders) {
      if (setCookieHeader.includes("better-auth.convex_jwt")) {
        continue;
      }

      responseHeaders.append("set-cookie", setCookieHeader);
    }
  }

  for (const cookieName of APP_DOMAIN_CONVEX_JWT_COOKIE_NAMES) {
    responseHeaders.append("set-cookie", buildDeleteCookieHeader(cookieName, secure));
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
};

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => forwardAuthRequest(request),
      POST: async ({ request }) => forwardAuthRequest(request),
    },
  },
});
