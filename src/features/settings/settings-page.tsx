import { getRouteApi, Link } from "@tanstack/react-router";
import { authClient } from "../../lib/auth/auth-client";
import { useState } from "react";
import { PageHeader } from "../../components/layout/page-header";

const rootRoute = getRouteApi("__root__");

export function SettingsPage() {
  const { auth } = rootRoute.useRouteContext();
  const user = auth.user;
  const [isUpdatingPwa, setIsUpdatingPwa] = useState(false);

  const forceUpdatePwa = async () => {
    setIsUpdatingPwa(true);
    try {
      if (typeof window === "undefined") {
        return;
      }

      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(async (registration) => {
            await registration.update().catch(() => null);
            registration.waiting?.postMessage({ type: "SKIP_WAITING" });
          }),
        );
      }

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      const url = new URL(window.location.href);
      url.searchParams.set("refresh", Date.now().toString());
      window.location.replace(url.toString());
    } finally {
      setIsUpdatingPwa(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <PageHeader title="Settings" description="Profile and app preferences." />

      <section className="panel p-4 sm:p-5">
        <p className="section-label mb-3">
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
          <div className="min-w-0">
            <p className="font-semibold text-[var(--ink)]">{user.name}</p>
            <p className="truncate text-sm text-[var(--muted)]">{user.email}</p>
          </div>
        </div>

        {auth.isBypassMode ? (
          <p className="mt-4 rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Auth bypassed via <code>TEST_AUTH_BYPASS=true</code>.
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="secondary-button"
            onClick={() => authClient.signOut()}
            type="button"
          >
            Sign out
          </button>
          <Link className="secondary-button no-underline" to="/dashboard">
            Back to bills
          </Link>
          <button
            className="ghost-button"
            disabled={isUpdatingPwa}
            onClick={() => void forceUpdatePwa()}
            type="button"
          >
            {isUpdatingPwa ? "Updating…" : "Refresh app (PWA)"}
          </button>
        </div>
      </section>
    </div>
  );
}
