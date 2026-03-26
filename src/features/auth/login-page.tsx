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
    <main className="mx-auto flex min-h-screen w-full max-w-7xl items-start px-6 py-8 sm:py-12 lg:items-center">
      <div className="grid w-full gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="hero-panel relative px-7 py-10 sm:px-10 sm:py-12">
          <p className="eyebrow mb-4">FairShare</p>
          <h1 className="display max-w-3xl pb-2 text-5xl text-[var(--ink)] sm:text-7xl">
            Turn a messy receipt into a clean group payout flow.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            FairShare moves the provided splitter concept into a real, protected
            app with saved drafts, multi-step routes, and a share-ready summary
            for every dinner.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["Protected sign-in", "Google OAuth and session-aware routing — no guest access."],
              ["Saved state", "Drafts, participants, assignments, and summaries stay on your account."],
              ["Built for the table", "Upload, assign, review, and send without losing your place."],
            ].map(([title, body]) => (
              <article key={title} className="panel min-h-40 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">
                  {title}
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel flex flex-col justify-between p-7 sm:p-10">
          <div>
            <p className="eyebrow mb-4">Login</p>
            <h2 className="display text-4xl text-[var(--ink)]">Continue with Google.</h2>
            <p className="mt-4 text-base leading-7 text-[var(--muted)]">
              Invite-only workspace. Once you are signed in, routes and data are
              scoped to your account.
            </p>
          </div>

          <div className="mt-10">
            {!envConfigured ? (
              <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Set `VITE_CONVEX_URL`, `CONVEX_SITE_URL`, `BETTER_AUTH_URL`,
                `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and
                `GOOGLE_CLIENT_SECRET` before testing the live auth flow.
              </p>
            ) : null}
            <button
              className="primary-button w-full justify-center text-base"
              disabled={isPending}
              onClick={handleGoogleSignIn}
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/18 text-lg">
                G
              </span>
              {isPending ? "Redirecting to Google..." : "Sign in with Google"}
            </button>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              Callback target: <span className="font-semibold text-[var(--ink)]">{redirectTo || "/dashboard"}</span>
            </p>
            {errorMessage ? (
              <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
