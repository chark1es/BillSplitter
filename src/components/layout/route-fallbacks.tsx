import { ErrorComponent, Link, useRouter } from "@tanstack/react-router";

export function DefaultCatchBoundary({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-16">
      <section className="panel w-full p-8 sm:p-10">
        <p className="eyebrow mb-4">Something Broke</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-5xl">
          FairShare hit an unexpected edge case.
        </h1>
        <div className="mt-4 text-sm text-[var(--muted)]">
          <ErrorComponent error={error} />
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <button className="primary-button" onClick={() => router.invalidate()}>
            Try again
          </button>
          <Link className="secondary-button no-underline" to="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

export function DefaultNotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-6 py-16">
      <section className="panel w-full p-8 sm:p-10">
        <p className="eyebrow mb-4">Not Found</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-5xl">
          That page does not exist in FairShare.
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--muted)]">
          The route may be invalid, or the bill you tried to open may no longer be
          available to this account.
        </p>
        <div className="mt-8">
          <Link className="primary-button no-underline" to="/dashboard">
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
