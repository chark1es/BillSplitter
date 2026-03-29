import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

function AuthenticatedPending() {
  return (
    <div
      className="mx-auto w-full max-w-7xl px-6 py-8"
      aria-busy
      aria-label="Loading"
    >
      <div className="h-2 w-full max-w-md animate-pulse rounded-md bg-[var(--line)]" />
      <div className="mt-6 space-y-3">
        <div className="h-4 max-w-[min(100%,28rem)] animate-pulse rounded-md bg-[var(--line)]" />
        <div className="h-4 max-w-[min(100%,18rem)] animate-pulse rounded-md bg-[var(--line)]" />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context, location }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
        search: {
          redirect: location.href,
        },
      });
    }
    if (!context.auth.allowed) {
      throw redirect({ to: "/access-denied" });
    }
  },
  pendingComponent: AuthenticatedPending,
  component: Outlet,
});
