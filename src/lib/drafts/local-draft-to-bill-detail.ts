import type { LocalBillDraft } from "./local-bill-draft";
import type { BillDetail } from "../types";

export const localDraftToBillDetail = (draft: LocalBillDraft): BillDetail => {
  const items = (draft.receipt.parsed?.items ?? []).map((item) => ({
    id: item.id as BillDetail["items"][number]["id"],
    name: item.translatedName,
    originalLabel: item.foreignName,
    price: item.usdPrice,
  }));

  const participants = draft.participants.map((participant) => ({
    id: participant.id as BillDetail["participants"][number]["id"],
    name: participant.name,
    initials: participant.initials,
    color: participant.color,
    isSelf: participant.isSelf,
  }));

  const taxAmount = draft.receipt.parsed?.taxUsdAmount ?? 0;
  const tipAmount = draft.receipt.parsed?.tipUsdAmount ?? 0;

  return {
    id: draft.id as BillDetail["id"],
    title: draft.receipt.parsed?.title ?? "Receipt",
    status: "draft",
    imageNames: [],
    receiptImageUrls: draft.receipt.pages.map((p) => p.ufsUrl),
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    grandTotal:
      items.reduce((sum, item) => sum + item.price, 0) + taxAmount + tipAmount,
    taxAmount,
    tipAmount,
    taxTipMode: draft.receipt.parsed?.taxTipMode ?? "proportional",
    participants,
    items,
    assignments: [],
  } as BillDetail;
};
