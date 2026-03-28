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

const forwardAuthRequest = async (request: Request) => {
  const { convexSiteUrl } = getServerEnv();
  const upstreamUrl = new URL(request.url);
  const targetUrl = `${convexSiteUrl}${upstreamUrl.pathname}${upstreamUrl.search}`;
  const targetHost = new URL(convexSiteUrl).host;
  const headers = new Headers();

  for (const headerName of PROXIED_AUTH_HEADERS) {
    const value = request.headers.get(headerName);
    if (value) {
      headers.set(headerName, value);
    }
  }

  headers.set("accept-encoding", "identity");
  headers.set("host", targetHost);

  return fetch(targetUrl, {
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
};

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => forwardAuthRequest(request),
      POST: async ({ request }) => forwardAuthRequest(request),
    },
  },
});
