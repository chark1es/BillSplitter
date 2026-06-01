import {
  getAssignedQuantity,
  getItemQuantity,
  normalizeAssignmentMap,
  type QuantityAssignmentMap,
} from "./assignments/assignment-map";
import {
  getEffectiveAssignedUnits,
  getParticipantEffectiveUnits,
  shareUnitsPerParticipant,
} from "./assignments/shared-unit-splits";
import type {
  AssignmentMap,
  BillAssignment,
  BillDetail,
  BillParticipant,
} from "./types";

export {
  assignmentMapsEqualForItems,
  normalizeAssignmentMap,
} from "./assignments/assignment-map";

export const createAssignmentMap = (
  assignments: BillAssignment[],
): QuantityAssignmentMap => {
  const map: QuantityAssignmentMap = {};
  for (const assignment of assignments) {
    const itemId = assignment.itemId as string;
    const participantId = assignment.participantId as string;
    const quantity = assignment.quantity ?? 1;
    const existing = map[itemId] ?? [];
    const index = existing.findIndex((e) => e.participantId === participantId);
    if (index >= 0) {
      existing[index] = {
        participantId,
        quantity: existing[index]!.quantity + quantity,
      };
    } else {
      existing.push({ participantId, quantity });
    }
    map[itemId] = existing;
  }
  return map;
};

export const flattenAssignmentMap = (assignmentMap: AssignmentMap) =>
  Object.entries(normalizeAssignmentMap(assignmentMap)).flatMap(([itemId, entries]) =>
    entries.map(({ participantId, quantity }) => ({
      id: `${itemId}:${participantId}`,
      itemId,
      participantId,
      quantity,
    })),
  );

export const hydrateBillWithAssignments = (
  bill: BillDetail,
  assignmentMap: AssignmentMap,
  sharedUnitSplits?: BillDetail["sharedUnitSplits"],
): BillDetail => ({
  ...bill,
  sharedUnitSplits: sharedUnitSplits ?? bill.sharedUnitSplits,
  assignments: flattenAssignmentMap(assignmentMap).map((assignment) => ({
    id: assignment.id as BillDetail["assignments"][number]["id"],
    itemId: assignment.itemId as BillDetail["items"][number]["id"],
    participantId:
      assignment.participantId as BillDetail["participants"][number]["id"],
    quantity: assignment.quantity,
  })),
});

const assignmentsForItem = (bill: BillDetail, itemId: string) =>
  bill.assignments.filter((assignment) => (assignment.itemId as string) === itemId);

const assignmentQuantityForParticipant = (
  bill: BillDetail,
  itemId: string,
  participantId: string,
) => {
  const rows = assignmentsForItem(bill, itemId).filter(
    (assignment) => (assignment.participantId as string) === participantId,
  );
  if (rows.length === 0) {
    return 0;
  }
  return rows.reduce((sum, row) => sum + (row.quantity ?? 1), 0);
};

const totalAssignedQuantityForItem = (bill: BillDetail, itemId: string) =>
  assignmentsForItem(bill, itemId).reduce(
    (sum, row) => sum + (row.quantity ?? 1),
    0,
  );

const itemLineShareForParticipant = (
  bill: BillDetail,
  item: BillDetail["items"][number],
  participantId: string,
) => {
  const itemId = item.id as string;
  const split = bill.sharedUnitSplits?.[itemId];
  const exclusiveQty = assignmentQuantityForParticipant(bill, itemId, participantId);
  const sharedQty = split?.participantIds.includes(participantId)
    ? shareUnitsPerParticipant(split)
    : 0;

  if (exclusiveQty <= 0 && sharedQty <= 0) {
    return 0;
  }

  const itemQty = getItemQuantity(item);
  const lineTotal = item.price * itemQty;
  const totalAssignedQty = totalAssignedQuantityForItem(bill, itemId);

  if (!split && totalAssignedQty > itemQty) {
    return (exclusiveQty / totalAssignedQty) * lineTotal;
  }

  return (exclusiveQty + sharedQty) * item.price;
};

