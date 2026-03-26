import { createFileRoute } from "@tanstack/react-router";
import { getServerAuth } from "../../../lib/auth/server-auth";

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: async ({ request }) => getServerAuth().handler(request),
      POST: async ({ request }) => getServerAuth().handler(request),
    },
  },
});
