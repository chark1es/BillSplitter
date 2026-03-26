import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated && !context.auth.allowed) {
      throw redirect({ to: "/access-denied" });
    }
    throw redirect({
      to:
        context.auth.isAuthenticated && context.auth.allowed
          ? "/dashboard"
          : "/login",
    });
  },
});
