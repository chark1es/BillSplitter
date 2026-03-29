import type { BillDetail, FxSnapshot } from "../types";
import type { LocalBillDraft } from "./local-bill-draft";
import { createAssignmentMap } from "../bill-calculations";

const fallbackFxSnapshot = (bill: BillDetail): FxSnapshot => ({
  baseCurrency: "USD",
  currencyCode: bill.receiptMetadata?.currencyCode ?? "USD",
  date: new Date(bill.updatedAt).toISOString().slice(0, 10),
  foreignUnitsPerUsd: 1,
  rateSource: "parity",
});

export const billDetailToLocalDraft = (bill: BillDetail): LocalBillDraft => {
  const metadata = bill.receiptMetadata;
  const fxSnapshot = metadata?.fxSnapshot ?? fallbackFxSnapshot(bill);
  const currencyCode = metadata?.currencyCode ?? fxSnapshot.currencyCode;

  return {
    id: crypto.randomUUID(),
    linkedBillId: bill.id,
    createdAt: bill.createdAt,
    updatedAt: bill.updatedAt,
    receipt: {
      pages: bill.receiptImageUrls.map((ufsUrl, index) => ({
        id: `receipt-page-${index + 1}`,
        label: bill.imageNames[index] ?? `Receipt page ${index + 1}`,
        ufsUrl,
      })),
      parsed: {
        title: bill.title,
        currencyCode,
        fxSnapshot,
        items: bill.items.map((item) => ({
          id: item.id as string,
          foreignName: item.originalLabel ?? item.name,
          translatedName: item.name,
          foreignPrice: item.foreignPrice ?? item.price,
          usdPrice: item.usdPrice ?? item.price,
        })),
        taxTipMode: bill.taxTipMode,
        taxForeignAmount: metadata?.taxForeignAmount ?? bill.taxAmount,
        tipForeignAmount: metadata?.tipForeignAmount ?? bill.tipAmount,
        taxUsdAmount: bill.taxAmount,
        tipUsdAmount: bill.tipAmount,
        confidence: undefined,
      },
    },
    participants: bill.participants.map((participant) => ({
      id: participant.id as string,
      name: participant.name,
      initials: participant.initials,
      color: participant.color,
      isSelf: participant.isSelf,
    })),
    assignments: createAssignmentMap(bill.assignments),
  };
};
