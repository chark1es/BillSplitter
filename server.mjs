import app from "./dist/server/server.js";
import { resolve } from "node:path";

const port = Number(process.env.PORT || 3000);
const clientDir = resolve("./dist/client");

if (!app || typeof app.fetch !== "function") {
  throw new Error("TanStack Start server entry is missing a fetch handler.");
}

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);
    const candidatePath = resolve(clientDir, `.${pathname}`);

    if (candidatePath.startsWith(clientDir)) {
      const file = Bun.file(candidatePath);
      if (await file.exists()) {
        return new Response(file);
      }
    }

    return app.fetch(request);
  },
});

console.log(`FairShare listening on http://0.0.0.0:${server.port}`);
