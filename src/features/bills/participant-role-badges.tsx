import type { BillParticipant } from "../../lib/types";
import { ParticipantPaidBadge } from "./participant-paid-badge";

type ParticipantRoleBadgesProps = {
  participant: Pick<BillParticipant, "isSelf" | "isBirthday">;
  size?: "default" | "compact";
};

export function ParticipantRoleBadges({
  participant,
  size = "default",
}: ParticipantRoleBadgesProps) {
  if (!participant.isSelf && !participant.isBirthday) {
    return null;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {participant.isSelf ? (
        <ParticipantPaidBadge isSelf size={size} />
      ) : null}
      {participant.isBirthday ? (
        <span
          className={
            size === "compact"
              ? "inline-flex items-center rounded-full border border-violet-300/80 bg-violet-500/12 px-1.5 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide text-violet-800"
              : "inline-flex items-center rounded-full border border-violet-300/80 bg-violet-500/12 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-violet-800"
          }
        >
          Birthday
        </span>
      ) : null}
    </span>
  );
}
