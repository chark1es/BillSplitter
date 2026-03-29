import type { TaxTipMode, AssignmentMap, FxSnapshot, BillId } from "../types";

export type LocalReceiptPage = {
  id: string;
  label: string;
  ufsUrl: string;
};

export type LocalReceiptItem = {
  id: string;
  // Original receipt-language name (foreign).
  foreignName: string;
  // Translated/normalized name (English display name).
  translatedName: string;
  // Line-total prices per item (before tax/tip).
  foreignPrice: number;
  usdPrice: number;
};

export type LocalParsedReceipt = {
  title?: string;
  currencyCode: string;
  fxSnapshot: FxSnapshot;
  items: LocalReceiptItem[];
  taxTipMode: TaxTipMode;
  taxForeignAmount: number;
  tipForeignAmount: number;
  taxUsdAmount: number;
  tipUsdAmount: number;
  confidence?: number;
};

export type LocalParticipant = {
  id: string;
  name: string;
  initials: string;
  color: string;
  isSelf: boolean;
};

export type LocalBillDraft = {
  id: string;
  linkedBillId?: BillId;
  createdAt: number;
  updatedAt: number;

  receipt: {
    pages: LocalReceiptPage[];
    parsed: LocalParsedReceipt | null;
  };

  participants: LocalParticipant[];
  // itemId -> participantIds
  assignments: AssignmentMap;
};

export const LOCAL_BILL_DRAFT_STORAGE_KEY = "billSplitter:activeDraft";

export const createEmptyLocalBillDraft = (): LocalBillDraft => {
  const now = Date.now();
  const id = crypto.randomUUID();
  return {
    id,
    linkedBillId: undefined,
    createdAt: now,
    updatedAt: now,
    receipt: {
      pages: [],
      parsed: null,
    },
    participants: [],
    assignments: {},
  };
};

export const roundMoney = (value: number) => {
  // Keep stable 2-decimal UX; avoid floating drift.
  return Math.round(value * 100) / 100;
};
