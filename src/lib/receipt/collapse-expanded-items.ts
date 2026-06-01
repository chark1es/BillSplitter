import type { AssignmentMap } from "../types";
import {
  normalizeAssignmentMap,
  type QuantityAssignmentMap,
} from "../assignments/assignment-map";
import type { LocalReceiptItem } from "../drafts/local-bill-draft";

const itemGroupKey = (item: LocalReceiptItem) =>
  [
    item.foreignName,
    item.translatedName,
    item.foreignPrice.toFixed(2),
    item.usdPrice.toFixed(2),
  ].join("\0");

export type CollapsedReceiptResult = {
  items: LocalReceiptItem[];
  assignments: QuantityAssignmentMap;
  collapsed: boolean;
};

/**
 * Merges duplicate unit rows (legacy expanded qty) into one line per group.
 */
export const collapseExpandedReceiptItems = (
  items: LocalReceiptItem[],
  assignments: AssignmentMap,
): CollapsedReceiptResult => {
  const normalized = normalizeAssignmentMap(assignments);
  const groups = new Map<string, LocalReceiptItem[]>();

  for (const item of items) {
    if ((item.quantity ?? 1) > 1) {
      return { items, assignments: normalized, collapsed: false };
    }
    const key = itemGroupKey(item);
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }

  let collapsed = false;
  const nextItems: LocalReceiptItem[] = [];
  const nextAssignments: QuantityAssignmentMap = {};

  for (const group of groups.values()) {
    if (group.length === 1) {
      const item = group[0]!;
      nextItems.push(item);
      if (normalized[item.id]) {
        nextAssignments[item.id] = normalized[item.id]!;
      }
      continue;
    }

    collapsed = true;
    const primary = group[0]!;
    const mergedId = primary.id;
    const quantity = group.length;

    nextItems.push({
      ...primary,
      id: mergedId,
      quantity,
    });

    const mergedEntries = group.flatMap((item) => normalized[item.id] ?? []);
    if (mergedEntries.length > 0) {
      const byParticipant = new Map<string, number>();
      for (const entry of mergedEntries) {
        byParticipant.set(
          entry.participantId,
          (byParticipant.get(entry.participantId) ?? 0) + entry.quantity,
        );
      }
      nextAssignments[mergedId] = [...byParticipant.entries()].map(
        ([participantId, qty]) => ({
          participantId,
          quantity: qty,
        }),
      );
    }
  }

  return {
    items: nextItems,
    assignments: nextAssignments,
    collapsed,
  };
};
