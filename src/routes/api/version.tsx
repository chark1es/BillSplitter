import { createFileRoute } from "@tanstack/react-router";
import { getBuildInfo } from "../../lib/build-info";

export const Route = createFileRoute("/api/version")({
  server: {
    handlers: {
      GET: async () => Response.json(getBuildInfo()),
    },
  },
});
