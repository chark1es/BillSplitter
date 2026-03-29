import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  assignmentMapsEqualForItems,
  buildBillSummary,
  buildCompactItemList,
  hydrateBillWithAssignments,
  type BillSummaryRow,
} from "../../lib/bill-calculations";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import type { AssignmentMap, BillDetail } from "../../lib/types";
import { BillWizardHero } from "./bill-wizard-hero";
import { BillWizardNavBar } from "./bill-wizard-nav";
import { LocalDraftDisclosure } from "./local-draft-disclosure";
import { ParticipantPaidBadge } from "./participant-paid-badge";
import { localDraftToBillDetail } from "../../lib/drafts/local-draft-to-bill-detail";
import { useBillWizardRoutePreload } from "./bill-wizard-routing";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";

export function AssignStep() {
  const navigate = useNavigate();
  const { draft, patchDraft, hydrated } = useActiveBillDraft();
  useBillWizardRoutePreload("/bills/new/assign");

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [splitDetailForParticipantId, setSplitDetailForParticipantId] = useState<
    string | null
  >(null);
  const [assignmentMap, setAssignmentMap] = useState<AssignmentMap>(
    {},
  );

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const bill = useMemo(
    () => (draft ? localDraftToBillDetail(draft) : null),
    [draft],
  );

  useEffect(() => {
    if (!draft) return;
    setAssignmentMap(draft.assignments);
  }, [draft]);

  useEffect(() => {
    if (!hydrated) return;
    if (!draft?.receipt.parsed || (draft.participants?.length ?? 0) < 2) {
      navigate({ to: "/bills/new/participants" });
    }
  }, [draft, hydrated, navigate]);

  const workingBill = useMemo(() => {
    if (!bill) return null;
    return hydrateBillWithAssignments(bill, assignmentMap);
  }, [assignmentMap, bill]);

  const summary = useMemo(() => {
    if (!workingBill) return null;
    return buildBillSummary(workingBill);
  }, [workingBill]);

  const participantById = useMemo(() => {
    if (!bill) return {};
    return Object.fromEntries(bill.participants.map((p) => [p.id, p]));
  }, [bill]);

  const itemIds = useMemo(() => bill?.items.map((item) => item.id) ?? [], [bill]);

  const serverAssignmentMap = draft?.assignments ?? {};

  const assignmentsDirty = useMemo(
    () => !assignmentMapsEqualForItems(itemIds, assignmentMap, serverAssignmentMap),
    [assignmentMap, itemIds, serverAssignmentMap],
  );
  const totalItems = bill?.items.length ?? 0;
  const assignedItemCount = useMemo(() => {
    if (!bill) return 0;
    return bill.items.filter((item) => (assignmentMap[item.id] ?? []).length > 0).length;
  }, [assignmentMap, bill]);

  useEffect(() => {
    if (!assignmentsDirty || !bill) {
      return;
    }
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      patchDraft((prev) => ({
        ...prev,
        assignments: assignmentMap,
      }));
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 2000);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [assignmentsDirty, assignmentMap, patchDraft, bill]);

  const saveNow = () => {
    patchDraft((prev) => ({
      ...prev,
      assignments: assignmentMap,
    }));
    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const goToReview = () => {
    patchDraft((prev) => ({
      ...prev,
      assignments: assignmentMap,
    }));
    navigate({
      to: "/bills/new/review",
      viewTransition: true,
    });
  };

  const toggleAssignment = (itemId: string, participantId: string) => {
    setAssignmentMap((currentValue) => {
      const currentParticipants = currentValue[itemId] ?? [];
      const nextParticipants = currentParticipants.includes(participantId)
        ? currentParticipants.filter((id) => id !== participantId)
        : [...currentParticipants, participantId];

      return {
        ...currentValue,
        [itemId]: nextParticipants,
      };
    });
  };

  const assignAllParticipants = (itemId: string) => {
    if (!bill) return;
    setAssignmentMap((currentValue) => ({
      ...currentValue,
      [itemId]: bill.participants.map((participant) => participant.id),
    }));
  };

  const clearAssignments = (itemId: string) => {
    setAssignmentMap((currentValue) => ({
      ...currentValue,
      [itemId]: [],
    }));
  };

  if (!bill || !summary || !workingBill) {
    return null;
  }

  const splitDetailRow = splitDetailForParticipantId
    ? summary.summaries.find((r) => r.participant.id === splitDetailForParticipantId)
    : null;

  return (
    <div className="space-y-5 px-1 sm:space-y-6 sm:px-0">
      <BillWizardNavBar
        currentPath="/bills/new/assign"
        onBack={() =>
          navigate({ to: "/bills/new/participants", viewTransition: true })
        }
        step={4}
        totalSteps={5}
      />
      <BillWizardHero
        description="Expand a line to toggle people. Collapsed rows show who’s on each item at a glance."
        eyebrow="Assign"
        step={4}
        title="Assign every item."
        trailing={<LocalDraftDisclosure />}
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-start lg:gap-6 xl:grid-cols-[1fr_19rem]">
        <article className="panel p-4 sm:p-5 md:p-6">
          <div className="mb-3 flex items-center justify-between rounded-xl border border-[var(--line)] bg-white/55 px-3 py-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                Itemized split
              </p>
              <p className="text-[0.7rem] text-[var(--muted)] sm:text-xs">
                {assignedItemCount}/{totalItems} items fully assigned
              </p>
            </div>
            <div className="w-20 overflow-hidden rounded-full bg-[var(--line)]">
              <div
                className="h-1.5 rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{
                  width: `${(assignedItemCount / Math.max(totalItems, 1)) * 100}%`,
                }}
              />
            </div>
          </div>
          <div className="mt-1 grid gap-2">
            {bill.items.map((item) => {
              const assignedIds = assignmentMap[item.id] ?? [];
              const isExpanded = expandedItemId === item.id;
              const hasAssignees = assignedIds.length > 0;
              const assignedPeople = assignedIds
                .map((id) => participantById[id])
                .filter(Boolean);
              const everyoneAssigned = assignedIds.length === bill.participants.length;

              return (
                <article
                  className={`rounded-2xl border px-2.5 py-2 transition-all duration-200 sm:px-3 sm:py-2.5 ${
                    hasAssignees
                      ? "border-emerald-500/30 bg-emerald-600/[0.07] shadow-[0_8px_24px_rgba(14,116,62,0.12)]"
                      : "border-rose-400/35 bg-rose-500/[0.07]"
                  }`}
                  key={item.id}
                >
                  <button
                    className="flex w-full items-start justify-between gap-3 text-left"
                    onClick={() =>
                      setExpandedItemId((currentValue) =>
                        currentValue === item.id ? null : item.id,
                      )
                    }
                    type="button"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="mb-0.5 inline-flex items-center rounded-full border border-[var(--line)] bg-white/70 px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:text-[0.62rem]">
                        {assignedIds.length}/{bill.participants.length} selected
                      </span>
                      <span className="block text-[0.72rem] font-semibold leading-snug text-[var(--ink)] sm:text-xs">
                        {item.name}
                      </span>
                      <span className="mt-0.5 block text-[0.66rem] tabular-nums text-[var(--muted)] sm:text-[0.72rem]">
                        ${item.price.toFixed(2)}
                      </span>
                    </span>
                    {!isExpanded ? (
                      <span className="max-w-[58%] shrink-0 text-right">
                        {assignedPeople.length > 0 ? (
                          <span className="line-clamp-2 text-[0.63rem] leading-snug text-[var(--muted)] sm:text-[0.7rem]">
                            {assignedPeople.map((p) => p.name).join(", ")}
                          </span>
                        ) : (
                          <span className="text-[0.65rem] text-rose-700/90 sm:text-xs">
                            Nobody — tap to assign
                          </span>
                        )}
                      </span>
                    ) : null}
                  </button>

                  {isExpanded ? (
                    <div className="mt-2 border-t border-[var(--line)] pt-2">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
                          Quick select
                        </p>
                        <div className="flex items-center gap-1.5">
                          <button
                            className={`mini-chip px-2 py-0.5 text-[0.62rem] sm:text-[0.68rem] ${everyoneAssigned ? "border-emerald-600/45 bg-emerald-600/15 text-emerald-700" : ""}`}
                            onClick={() => assignAllParticipants(item.id)}
                            type="button"
                          >
                            Everyone
                          </button>
                          <button
                            className={`mini-chip px-2 py-0.5 text-[0.62rem] sm:text-[0.68rem] ${assignedIds.length === 0 ? "border-rose-500/45 bg-rose-500/14 text-rose-700" : ""}`}
                            onClick={() => clearAssignments(item.id)}
                            type="button"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                      {bill.participants.map((participant) => {
                        const isAssigned = assignedIds.includes(participant.id);
                        return (
                          <button
                            className={`mini-chip py-1 text-[0.66rem] sm:text-[0.72rem] ${isAssigned ? "border-transparent shadow-[0_6px_14px_rgba(31,22,17,0.14)]" : ""}`}
                            key={participant.id}
                            onClick={() => toggleAssignment(item.id, participant.id)}
                            style={
                              isAssigned
                                ? {
                                    backgroundColor: `${participant.color}18`,
                                    borderColor: participant.color,
                                    color: participant.color,
                                  }
                                : undefined
                            }
                            type="button"
                          >
                            <span
                              className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[0.58rem] font-bold ${isAssigned ? "border-current bg-current/15" : "border-[var(--line)] bg-white/60 text-[var(--muted)]"}`}
                            >
                              {isAssigned ? "✓" : participant.initials}
                            </span>
                            <span>{participant.name}</span>
                          </button>
                        );
                      })}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </article>

        <aside className="panel space-y-3 p-4 sm:space-y-4 sm:p-5 lg:sticky lg:top-5 xl:p-6">
          <div>
            <div className="mb-2 flex items-end justify-between gap-3">
              <p className="eyebrow text-[0.62rem] leading-none">Live split</p>
              <span className="text-[0.65rem] font-semibold tabular-nums text-[var(--muted)]">
                ${summary.grandTotal.toFixed(2)}
                <span className="ml-1 font-normal opacity-80">total</span>
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-gradient-to-b from-white/80 to-[var(--surface-2)]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              {summary.summaries.map((row, idx) => {
                const { participant, total, items } = row;
                const { visibleNames, hiddenCount } = buildCompactItemList(items, 2);
                const itemLabel =
                  items.length === 0
                    ? "No items yet"
                    : hiddenCount > 0
                      ? `${visibleNames.join(", ")} · +${hiddenCount} more`
                      : visibleNames.join(", ");
                return (
                  <button
                    aria-label={`View full split for ${participant.name}`}
                    className={`flex w-full gap-2 px-2.5 py-1.5 text-left transition hover:bg-white/50 sm:gap-2.5 sm:px-3 sm:py-2 ${idx > 0 ? "border-t border-[var(--line)]/70" : ""}`}
                    key={participant.id}
                    onClick={() => setSplitDetailForParticipantId(participant.id)}
                    type="button"
                  >
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[0.55rem] font-extrabold leading-none text-white ring-1 ring-black/[0.06]"
                      style={{ backgroundColor: participant.color }}
                    >
                      {participant.initials}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-1">
                          <span className="truncate text-[0.8125rem] font-semibold leading-tight text-[var(--ink)]">
                            {participant.name}
                          </span>
                          <ParticipantPaidBadge isSelf={participant.isSelf} size="compact" />
                        </span>
                        <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums tracking-tight text-[var(--ink)]">
                          ${total.toFixed(2)}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-1 text-[0.65rem] leading-snug text-[var(--muted)]">
                        {itemLabel}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[0.7rem] leading-relaxed text-[var(--muted)]">
            {saveStatus === "saving"
              ? "Saving item picks…"
              : saveStatus === "saved"
                ? "Saved locally on this device."
                : saveStatus === "error"
                  ? "Could not save locally."
                  : assignmentsDirty
                    ? "Changes save automatically in a moment."
                    : "Assignments are auto-saved locally."}
          </p>
          <button
            className="secondary-button mt-4 w-full justify-center"
            disabled={!assignmentsDirty && saveStatus !== "error"}
            onClick={() => saveNow()}
            type="button"
          >
            Save draft now
          </button>
          <button
            className="primary-button mt-2 w-full justify-center py-2.5 text-sm"
            disabled={!summary.isFullyAssigned}
            onClick={() => void goToReview()}
            type="button"
          >
            {summary.isFullyAssigned
              ? "Next: review split"
              : "Assign every item to continue"}
          </button>
        </aside>
      </section>

      <Dialog
        onOpenChange={(open) => !open && setSplitDetailForParticipantId(null)}
        open={splitDetailForParticipantId != null}
      >
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-0 sm:rounded-2xl">
          {splitDetailRow ? (
            <SplitDetailModalBody
              bill={workingBill}
              onClose={() => setSplitDetailForParticipantId(null)}
              row={splitDetailRow}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function apportionTaxAndTip(
  taxTipShare: number,
  taxAmount: number,
  tipAmount: number,
) {
  const pool = taxAmount + tipAmount;
  if (pool <= 0) {
    return { taxShare: 0, tipShare: 0 };
  }
  return {
    taxShare: taxTipShare * (taxAmount / pool),
    tipShare: taxTipShare * (tipAmount / pool),
  };
}

function SplitDetailModalBody({
  row,
  bill,
  onClose,
}: {
  row: BillSummaryRow;
  bill: BillDetail;
  onClose: () => void;
}) {
  const { participant, items, itemSubtotal, taxTipShare, total } = row;
  const { taxShare, tipShare } = apportionTaxAndTip(
    taxTipShare,
    bill.taxAmount,
    bill.tipAmount,
  );

  const tipModeLabel =
    bill.taxTipMode === "equal"
      ? "Tax and tip are split evenly across everyone."
      : "Tax and tip are allocated in proportion to each person’s assigned items.";

  return (
    <>
      <DialogHeader className="border-b border-[var(--line)] px-5 pb-4 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-sm"
            style={{ backgroundColor: participant.color }}
          >
            {participant.initials}
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="display text-left text-xl text-[var(--ink)] sm:text-2xl">
              {participant.name}
            </DialogTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ParticipantPaidBadge isSelf={participant.isSelf} />
              <span className="text-xs text-[var(--muted)]">{tipModeLabel}</span>
            </div>
          </div>
          <p className="shrink-0 text-right">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Owes
            </span>
            <span className="display block text-2xl leading-none text-[var(--ink)]">
              ${total.toFixed(2)}
            </span>
          </p>
        </div>
      </DialogHeader>

      <div className="px-5 py-4 sm:px-6">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-4 py-6 text-center text-sm text-[var(--muted)]">
            No line items assigned to this person yet.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-white/60">
            {items.map(({ item, share }) => (
              <li
                className="flex items-center justify-between gap-3 px-3 py-2.5 first:rounded-t-xl last:rounded-b-xl"
                key={item.id}
              >
                <span className="min-w-0 truncate text-sm font-medium text-[var(--ink)]">
                  {item.name}
                </span>
                <span className="shrink-0 tabular-nums text-sm font-semibold text-[var(--ink)]">
                  ${share.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-4 space-y-2 border-t border-[var(--line)] pt-4 text-sm">
          <div className="flex justify-between gap-4 tabular-nums">
            <dt className="text-[var(--muted)]">Items subtotal</dt>
            <dd className="font-medium text-[var(--ink)]">${itemSubtotal.toFixed(2)}</dd>
          </div>
          {bill.taxAmount > 0 ? (
            <div className="flex justify-between gap-4 tabular-nums">
              <dt className="text-[var(--muted)]">Your share of tax</dt>
              <dd className="text-[var(--ink)]">${taxShare.toFixed(2)}</dd>
            </div>
          ) : null}
          {bill.tipAmount > 0 ? (
            <div className="flex justify-between gap-4 tabular-nums">
              <dt className="text-[var(--muted)]">Your share of tip</dt>
              <dd className="text-[var(--ink)]">${tipShare.toFixed(2)}</dd>
            </div>
          ) : null}
          {bill.taxAmount <= 0 && bill.tipAmount <= 0 && taxTipShare > 0 ? (
            <div className="flex justify-between gap-4 tabular-nums">
              <dt className="text-[var(--muted)]">Tax &amp; tip</dt>
              <dd className="text-[var(--ink)]">${taxTipShare.toFixed(2)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-t border-[var(--line)] pt-2 tabular-nums">
            <dt className="font-semibold text-[var(--ink)]">Total</dt>
            <dd className="font-bold text-[var(--ink)]">${total.toFixed(2)}</dd>
          </div>
        </dl>

        <button
          className="primary-button mt-5 w-full justify-center py-2.5 text-sm"
          onClick={onClose}
          type="button"
        >
          Done
        </button>
      </div>
    </>
  );
}
