import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useConvexMutation } from "@convex-dev/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { buildBillSummary, flattenAssignmentMap } from "../../lib/bill-calculations";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import { localDraftToBillDetail } from "../../lib/drafts/local-draft-to-bill-detail";
import type { BillDetail, TaxTipMode } from "../../lib/types";
import { BillWizardNavBar } from "./bill-wizard-nav";
import { LocalDraftDisclosure } from "./local-draft-disclosure";

export function ReviewStep() {
  const navigate = useNavigate();
  const { draft, clearDraft, hydrated } = useActiveBillDraft();

  const [taxInput, setTaxInput] = useState("0");
  const [tipInput, setTipInput] = useState("0");
  const [mode, setMode] = useState<TaxTipMode>("proportional");

  const bill = useMemo(() => (draft ? localDraftToBillDetail(draft) : null), [draft]);

  const assignments = useMemo(() => {
    if (!draft) return [];
    return flattenAssignmentMap(draft.assignments).map((assignment) => ({
      id: assignment.id as BillDetail["assignments"][number]["id"],
      itemId: assignment.itemId as BillDetail["items"][number]["id"],
      participantId:
        assignment.participantId as BillDetail["participants"][number]["id"],
    }));
  }, [draft]);

  const billWithAssignments = useMemo(() => {
    if (!bill) return null;
    return { ...bill, assignments };
  }, [assignments, bill]);

  useEffect(() => {
    if (!hydrated) return;
    if (!draft?.receipt.parsed || (draft.participants?.length ?? 0) < 2) {
      navigate({ to: "/bills/new/participants" });
    }
  }, [draft, hydrated, navigate]);

  useEffect(() => {
    const parsed = draft?.receipt.parsed;
    if (!parsed) return;
    setTaxInput(String(parsed.taxUsdAmount));
    setTipInput(String(parsed.tipUsdAmount));
    setMode(parsed.taxTipMode);
  }, [draft?.receipt.parsed]);

  const itemsSubtotal = useMemo(
    () => bill?.items.reduce((sum, item) => sum + item.price, 0) ?? 0,
    [bill],
  );

  const previewBill: BillDetail | null = useMemo(() => {
    if (!billWithAssignments) return null;
    const taxAmount = Number.parseFloat(taxInput) || 0;
    const tipAmount = Number.parseFloat(tipInput) || 0;
    return {
      ...billWithAssignments,
      taxAmount,
      tipAmount,
      taxTipMode: mode,
      grandTotal: itemsSubtotal + taxAmount + tipAmount,
    };
  }, [billWithAssignments, taxInput, tipInput, mode, itemsSubtotal]);

  const summary = useMemo(() => {
    if (!previewBill) return null;
    return buildBillSummary(previewBill);
  }, [previewBill]);

  const createConfirmedBillMutation = useMutation({
    mutationFn: useConvexMutation(api.bills.createConfirmedBill),
  });

  const handleConfirm = async () => {
    if (!draft || !previewBill || !summary) return;

    const taxAmount = Number.parseFloat(taxInput) || 0;
    const tipAmount = Number.parseFloat(tipInput) || 0;

    const { billId } = (await createConfirmedBillMutation.mutateAsync({
      receiptImageUrls: draft.receipt.pages.map((p) => p.ufsUrl),
      title: draft.receipt.parsed?.title,
      items: draft.receipt.parsed?.items.map((item) => ({
        name: item.translatedName,
        originalLabel: item.foreignName,
        price: item.usdPrice,
      })) ?? [],
      itemLocalIds: draft.receipt.parsed?.items.map((item) => item.id) ?? [],
      taxAmount,
      tipAmount,
      taxTipMode: mode,
      participants: draft.participants.map((p) => ({
        name: p.name,
        initials: p.initials,
        color: p.color,
        isSelf: p.isSelf,
      })),
      participantLocalIds: draft.participants.map((p) => p.id),
      assignments: Object.entries(draft.assignments).map(
        ([itemLocalId, participantLocalIds]) => ({
          itemLocalId,
          participantLocalIds,
        }),
      ),
    })) as { billId: string };

    clearDraft();
    navigate({
      to: "/bills/$billId/share",
      params: { billId },
    });
  };

  if (!bill || !previewBill || !summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <BillWizardNavBar
        onBack={() => navigate({ to: "/bills/new/assign" })}
        step={4}
        backLabel="Back to assign"
      />
      <section className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow mb-3">Step 4</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-6xl">
          Review before you send.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Adjust tax, tip, and how they allocate across people. Totals stay synced
          with your local draft until you confirm.
        </p>
        <div className="mt-4">
          <LocalDraftDisclosure />
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <article className="panel min-w-0 p-6 sm:p-8">
          <div className="bill-total-card">
            <p className="eyebrow">Receipt total</p>
            <p className="display mt-3 text-5xl text-[var(--ink)]">
              ${summary.grandTotal.toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Items ${summary.itemsSubtotal.toFixed(2)} · Tax & tip $
              {summary.taxAndTip.toFixed(2)}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[var(--ink)]">Tax (USD)</span>
              <input
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
                inputMode="decimal"
                onChange={(e) => setTaxInput(e.target.value)}
                value={taxInput}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[var(--ink)]">Tip (USD)</span>
              <input
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
                inputMode="decimal"
                onChange={(e) => setTipInput(e.target.value)}
                value={tipInput}
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className={`secondary-button ${mode === "proportional" ? "ring-2 ring-[var(--accent)]" : ""}`}
              onClick={() => setMode("proportional")}
              type="button"
            >
              Tax & tip: proportional
            </button>
            <button
              className={`secondary-button ${mode === "equal" ? "ring-2 ring-[var(--accent)]" : ""}`}
              onClick={() => setMode("equal")}
              type="button"
            >
              Tax & tip: equal split
            </button>
          </div>

          <div className="mt-6 grid gap-4">
            {summary.summaries.map(
              ({ participant, total, items, taxTipShare, itemSubtotal }) => (
                <article className="bill-card" key={participant.id}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className="avatar-badge h-11 w-11 text-xs"
                        style={{ backgroundColor: participant.color }}
                      >
                        {participant.initials}
                      </span>
                      <div>
                        <p className="font-semibold text-[var(--ink)]">{participant.name}</p>
                        <p className="text-sm text-[var(--muted)]">
                          {items.length} items · items ${itemSubtotal.toFixed(2)}
                          {taxTipShare > 0
                            ? ` · tax/tip $${taxTipShare.toFixed(2)}`
                            : ""}
                        </p>
                      </div>
                    </div>
                    <p className="display text-3xl text-[var(--ink)]">${total.toFixed(2)}</p>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm">
                    {items.map((entry) => (
                      <div className="receipt-row py-2" key={entry.item.id}>
                        <span className="text-[var(--muted)]">{entry.item.name}</span>
                        <span className="font-semibold text-[var(--ink)]">
                          ${entry.share.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </article>
              ),
            )}
          </div>
        </article>

        <aside className="panel p-6">
          <p className="eyebrow mb-3">Confirmation</p>
          <p className="text-sm leading-6 text-[var(--muted)]">
            Confirming creates your bill in Convex and clears this browser-local draft.
          </p>
          <button
            className="primary-button mt-8 w-full justify-center"
            disabled={
              !summary.isFullyAssigned || createConfirmedBillMutation.isPending
            }
            onClick={() => void handleConfirm()}
            type="button"
          >
            {createConfirmedBillMutation.isPending ? "Confirming..." : "Confirm split"}
          </button>
        </aside>
      </section>
    </div>
  );
}
