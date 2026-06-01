import type { AssignmentMap } from "../types";

export type ItemAssignment = {
  participantId: string;
  quantity: number;
};

export type QuantityAssignmentMap = Record<string, ItemAssignment[]>;

/** @deprecated legacy shape stored as participant id strings */
export type LegacyAssignmentMap = Record<string, string[]>;

export const getItemQuantity = (item: { quantity?: number }) =>
  Math.max(1, Math.floor(item.quantity ?? 1));

export const isLegacyAssignmentMap = (
  value: Record<string, string[] | ItemAssignment[]>,
): value is LegacyAssignmentMap => {
  const first = Object.values(value)[0];
  if (!first || first.length === 0) {
    return false;
  }
  return typeof first[0] === "string";
};

export const normalizeAssignmentMap = (
  value: LegacyAssignmentMap | QuantityAssignmentMap | AssignmentMap,
): QuantityAssignmentMap => {
  if (Object.keys(value).length === 0) {
    return {};
  }
  if (isLegacyAssignmentMap(value as LegacyAssignmentMap & QuantityAssignmentMap)) {
    const legacy = value as LegacyAssignmentMap;
    return Object.fromEntries(
      Object.entries(legacy).map(([itemId, participantIds]) => [
        itemId,
        participantIds.map((participantId) => ({ participantId, quantity: 1 })),
      ]),
    );
  }
  return value as QuantityAssignmentMap;
};

export const mergeParticipantAssignment = (
  entries: ItemAssignment[],
  participantId: string,
  quantity: number,
): ItemAssignment[] => {
  const without = entries.filter((e) => e.participantId !== participantId);
  if (quantity <= 0) {
    return without;
  }
  return [...without, { participantId, quantity }];
};

export const getAssignedQuantity = (
  map: QuantityAssignmentMap,
  itemId: string,
) => (map[itemId] ?? []).reduce((sum, e) => sum + e.quantity, 0);

export const getRemainingQuantity = (
  map: QuantityAssignmentMap,
  itemId: string,
  itemQuantity: number,
) => Math.max(0, itemQuantity - getAssignedQuantity(map, itemId));

/** Trim or drop assignment rows so total assigned qty does not exceed item qty. */
export const trimAssignmentsToQuantity = (
  entries: ItemAssignment[],
  itemQuantity: number,
): ItemAssignment[] => {
  let remaining = itemQuantity;
  const out: ItemAssignment[] = [];
  for (const entry of entries) {
    if (remaining <= 0) {
      break;
    }
    const qty = Math.min(entry.quantity, remaining);
    if (qty > 0) {
      out.push({ participantId: entry.participantId, quantity: qty });
      remaining -= qty;
    }
  }
  return out;
};

export const isItemQuantityFullyAssigned = (
  map: QuantityAssignmentMap,
  itemId: string,
  itemQuantity: number,
) => getAssignedQuantity(map, itemId) === itemQuantity;

export const assignmentMapsEqualForItems = (
  itemIds: string[],
  left: QuantityAssignmentMap,
  right: QuantityAssignmentMap,
) => {
  for (const itemId of itemIds) {
    const sortEntries = (entries: ItemAssignment[]) =>
      [...entries].sort((a, b) => a.participantId.localeCompare(b.participantId));
    const a = sortEntries(left[itemId] ?? []);
    const b = sortEntries(right[itemId] ?? []);
    if (a.length !== b.length) {
      return false;
    }
    if (a.some((entry, index) => {
      const other = b[index];
      return (
        entry.participantId !== other.participantId ||
        entry.quantity !== other.quantity
      );
    })) {
      return false;
    }
  }
  return true;
};

export const flattenQuantityAssignmentMap = (assignmentMap: QuantityAssignmentMap) =>
  Object.entries(assignmentMap).flatMap(([itemId, entries]) =>
    entries.flatMap(({ participantId, quantity }) =>
      Array.from({ length: quantity }, (_, index) => ({
        id: `${itemId}:${participantId}:${index}`,
        itemId,
        participantId,
        quantity: 1,
      })),
    ),
  );
