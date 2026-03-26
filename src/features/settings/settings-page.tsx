import { getRouteApi, Link } from "@tanstack/react-router";
import { authClient } from "../../lib/auth/auth-client";

const rootRoute = getRouteApi("__root__");

export function SettingsPage() {
  const { auth } = rootRoute.useRouteContext();
  const user = auth.user;

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8">
      <section className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow mb-3">Account</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-5xl">Settings</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">
          Profile and session for this device.
        </p>
      </section>

      <section className="panel p-6 sm:p-8">
        <p className="eyebrow mb-3">
          {auth.isBypassMode ? "Testing bypass" : "Signed in"}
        </p>
        <div className="flex items-center gap-3">
          <div className="avatar-badge">
            {user.name
              .split(" ")
              .map((chunk) => chunk[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-[var(--ink)]">{user.name}</p>
            <p className="text-sm text-[var(--muted)]">{user.email}</p>
          </div>
        </div>
        {auth.isBypassMode ? (
          <div className="mt-4 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Auth is being bypassed through <code>TEST_AUTH_BYPASS=true</code>.
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="secondary-button"
            onClick={() => authClient.signOut()}
            type="button"
          >
            Sign out everywhere on this browser
          </button>
          <Link className="secondary-button no-underline" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
