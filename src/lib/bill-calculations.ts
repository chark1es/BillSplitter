import type {
  AssignmentMap,
  BillAssignment,
  BillDetail,
  BillParticipant,
} from "./types";

export const createAssignmentMap = (
  assignments: BillAssignment[],
): AssignmentMap => {
  return assignments.reduce<AssignmentMap>((accumulator, assignment) => {
    const itemId = assignment.itemId as string;
    accumulator[itemId] = [...(accumulator[itemId] ?? []), assignment.participantId];
    return accumulator;
  }, {});
};

/** Compare maps for the same bill items (order-insensitive per item). */
export const assignmentMapsEqualForItems = (
  itemIds: string[],
  left: AssignmentMap,
  right: AssignmentMap,
) => {
  for (const itemId of itemIds) {
    const a = [...(left[itemId] ?? [])].sort();
    const b = [...(right[itemId] ?? [])].sort();
    if (a.length !== b.length) {
      return false;
    }
    if (a.some((value, index) => value !== b[index])) {
      return false;
    }
  }
  return true;
};

export const flattenAssignmentMap = (assignmentMap: AssignmentMap) => {
  return Object.entries(assignmentMap).flatMap(([itemId, participantIds]) =>
    participantIds.map((participantId) => ({
      id: `${itemId}:${participantId}`,
      itemId,
      participantId,
    })),
  );
};

export const hydrateBillWithAssignments = (
  bill: BillDetail,
  assignmentMap: AssignmentMap,
): BillDetail => ({
  ...bill,
  assignments: flattenAssignmentMap(assignmentMap).map((assignment) => ({
    id: assignment.id as BillDetail["assignments"][number]["id"],
    itemId: assignment.itemId as BillDetail["items"][number]["id"],
    participantId:
      assignment.participantId as BillDetail["participants"][number]["id"],
  })),
});

export const calculatePersonItemTotal = (
  participant: BillParticipant,
  bill: BillDetail,
) => {
  return bill.items.reduce((sum, item) => {
    const assignees = bill.assignments.filter(
      (assignment) => assignment.itemId === item.id,
    );

    if (!assignees.some((assignment) => assignment.participantId === participant.id)) {
      return sum;
    }

    return sum + item.price / assignees.length;
  }, 0);
};

/** @deprecated use calculatePersonItemTotal */
export const calculatePersonTotal = calculatePersonItemTotal;

const itemsSubtotal = (bill: BillDetail) =>
  bill.items.reduce((sum, item) => sum + item.price, 0);

export const calculateTaxTipShare = (
  bill: BillDetail,
  itemSubtotalForPerson: number,
) => {
  const pool = bill.taxAmount + bill.tipAmount;
  if (pool <= 0 || bill.participants.length === 0) {
    return 0;
  }
  if (bill.taxTipMode === "equal") {
    return pool / bill.participants.length;
  }
  const denom = itemsSubtotal(bill);
  if (denom <= 0) {
    return pool / bill.participants.length;
  }
  return (itemSubtotalForPerson / denom) * pool;
};

export type BillSummaryRow = {
  participant: BillParticipant;
  total: number;
  itemSubtotal: number;
  taxTipShare: number;
  items: Array<{ item: BillDetail["items"][number]; share: number }>;
};

export const buildCompactItemList = (
  items: Array<{ item: BillDetail["items"][number] }>,
  maxVisible = 3,
) => {
  const names = items.map(({ item }) => item.name);
  return {
    visibleNames: names.slice(0, maxVisible),
    hiddenCount: Math.max(names.length - maxVisible, 0),
  };
};

export const buildShareSummaryText = (bill: BillDetail) => {
  const summary = buildBillSummary(bill);
  const lines = [
    `${bill.title}: $${summary.grandTotal.toFixed(2)}`,
    ...summary.summaries.map(
      ({ participant, total, items }) =>
        `${participant.name}: $${total.toFixed(2)} (${buildCompactItemList(items, 2).visibleNames.join(", ") || "No items"})`,
    ),
  ];

  return lines.join("\n");
};

export const buildBillSummary = (bill: BillDetail) => {
  const subtotalAll = itemsSubtotal(bill);

  const summaries: BillSummaryRow[] = bill.participants.map((participant) => {
    const itemSubtotal = calculatePersonItemTotal(participant, bill);
    const taxTipShare = calculateTaxTipShare(bill, itemSubtotal);
    const items = bill.items.flatMap((item) => {
      const assignees = bill.assignments.filter(
        (assignment) => assignment.itemId === item.id,
      );
      if (!assignees.some((assignment) => assignment.participantId === participant.id)) {
        return [];
      }

      return [
        {
          item,
          share: item.price / assignees.length,
        },
      ];
    });

    return {
      participant,
      itemSubtotal,
      taxTipShare,
      total: itemSubtotal + taxTipShare,
      items,
    };
  });

  const assignedItemIds = new Set(bill.assignments.map((assignment) => assignment.itemId));

  return {
    grandTotal: bill.grandTotal,
    itemsSubtotal: subtotalAll,
    taxAndTip: bill.taxAmount + bill.tipAmount,
    isFullyAssigned: assignedItemIds.size === bill.items.length && bill.items.length > 0,
    summaries,
  };
};
