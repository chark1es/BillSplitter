import { useState } from "react";
import { authClient } from "../../lib/auth/auth-client";
import { getPublicEnv, hasConfiguredConvex } from "../../lib/env";

export function LoginPage({ redirectTo }: { redirectTo?: string }) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const envConfigured = hasConfiguredConvex(getPublicEnv().convexUrl);
  const features = [
    {
      title: "Protected sign-in",
      body: "Google OAuth plus session-aware routing. No guest access.",
    },
    {
      title: "Saved state",
      body: "Drafts, participants, assignments, and summaries stay on your account.",
    },
    {
      title: "Built for the table",
      body: "Upload, assign, review, and send without losing your place.",
    },
  ] as const;

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
    <main className="mx-auto grid min-h-[100svh] w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-6 lg:px-8 lg:py-12">
      <section className="hero-panel px-5 py-7 sm:px-7 sm:py-9 lg:px-10 lg:py-11">
        <p className="eyebrow mb-3">FairShare</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-5xl lg:max-w-3xl lg:text-7xl">
          Turn a messy receipt into a clean group payout flow.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
          FairShare turns the splitter concept into a protected app with saved drafts, guided multi-step routes, and a share-ready summary for every dinner.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <li key={feature.title} className="panel list-none p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)] sm:text-sm">
                {feature.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-5 sm:p-7 lg:p-9">
        <p className="eyebrow mb-3">Login</p>
        <h2 className="display text-3xl text-[var(--ink)] sm:text-4xl">Continue with Google.</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">
          Invite-only workspace. Once signed in, routes and data are scoped to your account.
        </p>
        {!envConfigured ? (
          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Set `VITE_CONVEX_URL`, `VITE_CONVEX_SITE_URL` (or `CONVEX_SITE_URL`), `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` before testing the live auth flow.
          </p>
        ) : null}
        <button
          className="primary-button mt-6 w-full justify-center text-base"
          disabled={isPending}
          onClick={handleGoogleSignIn}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/18 text-base sm:h-10 sm:w-10 sm:text-lg">
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
      </section>
    </main>
  );
}
