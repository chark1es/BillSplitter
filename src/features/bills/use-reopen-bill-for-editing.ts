import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { fairShareQueries } from "../../lib/queries";
import type { BillDetail, BillId } from "../../lib/types";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import { billDetailToLocalDraft } from "../../lib/drafts/bill-detail-to-local-draft";

export function useReopenBillForEditing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { replaceDraft } = useActiveBillDraft();

  return async (billId: BillId, initialBill?: BillDetail | null) => {
    const bill =
      initialBill ??
      (await queryClient.fetchQuery(fairShareQueries.bills.detail(billId)));

    if (!bill) {
      return false;
    }

    replaceDraft(billDetailToLocalDraft(bill));
    navigate({ to: "/bills/new/review", viewTransition: true });
    return true;
  };
}
