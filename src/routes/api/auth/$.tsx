import { createFileRoute } from "@tanstack/react-router";
import { Agent, fetch as undiciFetch } from "undici";
import { getServerEnv } from "../../../lib/env";

/** Undici fetch bypasses Bun's fetch (Bun can merge a Bun User-Agent that Cloudflare blocks on *.convex.site). IPv4-first avoids broken IPv6 paths to CF. */
const convexUpstreamAgent = new Agent({
  connect: { family: 4 },
});

const PROXIED_AUTH_HEADERS = [
  "accept",
  "authorization",
  "better-auth-cookie",
  "content-type",
  "cookie",
  "origin",
  "referer",
  // Fetch metadata (Better Auth CSRF / origin checks)
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
  // Standard forwarding only — do NOT forward cf-ray / cf-connecting-ip / true-client-ip:
  // those belong to the browser→fairshare hop; sending them to *.convex.site (also on CF)
  // can confuse nested Cloudflare and surface Error 1000 or bogus 403 HTML.
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
] as const;

/** When missing, Node's fetch uses `User-Agent: node` — often blocked by CF (bot/datacenter heuristics). */
const UPSTREAM_USER_AGENT_FALLBACK =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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

/**
 * Upstream Better Auth on *.convex.site may emit `Domain=<deployment>.convex.site`.
 * The browser sees the response from the app host (e.g. fairshare.spwnd.dev) and
 * rejects Set-Cookie when Domain does not match — session cookies never stick, client
 * stays on /login while OAuth appears to succeed.
 */
const rewriteSetCookieForAppOrigin = (setCookie: string) =>
  setCookie
    .replace(/;\s*Domain=[^;]*/gi, "")
    .replace(/;\s*;\s*/g, "; ")
    .trim();

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

  // Ensure upstream sees the public app host when the runtime did not add XFH (common behind proxies).
  const publicUrl = new URL(request.url);
  if (!headers.has("x-forwarded-host")) {
    headers.set("x-forwarded-host", publicUrl.host);
  }
  if (!headers.has("x-forwarded-proto")) {
    headers.set(
      "x-forwarded-proto",
      publicUrl.protocol === "https:" ? "https" : "http",
    );
  }

  const clientUserAgent = request.headers.get("user-agent")?.trim();
  headers.set(
    "user-agent",
    clientUserAgent || UPSTREAM_USER_AGENT_FALLBACK,
  );

  headers.set("accept-encoding", "identity");
  headers.set("host", targetHost);

  const upstreamResponse = await undiciFetch(targetUrl, {
    method: request.method,
    headers,
    redirect: "manual",
    body:
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : request.body,
    // @ts-expect-error duplex is required for streaming request bodies in modern fetch
    duplex: "half",
    dispatcher: convexUpstreamAgent,
  });

  // #region agent log
  if (upstreamResponse.status === 403) {
    fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "243623",
      },
      body: JSON.stringify({
        sessionId: "243623",
        hypothesisId: "H-upstream-cf403,H-node-ua",
        location: "src/routes/api/auth/$.tsx:forwardAuthRequest",
        message: "Upstream Convex auth returned 403",
        data: {
          pathname: upstreamUrl.pathname,
          targetHost,
          contentType: upstreamResponse.headers.get("content-type"),
          forwardedHost: headers.get("x-forwarded-host"),
          forwardedProto: headers.get("x-forwarded-proto"),
          hadClientUserAgent: Boolean(clientUserAgent),
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  }
  // #endregion

  const responseHeaders = new Headers(upstreamResponse.headers);
  const setCookieHeaders = getSetCookieHeaders(upstreamResponse.headers);
  if (setCookieHeaders.length > 0) {
    responseHeaders.delete("set-cookie");
    for (const setCookieHeader of setCookieHeaders) {
      if (setCookieHeader.includes("better-auth.convex_jwt")) {
        continue;
      }

      responseHeaders.append(
        "set-cookie",
        rewriteSetCookieForAppOrigin(setCookieHeader),
      );
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
