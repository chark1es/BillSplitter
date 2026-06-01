import { getAssignedQuantity, type QuantityAssignmentMap } from "./assignment-map";

export type SharedUnitSplit = {
  units: number;
  participantIds: string[];
};

export type SharedUnitSplitsMap = Record<string, SharedUnitSplit>;

export const shareUnitsPerParticipant = (split: SharedUnitSplit) =>
  split.units / split.participantIds.length;

/** Exclusive assignments + additional shared pool units (not double-counted). */
export const getEffectiveAssignedUnits = (
  map: QuantityAssignmentMap,
  itemId: string,
  split?: SharedUnitSplit | null,
) => getAssignedQuantity(map, itemId) + (split?.units ?? 0);

export const getParticipantEffectiveUnits = (
  map: QuantityAssignmentMap,
  itemId: string,
  participantId: string,
  split?: SharedUnitSplit | null,
) => {
  const exclusive =
    (map[itemId] ?? []).find((entry) => entry.participantId === participantId)
      ?.quantity ?? 0;
  const shared =
    split?.participantIds.includes(participantId) === true
      ? shareUnitsPerParticipant(split)
      : 0;
  return exclusive + shared;
};

/** Max units available for a new or updated shared split pool. */
export const getMaxSharedSplitUnits = (
  map: QuantityAssignmentMap,
  itemId: string,
  itemQuantity: number,
  existingSplit?: SharedUnitSplit | null,
) =>
  Math.max(
    0,
    itemQuantity -
      getAssignedQuantity(map, itemId) +
      (existingSplit?.units ?? 0),
  );
