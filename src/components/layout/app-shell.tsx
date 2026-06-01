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
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--header)]">
        <div
          className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5"
          style={{
            paddingTop: "max(0.625rem, env(safe-area-inset-top))",
            paddingLeft: "max(1rem, env(safe-area-inset-left))",
            paddingRight: "max(1rem, env(safe-area-inset-right))",
          }}
        >
          <Link
            to="/dashboard"
            className="truncate text-sm font-bold tracking-tight text-[var(--ink)] no-underline"
          >
            FairShare
          </Link>

          <nav className="ml-auto flex flex-wrap items-center justify-end gap-1">
            <Link
              to="/dashboard"
              className="app-nav-link"
              activeProps={{ className: "app-nav-link is-active" }}
            >
              Bills
            </Link>
            <button className="app-nav-link" onClick={startNewBill} type="button">
              New
            </button>
            <Link
              to="/settings"
              className="app-nav-link"
              activeProps={{ className: "app-nav-link is-active" }}
            >
              Settings
            </Link>
            {auth.isAdmin ? (
              <Link
                to="/admin/invites"
                className="app-nav-link"
                activeProps={{ className: "app-nav-link is-active" }}
              >
                Admin
              </Link>
            ) : null}
            <button className="ghost-button" onClick={handleSignOut} type="button">
              {auth.isBypassMode ? "Test mode" : "Sign out"}
            </button>
          </nav>
        </div>
      </header>

      <div
        className="mx-auto w-full max-w-5xl px-4 py-5"
        style={{
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
