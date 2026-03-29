import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useConvexMutation } from "@convex-dev/react-query";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../../convex/_generated/api";
import {
  buildBillSummary,
  buildShareSummaryText,
  flattenAssignmentMap,
} from "../../lib/bill-calculations";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import { localDraftToBillDetail } from "../../lib/drafts/local-draft-to-bill-detail";
import type { BillDetail, FxSnapshot, TaxTipMode } from "../../lib/types";
import { BillSummaryScreen } from "./bill-summary-screen";
import { BillWizardNavBar } from "./bill-wizard-nav";
import { LocalDraftDisclosure } from "./local-draft-disclosure";
import {
  formatOptionalMoneyInput,
  useBillWizardRoutePreload,
} from "./bill-wizard-routing";

const fallbackFxSnapshot = (): FxSnapshot => ({
  baseCurrency: "USD",
  currencyCode: "USD",
  date: new Date().toISOString().slice(0, 10),
  foreignUnitsPerUsd: 1,
  rateSource: "parity",
});

export function ReviewStep() {
  const navigate = useNavigate();
  const { draft, patchDraft, hydrated } = useActiveBillDraft();
  useBillWizardRoutePreload("/bills/new/review");

  const [taxInput, setTaxInput] = useState("");
  const [tipInput, setTipInput] = useState("");
  const [mode, setMode] = useState<TaxTipMode>("proportional");
  const [copied, setCopied] = useState(false);

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
    setTaxInput(formatOptionalMoneyInput(parsed.taxUsdAmount));
    setTipInput(formatOptionalMoneyInput(parsed.tipUsdAmount));
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

  const updateDraftTotals = (next: {
    taxUsdAmount?: number;
    tipUsdAmount?: number;
    taxTipMode?: TaxTipMode;
  }) => {
    patchDraft((prev) => {
      if (!prev.receipt.parsed) {
        return prev;
      }

      const rate = prev.receipt.parsed.fxSnapshot.foreignUnitsPerUsd ?? 1;
      return {
        ...prev,
        receipt: {
          ...prev.receipt,
          parsed: {
            ...prev.receipt.parsed,
            taxUsdAmount: next.taxUsdAmount ?? prev.receipt.parsed.taxUsdAmount,
            tipUsdAmount: next.tipUsdAmount ?? prev.receipt.parsed.tipUsdAmount,
            taxForeignAmount:
              next.taxUsdAmount != null
                ? Number((next.taxUsdAmount * rate).toFixed(2))
                : prev.receipt.parsed.taxForeignAmount,
            tipForeignAmount:
              next.tipUsdAmount != null
                ? Number((next.tipUsdAmount * rate).toFixed(2))
                : prev.receipt.parsed.tipForeignAmount,
            taxTipMode: next.taxTipMode ?? prev.receipt.parsed.taxTipMode,
          },
        },
      };
    });
  };

  const handleSave = async () => {
    if (!draft || !previewBill || !summary || !draft.receipt.parsed) return;

    const taxAmount = Number.parseFloat(taxInput) || 0;
    const tipAmount = Number.parseFloat(tipInput) || 0;

    const { billId } = (await createConfirmedBillMutation.mutateAsync({
      billId: draft.linkedBillId,
      receiptImageUrls: draft.receipt.pages.map((p) => p.ufsUrl),
      title: draft.receipt.parsed.title,
      receiptMetadata: {
        currencyCode: draft.receipt.parsed.currencyCode,
        fxSnapshot: draft.receipt.parsed.fxSnapshot ?? fallbackFxSnapshot(),
        taxForeignAmount: draft.receipt.parsed.taxForeignAmount,
        tipForeignAmount: draft.receipt.parsed.tipForeignAmount,
      },
      items: draft.receipt.parsed.items.map((item) => ({
        name: item.translatedName,
        originalLabel: item.foreignName,
        price: item.usdPrice,
        foreignPrice: item.foreignPrice,
        usdPrice: item.usdPrice,
      })),
      itemLocalIds: draft.receipt.parsed.items.map((item) => item.id),
      taxAmount,
      tipAmount,
      taxTipMode: mode,
      participants: draft.participants.map((participant) => ({
        name: participant.name,
        initials: participant.initials,
        color: participant.color,
        isSelf: participant.isSelf,
      })),
      participantLocalIds: draft.participants.map((participant) => participant.id),
      assignments: Object.entries(draft.assignments).map(
        ([itemLocalId, participantLocalIds]) => ({
          itemLocalId,
          participantLocalIds,
        }),
      ),
    })) as { billId: BillDetail["id"] };

    patchDraft((prev) => ({
      ...prev,
      linkedBillId: billId,
    }));
  };

  const copySummary = async () => {
    if (!previewBill) return;
    await navigator.clipboard.writeText(buildShareSummaryText(previewBill));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  };

  if (!bill || !previewBill || !summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <BillWizardNavBar
        backLabel="Back to assign"
        currentPath="/bills/new/review"
        onBack={() => navigate({ to: "/bills/new/assign", viewTransition: true })}
        step={5}
        totalSteps={5}
      />

      <BillSummaryScreen
        bill={previewBill}
        contentTop={
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-[var(--ink)]">Tax (USD)</span>
                <input
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  inputMode="decimal"
                  onChange={(e) => {
                    const value = e.target.value;
                    setTaxInput(value);
                    if (!value.trim()) {
                      updateDraftTotals({ taxUsdAmount: 0 });
                      return;
                    }
                    const next = Number.parseFloat(value);
                    if (Number.isFinite(next)) {
                      updateDraftTotals({ taxUsdAmount: next });
                    }
                  }}
                  value={taxInput}
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="font-semibold text-[var(--ink)]">Tip (USD)</span>
                <input
                  className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  inputMode="decimal"
                  onChange={(e) => {
                    const value = e.target.value;
                    setTipInput(value);
                    if (!value.trim()) {
                      updateDraftTotals({ tipUsdAmount: 0 });
                      return;
                    }
                    const next = Number.parseFloat(value);
                    if (Number.isFinite(next)) {
                      updateDraftTotals({ tipUsdAmount: next });
                    }
                  }}
                  value={tipInput}
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className={`secondary-button ${mode === "proportional" ? "ring-2 ring-[var(--accent)]" : ""}`}
                onClick={() => {
                  setMode("proportional");
                  updateDraftTotals({ taxTipMode: "proportional" });
                }}
                type="button"
              >
                Tax & tip: proportional
              </button>
              <button
                className={`secondary-button ${mode === "equal" ? "ring-2 ring-[var(--accent)]" : ""}`}
                onClick={() => {
                  setMode("equal");
                  updateDraftTotals({ taxTipMode: "equal" });
                }}
                type="button"
              >
                Tax & tip: equal split
              </button>
            </div>
          </>
        }
        description={
          draft.linkedBillId
            ? "The bill is saved. Keep editing here, copy the summary, or open the canonical share page."
            : "Adjust tax, tip, and how they allocate across people. Saving stays on this summary so you can keep editing without losing context."
        }
        eyebrow={draft.linkedBillId ? "Saved summary" : "Step 5"}
        headerExtras={<LocalDraftDisclosure />}
        sidePanel={
          <aside className="panel p-6">
            <p className="eyebrow mb-3">
              {draft.linkedBillId ? "Saved bill" : "Save split"}
            </p>
            <p className="text-sm leading-6 text-[var(--muted)]">
              {draft.linkedBillId
                ? "This wizard stays linked to the confirmed bill. Save again to overwrite the same bill id."
                : "Saving creates a confirmed bill and keeps this draft open so you can still jump back and edit any step."}
            </p>

            <button
              className="primary-button mt-8 w-full justify-center"
              disabled={!summary.isFullyAssigned || createConfirmedBillMutation.isPending}
              onClick={() => void handleSave()}
              type="button"
            >
              {createConfirmedBillMutation.isPending
                ? "Saving..."
                : draft.linkedBillId
                  ? "Save changes"
                  : "Save bill"}
            </button>

            <button
              className="secondary-button mt-4 w-full justify-center"
              disabled={!draft.linkedBillId}
              onClick={() => void copySummary()}
              type="button"
            >
              {copied ? "Copied!" : "Copy summary"}
            </button>

            {draft.linkedBillId ? (
              <Link
                className="secondary-button mt-4 flex w-full justify-center no-underline"
                params={{ billId: draft.linkedBillId }}
                to="/bills/$billId/share"
              >
                Open share page
              </Link>
            ) : null}
          </aside>
        }
        title={
          draft.linkedBillId ? "Bill saved. Keep editing or share it." : "Review before you save."
        }
      />
    </div>
  );
}
