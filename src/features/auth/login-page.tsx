import { useEffect, useState } from "react";
import { authClient } from "../../lib/auth/auth-client";
import { getDebugAuthSnapshot } from "../../lib/auth/session.functions";
import { getPublicEnv, hasConfiguredConvex } from "../../lib/env";

export function LoginPage({ redirectTo }: { redirectTo?: string }) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResolvingSession, setIsResolvingSession] = useState(false);
  const { data: session, error: sessionError, isPending: isSessionPending } =
    authClient.useSession();
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
      // #region agent log
      fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "5a9cfe",
        },
        body: JSON.stringify({
          sessionId: "5a9cfe",
          runId: "pre-fix",
          hypothesisId: "H4",
          location: "src/features/auth/login-page.tsx:30",
          message: "Starting social sign-in",
          data: {
            callbackURL: redirectTo || "/dashboard",
            origin: typeof window === "undefined" ? null : window.location.origin,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo || "/dashboard",
      });
    } catch (error) {
      // #region agent log
      fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Debug-Session-Id": "5a9cfe",
        },
        body: JSON.stringify({
          sessionId: "5a9cfe",
          runId: "pre-fix",
          hypothesisId: "H7,H8,H9",
          location: "src/features/auth/login-page.tsx:35",
          message: "Social sign-in request failed",
          data: {
            errorMessage: error instanceof Error ? error.message : "unknown",
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      setErrorMessage(
        error instanceof Error ? error.message : "Could not start Google sign-in.",
      );
      setIsPending(false);
    }
  };

  useEffect(() => {
    // #region agent log
    fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "5a9cfe",
      },
      body: JSON.stringify({
        sessionId: "5a9cfe",
        runId: "pre-fix",
        hypothesisId: "H4",
        location: "src/features/auth/login-page.tsx:43",
        message: "Login effect state snapshot",
        data: {
          hasSession: Boolean(session?.session),
          isResolvingSession,
          redirectTo: redirectTo || "/dashboard",
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    if (!session?.session || isResolvingSession) {
      return;
    }

    setIsResolvingSession(true);
    const redirectTarget = redirectTo || "/dashboard";
    const timer = window.setTimeout(() => {
      window.location.assign(redirectTarget);
    }, 150);

    return () => {
      window.clearTimeout(timer);
    };
  }, [isResolvingSession, redirectTo, session?.session]);

  useEffect(() => {
    if (!sessionError) {
      return;
    }
    // #region agent log
    fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "5a9cfe",
      },
      body: JSON.stringify({
        sessionId: "5a9cfe",
        runId: "pre-fix",
        hypothesisId: "H7,H8,H9",
        location: "src/features/auth/login-page.tsx:62",
        message: "Session hook error",
        data: {
          errorMessage:
            sessionError instanceof Error ? sessionError.message : String(sessionError),
          isSessionPending,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [isSessionPending, sessionError]);

  useEffect(() => {
    getDebugAuthSnapshot()
      .then((snapshot) => {
        // #region agent log
        fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "5a9cfe",
          },
          body: JSON.stringify({
            sessionId: "5a9cfe",
            runId: "pre-fix",
            hypothesisId: "H10,H11,H12",
            location: "src/features/auth/login-page.tsx:95",
            message: "Server auth snapshot from login page",
            data: snapshot,
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      })
      .catch((error) => {
        // #region agent log
        fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "5a9cfe",
          },
          body: JSON.stringify({
            sessionId: "5a9cfe",
            runId: "pre-fix",
            hypothesisId: "H10,H11,H12",
            location: "src/features/auth/login-page.tsx:112",
            message: "Server auth snapshot request failed",
            data: {
              errorMessage: error instanceof Error ? error.message : "unknown",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      });
  }, []);

  useEffect(() => {
    if (!session?.session) {
      return;
    }

    fetch("/api/auth/get-session", { credentials: "include" })
      .then(async (response) => {
        const payload = await response.text();
        // #region agent log
        fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "5a9cfe",
          },
          body: JSON.stringify({
            sessionId: "5a9cfe",
            runId: "pre-fix",
            hypothesisId: "H13",
            location: "src/features/auth/login-page.tsx:128",
            message: "Browser get-session check after session truthy",
            data: {
              status: response.status,
              ok: response.ok,
              bodyPreview: payload.slice(0, 250),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      })
      .catch((error) => {
        // #region agent log
        fetch("http://127.0.0.1:7365/ingest/9c6a8657-8a24-4842-90d4-de02842758e1", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "5a9cfe",
          },
          body: JSON.stringify({
            sessionId: "5a9cfe",
            runId: "pre-fix",
            hypothesisId: "H13",
            location: "src/features/auth/login-page.tsx:149",
            message: "Browser get-session check failed",
            data: {
              errorMessage: error instanceof Error ? error.message : "unknown",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      });
  }, [session?.session]);

  return (
    <main className="mx-auto grid min-h-[100svh] w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-center lg:gap-8 lg:px-8 lg:py-12">
      <section className="hero-panel px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
        <p className="eyebrow mb-3">FairShare</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-5xl lg:max-w-3xl lg:text-7xl">
          Turn a messy receipt into a clean group payout flow.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
          FairShare turns the splitter concept into a protected app with saved drafts, guided multi-step routes, and a share-ready summary for every dinner.
        </p>
        <ul className="auth-feature-grid mt-8">
          {features.map((feature) => (
            <li key={feature.title} className="auth-feature-item list-none">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)] sm:text-sm">
                {feature.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)] sm:text-[0.95rem]">{feature.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel p-6 sm:p-8 lg:p-10">
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
          disabled={isPending || isResolvingSession}
          onClick={handleGoogleSignIn}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/18 text-base sm:h-10 sm:w-10 sm:text-lg">
            G
          </span>
          {isPending
            ? "Redirecting to Google..."
            : isResolvingSession
              ? "Finishing sign-in..."
              : "Sign in with Google"}
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
