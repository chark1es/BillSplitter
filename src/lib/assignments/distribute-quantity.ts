import type { ItemAssignment } from "./assignment-map";

/** Split `total` units across participants as evenly as possible (integer parts). */
export const distributeQuantityAcrossParticipants = (
  total: number,
  participantIds: string[],
): ItemAssignment[] => {
  const n = participantIds.length;
  if (n === 0 || total <= 0) {
    return [];
  }
  const units = Math.floor(total);
  const base = Math.floor(units / n);
  const remainder = units - base * n;
  return participantIds.map((participantId, index) => ({
    participantId,
    quantity: base + (index < remainder ? 1 : 0),
  }));
};
