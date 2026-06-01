import { cn } from "../../lib/utils";

export function LocalDraftDisclosure({
  className = "",
}: {
  className?: string;
}) {
  return (
    <details className={cn("draft-notice", className)}>
      <summary>Saved on this device</summary>
      <p className="draft-notice__body">
        Receipt edits, people, and assignments auto-save in this browser until you
        confirm the bill. Nothing is stored in your account until then.
      </p>
    </details>
  );
}
