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
      description="Use the compact summary for the group chat, keep the receipt close, and reopen the same bill in the wizard whenever you need to revise it."
      eyebrow="Confirmed"
      sidePanel={
        <aside className="panel p-6">
          <p className="eyebrow mb-3">Share actions</p>
          <button className="primary-button w-full justify-center" onClick={copySummary}>
            {copied ? "Copied!" : "Copy summary"}
          </button>
          <button
            className="secondary-button mt-4 w-full justify-center"
            disabled={isEditing}
            onClick={async () => {
              setIsEditing(true);
              await reopenBillForEditing(billId, bill);
              setIsEditing(false);
            }}
            type="button"
          >
            {isEditing ? "Opening editor..." : "Edit bill"}
          </button>
          <div className="mt-4 rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <p className="text-sm leading-6 text-[var(--muted)]">
              This page is the canonical saved summary. Editing reopens the same bill
              inside the wizard and overwrites it on the next save.
            </p>
          </div>
        </aside>
      }
      title="The split is saved and ready to send."
    />
  );
}
