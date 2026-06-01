import type {
  TaxTipMode,
  AssignmentMap,
  FxSnapshot,
  BillId,
  SharedUnitSplitsMap,
} from "../types";

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
  // Unit price in receipt currency (before tax/tip).
  foreignPrice: number;
  usdPrice: number;
  /** Units on this line; default 1. */
  quantity?: number;
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
  isBirthday?: boolean;
  birthdayCoveredByParticipantIds?: string[];
};

export type LocalBillDraft = {
  id: string;
  linkedBillId?: BillId;
  createdAt: number;
  updatedAt: number;

  receipt: {
    pages: LocalReceiptPage[];
    parsed: LocalParsedReceipt | null;
    /** Set after auto-collapsing legacy expanded qty rows. */
    itemsCollapsedVersion?: number;
  };

  participants: LocalParticipant[];
  assignments: AssignmentMap;
  /** itemId -> shared qty split evenly across listed participants */
  sharedUnitSplits?: SharedUnitSplitsMap;
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
    sharedUnitSplits: {},
  };
};

export const roundMoney = (value: number) => {
  // Keep stable 2-decimal UX; avoid floating drift.
  return Math.round(value * 100) / 100;
};
