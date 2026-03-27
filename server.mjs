import app from "./dist/server/server.js";
import { resolve } from "node:path";

const port = Number(process.env.PORT || 3000);
const clientDir = resolve("./dist/client");
const staticPrefixes = ["/assets/", "/favicons/", "/robots.txt"];

if (!app || typeof app.fetch !== "function") {
  throw new Error("TanStack Start server entry is missing a fetch handler.");
}

const buildValidationRequest = new Request("http://127.0.0.1/login");

const extractStaticAssetPaths = (html) => {
  const paths = new Set();
  const pattern = /(?:href|src)=["'](\/(?:assets|favicons)\/[^"']+)["']/g;

  for (const match of html.matchAll(pattern)) {
    const path = match[1];
    if (path) {
      paths.add(path);
    }
  }

  return [...paths];
};

const assertBuildArtifactsMatch = async () => {
  const response = await app.fetch(buildValidationRequest);
  const html = await response.text();
  const staticAssetPaths = extractStaticAssetPaths(html);
  const missingPaths = [];

  for (const assetPath of staticAssetPaths) {
    const candidatePath = resolve(clientDir, `.${assetPath}`);
    if (!candidatePath.startsWith(clientDir)) {
      missingPaths.push(assetPath);
      continue;
    }

    const file = Bun.file(candidatePath);
    if (!(await file.exists())) {
      missingPaths.push(assetPath);
    }
  }

  if (missingPaths.length > 0) {
    throw new Error(
      `Server and client build outputs are out of sync. Missing static assets: ${missingPaths.join(", ")}`,
    );
  }
};

await assertBuildArtifactsMatch();

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);
    const candidatePath = resolve(clientDir, `.${pathname}`);
    const isStaticRequest = staticPrefixes.some((prefix) => pathname.startsWith(prefix));
    const isAuthRequest = pathname.startsWith("/api/auth/");

    if (candidatePath.startsWith(clientDir)) {
      const file = Bun.file(candidatePath);
      if (await file.exists()) {
        return new Response(file, {
          headers: {
            "Cache-Control": isStaticRequest
              ? "public, max-age=31536000, immutable"
              : "public, max-age=3600",
          },
        });
      }
    }

    if (isStaticRequest) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const response = await app.fetch(request);

    if (isAuthRequest) {
      return response;
    }

    const headers = new Headers(response.headers);
    if (!headers.has("Cache-Control")) {
      headers.set("Cache-Control", "no-store");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
});

console.log(`FairShare listening on http://0.0.0.0:${server.port}`);
