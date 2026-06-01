import { useState } from "react";
import { authClient } from "../../lib/auth/auth-client";
import { getPublicEnv, hasConfiguredConvex } from "../../lib/env";

export function LoginPage({ redirectTo }: { redirectTo?: string }) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const envConfigured = hasConfiguredConvex(getPublicEnv().convexUrl);

  const handleGoogleSignIn = async () => {
    try {
      setIsPending(true);
      setErrorMessage(null);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo || "/dashboard",
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Could not start Google sign-in.",
      );
      setIsPending(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[100svh] w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="panel p-6 sm:p-8">
        <p className="mb-5 text-lg font-bold text-[var(--ink)]">FairShare</p>

        <h1 className="page-title">Split the check, fairly</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Upload a receipt, assign items to friends, and share what everyone owes.
        </p>

        <ul className="mt-5 space-y-2 text-sm text-[var(--muted)]">
          <li className="flex gap-2">
            <span aria-hidden className="text-[var(--accent)]">
              ·
            </span>
            <span>Sign in with Google — invite-only workspace</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-[var(--accent)]">
              ·
            </span>
            <span>Drafts and confirmed bills stay on your account</span>
          </li>
        </ul>

        {!envConfigured ? (
          <p className="mt-5 rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Configure Convex and auth env vars before testing sign-in.
          </p>
        ) : null}

        <button
          className="primary-button mt-6 w-full"
          disabled={isPending}
          onClick={handleGoogleSignIn}
          type="button"
        >
          {isPending ? "Redirecting…" : "Continue with Google"}
        </button>

        {errorMessage ? (
          <p className="mt-4 rounded-[var(--radius-control)] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </main>
  );
}
