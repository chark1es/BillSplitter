import app from "./dist/server/server.js";

const port = Number(process.env.PORT || 3000);

if (!app || typeof app.fetch !== "function") {
  throw new Error("TanStack Start server entry is missing a fetch handler.");
}

const server = Bun.serve({
  port,
  fetch(request) {
    return app.fetch(request);
  },
});

console.log(`FairShare listening on http://0.0.0.0:${server.port}`);