export const calculatePersonItemTotal = (
  participant: BillParticipant,
  bill: BillDetail,
) =>
  bill.items.reduce(
    (sum, item) =>
      sum +
      itemLineShareForParticipant(bill, item, participant.id as string),
    0,
  );

/** @deprecated use calculatePersonItemTotal */
export const calculatePersonTotal = calculatePersonItemTotal;

const itemsSubtotal = (bill: BillDetail) =>
  bill.items.reduce(
    (sum, item) => sum + item.price * getItemQuantity(item),
    0,
  );

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

const defaultBirthdayCoverers = (
  bill: BillDetail,
  birthdayParticipant: BillParticipant,
) => {
  const configured = birthdayParticipant.birthdayCoveredByParticipantIds;
  if (configured && configured.length > 0) {
    return configured
      .map((id) => bill.participants.find((p) => (p.id as string) === id))
      .filter((p): p is BillParticipant => Boolean(p));
  }
  return bill.participants.filter((p) => p.id !== birthdayParticipant.id);
};

export type BillSummaryRow = {
  participant: BillParticipant;
  total: number;
  itemSubtotal: number;
  taxTipShare: number;
  birthdayCoverIn?: number;
  birthdayCoverOut?: number;
  items: Array<{ item: BillDetail["items"][number]; share: number; quantity: number }>;
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
  const normalizedAssignments = normalizeAssignmentMap(
    createAssignmentMap(bill.assignments),
  );

  const summaries: BillSummaryRow[] = bill.participants.map((participant) => {
    const itemSubtotal = calculatePersonItemTotal(participant, bill);
    const taxTipShare = calculateTaxTipShare(bill, itemSubtotal);
    const items = bill.items.flatMap((item) => {
      const itemId = item.id as string;
      const effectiveQty = getParticipantEffectiveUnits(
        normalizedAssignments,
        itemId,
        participant.id as string,
        bill.sharedUnitSplits?.[itemId],
      );
      if (effectiveQty <= 0) {
        return [];
      }
      const share = itemLineShareForParticipant(bill, item, participant.id as string);
      return [{ item, share, quantity: effectiveQty }];
    });

    return {
      participant,
      itemSubtotal,
      taxTipShare,
      total: itemSubtotal + taxTipShare,
      items,
    };
  });

  for (const birthdayRow of summaries.filter((row) => row.participant.isBirthday)) {
    const pool = birthdayRow.itemSubtotal + birthdayRow.taxTipShare;
    if (pool <= 0) {
      birthdayRow.total = 0;
      continue;
    }
    const coverers = defaultBirthdayCoverers(bill, birthdayRow.participant);
    if (coverers.length === 0) {
      continue;
    }
    const perCoverer = pool / coverers.length;
    birthdayRow.total = 0;
    birthdayRow.birthdayCoverOut = pool;
    for (const coverer of coverers) {
      const coverRow = summaries.find((row) => row.participant.id === coverer.id);
      if (!coverRow) {
        continue;
      }
      coverRow.total += perCoverer;
      coverRow.birthdayCoverIn = (coverRow.birthdayCoverIn ?? 0) + perCoverer;
    }
  }

  const isFullyAssigned =
    bill.items.length > 0 &&
    bill.items.every((item) => {
      const itemId = item.id as string;
      const itemQty = getItemQuantity(item);
      const assigned = getEffectiveAssignedUnits(
        normalizedAssignments,
        itemId,
        bill.sharedUnitSplits?.[itemId],
      );
      if (assigned === itemQty) {
        return true;
      }
      if (itemQty === 1 && assigned > 1 && assignmentsForItem(bill, itemId).length > 0) {
        return true;
      }
      return false;
    });

  return {
    grandTotal: bill.grandTotal,
    itemsSubtotal: subtotalAll,
    taxAndTip: bill.taxAmount + bill.tipAmount,
    isFullyAssigned,
    summaries,
  };
};

export const getAssignmentProgress = (
  assignmentMap: AssignmentMap,
  itemId: string,
  itemQuantity: number,
) => ({
  assigned: getAssignedQuantity(normalizeAssignmentMap(assignmentMap), itemId),
  total: itemQuantity,
});
