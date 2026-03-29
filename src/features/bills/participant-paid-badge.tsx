import { cn } from "#/lib/utils";

type ParticipantPaidBadgeProps = {
  isSelf: boolean;
  className?: string;
  size?: "default" | "compact";
};

export function ParticipantPaidBadge({
  isSelf,
  className,
  size = "default",
}: ParticipantPaidBadgeProps) {
  if (!isSelf) return null;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border border-[rgba(15,118,110,0.28)] bg-[rgba(15,118,110,0.1)] font-bold uppercase tracking-wide text-[var(--teal)]",
        size === "compact" ? "px-1.5 py-0.5 text-[0.58rem]" : "px-2 py-0.5 text-[0.65rem]",
        className,
      )}
    >
      Paid
    </span>
  );
}
