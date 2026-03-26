export function LocalDraftDisclosure({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`rounded-[1.4rem] border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-sm text-[var(--muted)] ${className}`}
    >
      <span className="font-semibold text-[var(--ink)]">Browser-local.</span>{" "}
      Your receipt edits, splits, and assignments are auto-saved only in this
      browser/device (localStorage). They are not stored in Convex until you
      confirm.
    </div>
  );
}

