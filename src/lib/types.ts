import type { Id } from "../../convex/_generated/dataModel";

export type BillId = Id<"bills">;
export type BillItemId = Id<"billItems">;
export type BillParticipantId = Id<"billParticipants">;
export type BillAssignmentId = Id<"billAssignments">;

export type ViewerProfile = {
  id: string;
  name: string;
  email: string;
  image: string | null;
};

export type Viewer = ViewerProfile;

export type ViewerSession = {
  user: ViewerProfile | null;
  deniedProfile: ViewerProfile | null;
  isAuthenticated: boolean;
  allowed: boolean;
  isAdmin: boolean;
  isBypassMode: boolean;
  initialToken: string | null;
};

export type BillStatus = "draft" | "confirmed";
export type BillNextStep = "participants" | "assign" | "review" | "share";
export type TaxTipMode = "proportional" | "equal";

export type BillParticipant = {
  id: BillParticipantId;
  name: string;
  initials: string;
  color: string;
  isSelf: boolean;
};

export type BillItem = {
  id: BillItemId;
  name: string;
  originalLabel?: string;
  price: number;
};

export type BillAssignment = {
  id: BillAssignmentId;
  itemId: BillItemId;
  participantId: BillParticipantId;
};

export type BillDetail = {
  id: BillId;
  title: string;
  status: BillStatus;
  imageNames: string[];
  receiptImageUrls: string[];
  createdAt: number;
  updatedAt: number;
  grandTotal: number;
  taxAmount: number;
  tipAmount: number;
  taxTipMode: TaxTipMode;
  participants: BillParticipant[];
  items: BillItem[];
  assignments: BillAssignment[];
};

export type DashboardBill = {
  id: BillId;
  title: string;
  status: BillStatus;
  createdAt: number;
  updatedAt: number;
  grandTotal: number;
  imageNames: string[];
  receiptImageUrls: string[];
  participantCount: number;
  itemCount: number;
  assignmentCount: number;
  nextStep: BillNextStep;
};

export type ParticipantDraft = {
  name: string;
  initials: string;
  color: string;
  isSelf: boolean;
};

export type AssignmentMap = Record<string, string[]>;

export const asBillId = (value: string) => value as BillId;

export type ParsedReceiptItem = {
  foreignName: string;
  translatedName: string;
  foreignPrice: number;
  usdPrice: number;
};

export type ParsedReceiptPayload = {
  title?: string;
  currencyCode: string;
  fxSnapshot: FxSnapshot;
  items: ParsedReceiptItem[];
  taxForeignAmount: number;
  tipForeignAmount: number;
  taxUsdAmount: number;
  tipUsdAmount: number;
  taxTipMode: TaxTipMode;
  confidence?: number;
  notes?: string;
};

export type FxSnapshot = {
  baseCurrency: "USD";
  currencyCode: string;
  date: string;
  // 1 USD = `foreignUnitsPerUsd` units of `currencyCode`.
  foreignUnitsPerUsd: number;
};
