import type { PropsWithChildren } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { authClient } from "../../lib/auth/auth-client";
import { viewerSessionQueryKey } from "../../lib/queries";
import type { ViewerProfile, ViewerSession } from "../../lib/types";
import { useStartNewBill } from "../../features/bills/use-start-new-bill";

export function AppShell({
  children,
  auth,
}: PropsWithChildren<{
  auth: ViewerSession & { user: ViewerProfile };
}>) {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const startNewBill = useStartNewBill();

  const handleSignOut = async () => {
    if (auth.isBypassMode) {
      return;
    }

    await authClient.signOut();
    queryClient.removeQueries({ queryKey: viewerSessionQueryKey });
    await router.invalidate();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--line)] bg-[color:var(--header)]/90 backdrop-blur-xl">
        <div
          className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-4 px-6 py-4"
          style={{
            paddingTop: "max(1rem, env(safe-area-inset-top))",
            paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
            paddingRight: "max(1.5rem, env(safe-area-inset-right))",
          }}
        >
          <Link to="/dashboard" className="brand-lockup no-underline">
            <span className="brand-mark">FS</span>
            <span>
              <span className="block text-[0.7rem] uppercase tracking-[0.32em] text-[var(--muted)]">
                FairShare
              </span>
              <span className="display text-xl text-[var(--ink)]">split smarter</span>
            </span>
          </Link>

          <nav className="ml-auto flex flex-wrap items-center gap-2 text-sm font-semibold">
            <Link
              to="/dashboard"
              className="nav-pill"
              activeProps={{ className: "nav-pill is-active" }}
            >
              Dashboard
            </Link>
            <button
              className="nav-pill"
              onClick={startNewBill}
              type="button"
            >
              New bill
            </button>
            <Link
              to="/settings"
              className="nav-pill"
              activeProps={{ className: "nav-pill is-active" }}
            >
              Settings
            </Link>
            {auth.isAdmin ? (
              <Link
                to="/admin/invites"
                className="nav-pill"
                activeProps={{ className: "nav-pill is-active" }}
              >
                Admin
              </Link>
            ) : null}
            <button className="secondary-button" onClick={handleSignOut} type="button">
              {auth.isBypassMode ? "Testing mode" : "Sign out"}
            </button>
          </nav>
        </div>
      </header>

      <div
        className="mx-auto flex w-full max-w-7xl flex-col px-6 py-8"
        style={{
          paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
          paddingLeft: "max(1.5rem, env(safe-area-inset-left))",
          paddingRight: "max(1.5rem, env(safe-area-inset-right))",
        }}
      >
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
