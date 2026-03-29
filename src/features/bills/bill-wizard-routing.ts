import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import type { LocalBillDraft } from "../../lib/drafts/local-bill-draft";

export const BILL_WIZARD_STEP_PATHS = [
  "/bills/new/upload",
  "/bills/new/itemized",
  "/bills/new/participants",
  "/bills/new/assign",
  "/bills/new/review",
] as const;

export type BillWizardStepPath = (typeof BILL_WIZARD_STEP_PATHS)[number];

export const BILL_WIZARD_STEPS = [
  {
    path: "/bills/new/upload",
    shortLabel: "Upload",
    step: 1,
  },
  {
    path: "/bills/new/itemized",
    shortLabel: "Itemized",
    step: 2,
  },
  {
    path: "/bills/new/participants",
    shortLabel: "People",
    step: 3,
  },
  {
    path: "/bills/new/assign",
    shortLabel: "Assign",
    step: 4,
  },
  {
    path: "/bills/new/review",
    shortLabel: "Summary",
    step: 5,
  },
] as const satisfies Array<{
  path: BillWizardStepPath;
  shortLabel: string;
  step: number;
}>;

export const formatOptionalMoneyInput = (value: number) =>
  value === 0 ? "" : value.toFixed(2);

export const getBillWizardStepState = (draft: LocalBillDraft | null) => {
  const hasParsedReceipt = Boolean(draft?.receipt.parsed);
  const hasEnoughParticipants = (draft?.participants.length ?? 0) >= 2;

  return {
    hasParsedReceipt,
    hasEnoughParticipants,
  };
};

export const canNavigateToWizardStep = (
  path: BillWizardStepPath,
  draft: LocalBillDraft | null,
) => {
  const state = getBillWizardStepState(draft);

  switch (path) {
    case "/bills/new/upload":
      return true;
    case "/bills/new/itemized":
    case "/bills/new/participants":
      return state.hasParsedReceipt;
    case "/bills/new/assign":
    case "/bills/new/review":
      return state.hasParsedReceipt && state.hasEnoughParticipants;
    default:
      return false;
  }
};

export function useBillWizardRoutePreload(currentPath: BillWizardStepPath) {
  const router = useRouter();

  useEffect(() => {
    const currentIndex = BILL_WIZARD_STEP_PATHS.indexOf(currentPath);
    if (currentIndex === -1) {
      return;
    }

    const adjacentPaths = [
      BILL_WIZARD_STEP_PATHS[currentIndex - 1],
      BILL_WIZARD_STEP_PATHS[currentIndex + 1],
    ].filter(Boolean);

    for (const to of adjacentPaths) {
      void router.preloadRoute({ to });
    }
  }, [currentPath, router]);
}
