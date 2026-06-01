import { createFileRoute, getRouteApi, redirect } from "@tanstack/react-router";
import { authClient } from "../lib/auth/auth-client";

const rootRoute = getRouteApi("__root__");

export const Route = createFileRoute("/access-denied")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({ to: "/login" });
    }
    if (context.auth.allowed) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AccessDeniedPage,
});

function AccessDeniedPage() {
  const { auth } = rootRoute.useRouteContext();
  const deniedProfile = auth.deniedProfile;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-10">
      <section className="panel p-6 sm:p-8">
        <p className="section-label mb-2">Invite only</p>
        <h1 className="page-title">No access yet</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Signed in as{" "}
          <span className="font-semibold text-[var(--ink)]">
            {deniedProfile?.email ?? "your account"}
          </span>
          . Ask an admin for an invite, then sign in again with the same email.
        </p>
        <button
          className="primary-button mt-6 w-full"
          type="button"
          onClick={async () => {
            await authClient.signOut();
            window.location.href = "/login";
          }}
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
