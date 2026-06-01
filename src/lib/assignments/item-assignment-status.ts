import { getAssignedQuantity } from "./assignment-map";
import type { QuantityAssignmentMap } from "./assignment-map";
import {
  getEffectiveAssignedUnits,
  type SharedUnitSplit,
} from "./shared-unit-splits";

export type ItemAssignmentCardStatus = "none" | "partial" | "complete";

export const getItemAssignmentCardStatus = (
  map: QuantityAssignmentMap,
  itemId: string,
  itemQuantity: number,
  sharedSplit?: SharedUnitSplit | null,
): ItemAssignmentCardStatus => {
  const assigned = getEffectiveAssignedUnits(map, itemId, sharedSplit);
  const rawAssigned = getAssignedQuantity(map, itemId);
  if (assigned <= 0) {
    return "none";
  }
  if (
    assigned === itemQuantity ||
    (itemQuantity === 1 && rawAssigned > 1)
  ) {
    return "complete";
  }
  return "partial";
};

export const itemAssignmentCardClassName = (status: ItemAssignmentCardStatus) => {
  switch (status) {
    case "complete":
      return "border-emerald-500/30 bg-emerald-600/[0.07] shadow-[0_8px_24px_rgba(14,116,62,0.12)]";
    case "partial":
      return "border-amber-400/45 bg-amber-400/[0.12] shadow-[0_8px_24px_rgba(180,120,0,0.1)]";
    default:
      return "border-rose-400/35 bg-rose-500/[0.07]";
  }
};
