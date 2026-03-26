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
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-12">
      <section className="panel p-8 sm:p-10">
        <p className="eyebrow mb-3">Invite only</p>
        <h1 className="display text-4xl text-[var(--ink)]">No access yet</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">
          Signed in as{" "}
          <span className="font-semibold text-[var(--ink)]">
            {deniedProfile?.email ?? "your account"}
          </span>
          , but this workspace has not been unlocked for you. Ask an admin for an
          invite, then sign in again with the same email.
        </p>
        <button
          className="primary-button mt-8 w-full justify-center"
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
