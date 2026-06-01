import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fairShareQueries } from "../../lib/queries";
import type { BillDetail, BillId } from "../../lib/types";
import { buildShareSummaryText } from "../../lib/bill-calculations";
import { BillSummaryScreen } from "./bill-summary-screen";
import { useReopenBillForEditing } from "./use-reopen-bill-for-editing";

export function SharePage({
  billId,
  initialBill,
}: {
  billId: BillId;
  initialBill: BillDetail;
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const reopenBillForEditing = useReopenBillForEditing();
  const billQuery = useQuery({
    ...fairShareQueries.bills.detail(billId),
    initialData: initialBill,
  });
  const bill = billQuery.data ?? initialBill;

  const copySummary = async () => {
    await navigator.clipboard.writeText(buildShareSummaryText(bill));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  };

  return (
    <BillSummaryScreen
      bill={bill}
      description="Copy the summary for your group chat or reopen the bill to make changes."
      eyebrow="Saved"
      sidePanel={
        <aside className="panel p-4 sm:p-5">
          <p className="section-label mb-3">Share</p>
          <button className="primary-button w-full" onClick={copySummary} type="button">
            {copied ? "Copied!" : "Copy summary"}
          </button>
          <button
            className="secondary-button mt-2 w-full"
            disabled={isEditing}
            onClick={async () => {
              setIsEditing(true);
              await reopenBillForEditing(billId, bill);
              setIsEditing(false);
            }}
            type="button"
          >
            {isEditing ? "Opening…" : "Edit bill"}
          </button>
        </aside>
      }
      title={bill.title}
    />
  );
}
