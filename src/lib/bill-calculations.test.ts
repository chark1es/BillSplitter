import { describe, expect, it } from "vitest";
import {
  buildBillSummary,
  buildCompactItemList,
  buildShareSummaryText,
  createAssignmentMap,
  hydrateBillWithAssignments,
} from "./bill-calculations";
import type { BillDetail } from "./types";

const bill = {
  id: "bill_1",
  title: "Dinner",
  status: "draft",
  imageNames: [],
  receiptImageUrls: [],
  receiptMetadata: {
    currencyCode: "JPY",
    fxSnapshot: {
      baseCurrency: "USD",
      currencyCode: "JPY",
      date: "2026-03-29",
      foreignUnitsPerUsd: 150,
      rateSource: "parity",
    },
    taxForeignAmount: 300,
    tipForeignAmount: 0,
  },
  createdAt: 0,
  updatedAt: 0,
  grandTotal: 20,
  taxAmount: 0,
  tipAmount: 0,
  taxTipMode: "proportional",
  participants: [
    { id: "p1", name: "You", initials: "ME", color: "#000", isSelf: true },
    { id: "p2", name: "Alex", initials: "AK", color: "#111", isSelf: false },
  ],
  items: [
    { id: "i1", name: "Shared fries", price: 12 },
    { id: "i2", name: "Solo dessert", price: 8 },
  ],
  assignments: [
    { id: "a1", itemId: "i1", participantId: "p1" },
    { id: "a2", itemId: "i1", participantId: "p2" },
    { id: "a3", itemId: "i2", participantId: "p1" },
  ],
} as unknown as BillDetail;

describe("bill calculations", () => {
  it("builds a stable assignment map", () => {
    expect(createAssignmentMap(bill.assignments)).toEqual({
      i1: ["p1", "p2"],
      i2: ["p1"],
    });
  });

  it("calculates even shared totals", () => {
    const summary = buildBillSummary(bill);
    expect(summary.grandTotal).toBe(20);
    expect(summary.isFullyAssigned).toBe(true);
    expect(summary.summaries[0]?.total).toBe(14);
    expect(summary.summaries[1]?.total).toBe(6);
  });

  it("hydrates temporary assignment edits into a bill shape", () => {
    const workingBill = hydrateBillWithAssignments(bill, {
      i1: ["p1"],
      i2: ["p2"],
    });

    const summary = buildBillSummary(workingBill);
    expect(summary.summaries[0]?.total).toBe(12);
    expect(summary.summaries[1]?.total).toBe(8);
  });

  it("builds compact item lists", () => {
    const summary = buildBillSummary(bill);
    const compact = buildCompactItemList(summary.summaries[0]?.items ?? [], 1);

    expect(compact.visibleNames).toEqual(["Shared fries"]);
    expect(compact.hiddenCount).toBe(1);
  });

  it("builds share-ready summary text", () => {
    expect(buildShareSummaryText(bill)).toContain("Dinner: $20.00");
    expect(buildShareSummaryText(bill)).toContain("You: $14.00");
  });
});
