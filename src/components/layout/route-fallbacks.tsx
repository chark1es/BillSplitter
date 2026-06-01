import { ErrorComponent, Link, useRouter } from "@tanstack/react-router";

export function DefaultCatchBoundary({ error }: { error: Error }) {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center px-4 py-12">
      <section className="panel w-full p-6 sm:p-8">
        <p className="section-label mb-2">Error</p>
        <h1 className="page-title">Something went wrong</h1>
        <div className="mt-3 text-sm text-[var(--muted)]">
          <ErrorComponent error={error} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="primary-button" onClick={() => router.invalidate()} type="button">
            Try again
          </button>
          <Link className="secondary-button no-underline" to="/dashboard">
            Back to bills
          </Link>
        </div>
      </section>
    </main>
  );
}

export function DefaultNotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-lg items-center px-4 py-12">
      <section className="panel w-full p-6 sm:p-8">
        <p className="section-label mb-2">Not found</p>
        <h1 className="page-title">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          This link may be invalid, or the bill is no longer available.
        </p>
        <div className="mt-5">
          <Link className="primary-button no-underline" to="/dashboard">
            Go to bills
          </Link>
        </div>
      </section>
    </main>
  );
}
