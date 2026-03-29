import { describe, expect, it } from "vitest";
import { billDetailToLocalDraft } from "./bill-detail-to-local-draft";
import { localDraftToBillDetail } from "./local-draft-to-bill-detail";
import type { BillDetail } from "../types";

const bill = {
  id: "bill_1",
  title: "Sushi dinner",
  status: "confirmed",
  imageNames: ["page-1.webp"],
  receiptImageUrls: ["https://example.com/receipt-1.webp"],
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
    tipForeignAmount: 150,
  },
  createdAt: 1,
  updatedAt: 2,
  grandTotal: 24,
  taxAmount: 2,
  tipAmount: 1,
  taxTipMode: "proportional",
  participants: [
    { id: "p1", name: "You", initials: "ME", color: "#000", isSelf: true },
    { id: "p2", name: "Alex", initials: "AK", color: "#111", isSelf: false },
  ],
  items: [
    {
      id: "i1",
      name: "Salmon roll",
      originalLabel: "サーモン",
      price: 12,
      foreignPrice: 1800,
      usdPrice: 12,
    },
    {
      id: "i2",
      name: "Miso soup",
      originalLabel: "味噌汁",
      price: 9,
      foreignPrice: 1350,
      usdPrice: 9,
    },
  ],
  assignments: [
    { id: "a1", itemId: "i1", participantId: "p1" },
    { id: "a2", itemId: "i2", participantId: "p2" },
  ],
} as unknown as BillDetail;

describe("billDetailToLocalDraft", () => {
  it("round-trips saved bills through the local draft format", () => {
    const draft = billDetailToLocalDraft(bill);

    expect(draft.linkedBillId).toBe("bill_1");
    expect(draft.receipt.pages[0]?.ufsUrl).toBe("https://example.com/receipt-1.webp");
    expect(draft.receipt.parsed?.currencyCode).toBe("JPY");
    expect(draft.receipt.parsed?.items[0]?.foreignPrice).toBe(1800);
    expect(draft.assignments).toEqual({
      i1: ["p1"],
      i2: ["p2"],
    });

    const hydrated = localDraftToBillDetail(draft);
    expect(hydrated.receiptMetadata?.currencyCode).toBe("JPY");
    expect(hydrated.receiptImageUrls).toEqual(bill.receiptImageUrls);
    expect(hydrated.items[0]?.usdPrice).toBe(12);
  });
});
