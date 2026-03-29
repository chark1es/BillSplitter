import { useNavigate } from "@tanstack/react-router";
import { createEmptyLocalBillDraft } from "../../lib/drafts/local-bill-draft";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";

export function useStartNewBill() {
  const navigate = useNavigate();
  const { replaceDraft } = useActiveBillDraft();

  return () => {
    replaceDraft(createEmptyLocalBillDraft());
    navigate({ to: "/bills/new/upload", viewTransition: true });
  };
}
