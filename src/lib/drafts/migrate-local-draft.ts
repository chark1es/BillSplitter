import { normalizeAssignmentMap } from "../assignments/assignment-map";
import { collapseExpandedReceiptItems } from "../receipt/collapse-expanded-items";
import type { LocalBillDraft } from "./local-bill-draft";

const COLLAPSE_VERSION = 1;

export const migrateLocalBillDraft = (draft: LocalBillDraft): LocalBillDraft => {
  let next: LocalBillDraft = {
    ...draft,
    assignments: normalizeAssignmentMap(draft.assignments),
    participants: draft.participants.map((participant) => ({
      ...participant,
      isBirthday: participant.isBirthday ?? false,
    })),
  };

  if (!next.receipt.parsed) {
    return next;
  }

  if (next.receipt.itemsCollapsedVersion !== COLLAPSE_VERSION) {
    const { items, assignments, collapsed } = collapseExpandedReceiptItems(
      next.receipt.parsed.items,
      next.assignments,
    );
    if (collapsed) {
      next = {
        ...next,
        assignments,
        receipt: {
          ...next.receipt,
          parsed: {
            ...next.receipt.parsed,
            items,
          },
          itemsCollapsedVersion: COLLAPSE_VERSION,
        },
      };
    } else {
      next = {
        ...next,
        receipt: {
          ...next.receipt,
          itemsCollapsedVersion: COLLAPSE_VERSION,
        },
      };
    }
  }

  return next;
};
