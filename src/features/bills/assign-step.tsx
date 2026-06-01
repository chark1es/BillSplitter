import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  assignmentMapsEqualForItems,
  buildBillSummary,
  buildCompactItemList,
  hydrateBillWithAssignments,
  type BillSummaryRow,
} from "../../lib/bill-calculations";
import {
  getAssignedQuantity,
  getItemQuantity,
  mergeParticipantAssignment,
  normalizeAssignmentMap,
} from "../../lib/assignments/assignment-map";
import {
  getItemAssignmentCardStatus,
  itemAssignmentCardClassName,
} from "../../lib/assignments/item-assignment-status";
import {
  getEffectiveAssignedUnits,
  getMaxSharedSplitUnits,
  getParticipantEffectiveUnits,
} from "../../lib/assignments/shared-unit-splits";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import type { AssignmentMap, BillDetail } from "../../lib/types";
import { AssignQtyDialog } from "./assign-qty-dialog";
import { AssignSplitDialog } from "./assign-split-dialog";
import type { SharedUnitSplitsMap } from "../../lib/types";
import { ParticipantRoleBadges } from "./participant-role-badges";
import { BillWizardShell } from "./bill-wizard-shell";
import { LocalDraftDisclosure } from "./local-draft-disclosure";
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
  const [assignmentMap, setAssignmentMap] = useState<AssignmentMap>({});
  const [sharedUnitSplits, setSharedUnitSplits] = useState<SharedUnitSplitsMap>({});
  const [qtyDialog, setQtyDialog] = useState<{
    itemId: string;
    participantId: string;
    itemName: string;
    participantName: string;
    maxQuantity: number;
    initialQuantity: number;
    itemQuantity: number;
    allowRemove?: boolean;
  } | null>(null);
  const [splitDialog, setSplitDialog] = useState<{
    itemId: string;
    itemName: string;
    itemQuantity: number;
    initialSelectedIds: string[];
    initialSplitQuantity: number;
  } | null>(null);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  const bill = useMemo(
    () => (draft ? localDraftToBillDetail(draft) : null),
    [draft],
  );

  useEffect(() => {
    if (!draft) return;
    setAssignmentMap(normalizeAssignmentMap(draft.assignments));
    setSharedUnitSplits(draft.sharedUnitSplits ?? {});
  }, [draft]);

  useEffect(() => {
    if (!hydrated) return;
    if (!draft?.receipt.parsed || (draft.participants?.length ?? 0) < 2) {
      navigate({ to: "/bills/new/participants" });
    }
  }, [draft, hydrated, navigate]);

  const workingBill = useMemo(() => {
    if (!bill) return null;
    return hydrateBillWithAssignments(bill, assignmentMap, sharedUnitSplits);
  }, [assignmentMap, bill, sharedUnitSplits]);

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

  const serverSharedSplits = draft?.sharedUnitSplits ?? {};

  const assignmentsDirty = useMemo(() => {
    const assignmentsChanged = !assignmentMapsEqualForItems(
      itemIds,
      assignmentMap,
      serverAssignmentMap,
    );
    const splitsChanged =
      JSON.stringify(sharedUnitSplits) !== JSON.stringify(serverSharedSplits);
    return assignmentsChanged || splitsChanged;
  }, [
    assignmentMap,
    itemIds,
    serverAssignmentMap,
    serverSharedSplits,
    sharedUnitSplits,
  ]);
  const totalItems = bill?.items.length ?? 0;
  const normalizedMap = useMemo(
    () => normalizeAssignmentMap(assignmentMap),
    [assignmentMap],
  );
  const assignedItemCount = useMemo(() => {
    if (!bill) return 0;
    return bill.items.filter((item) => {
      const itemId = item.id as string;
      const itemQty = getItemQuantity(item);
      const assigned = getEffectiveAssignedUnits(
        normalizedMap,
        itemId,
        sharedUnitSplits[itemId],
      );
      return assigned === itemQty || (itemQty === 1 && assigned > 1);
    }).length;
  }, [bill, normalizedMap, sharedUnitSplits]);

  useEffect(() => {
    if (!assignmentsDirty || !bill) {
      return;
    }
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      patchDraft((prev) => ({
        ...prev,
        assignments: assignmentMap,
        sharedUnitSplits,
      }));
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 2000);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [assignmentsDirty, assignmentMap, sharedUnitSplits, patchDraft, bill]);

  const saveNow = () => {
    patchDraft((prev) => ({
      ...prev,
      assignments: assignmentMap,
      sharedUnitSplits,
    }));
    setSaveStatus("saved");
    window.setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const goToReview = () => {
    patchDraft((prev) => ({
      ...prev,
      assignments: assignmentMap,
      sharedUnitSplits,
    }));
    navigate({
      to: "/bills/new/review",
      viewTransition: true,
    });
  };

  const formatUnits = (value: number) =>
    Number.isInteger(value) ? String(value) : value.toFixed(1);

  const setParticipantQuantity = (
    itemId: string,
    participantId: string,
    quantity: number,
  ) => {
    setAssignmentMap((currentValue) => {
      const normalized = normalizeAssignmentMap(currentValue);
      return {
        ...currentValue,
        [itemId]: mergeParticipantAssignment(
          normalized[itemId] ?? [],
          participantId,
          quantity,
        ),
      };
    });
  };

  const handleParticipantTap = (
    item: BillDetail["items"][number],
    participantId: string,
    participantName: string,
  ) => {
    const itemId = item.id as string;
    const itemQty = getItemQuantity(item);
    const normalized = normalizeAssignmentMap(assignmentMap);
    const existing = (normalized[itemId] ?? []).find(
      (entry) => entry.participantId === participantId,
    );
    const split = sharedUnitSplits[itemId];
    const credited = existing?.quantity ?? 0;
    const remaining =
      itemQty -
      getAssignedQuantity(normalized, itemId) -
      (split?.units ?? 0) +
      credited;

    if (remaining <= 0 && !existing && itemQty > 1) {
      return;
    }

    const maxQuantity =
      itemQty === 1 ? 1 : Math.max(remaining, 1);

    setQtyDialog({
      itemId,
      participantId,
      itemName: item.name,
      participantName,
      maxQuantity,
      initialQuantity: existing?.quantity ?? (itemQty === 1 ? 1 : 1),
      itemQuantity: itemQty,
      allowRemove: Boolean(existing),
    });
  };

  const openSplitDialog = (itemId: string, itemName: string, itemQuantity: number) => {
    const normalized = normalizeAssignmentMap(assignmentMap);
    const split = sharedUnitSplits[itemId];
    const initialSelectedIds = split?.participantIds ?? [];
    const initialSplitQuantity = split
      ? split.units
      : getMaxSharedSplitUnits(normalized, itemId, itemQuantity, split);

    setSplitDialog({
      itemId,
      itemName,
      itemQuantity,
      initialSelectedIds,
      initialSplitQuantity,
    });
  };

  const applySplit = (
    itemId: string,
    splitQuantity: number,
    participantIds: string[],
  ) => {
    if (participantIds.length === 0 || splitQuantity <= 0) {
      return;
    }
    const itemQty = getItemQuantity(
      bill!.items.find((row) => (row.id as string) === itemId)!,
    );
    const normalized = normalizeAssignmentMap(assignmentMap);
    const prior = sharedUnitSplits[itemId];
    const nextTotal =
      getAssignedQuantity(normalized, itemId) -
      (prior?.units ?? 0) +
      splitQuantity;
    if (nextTotal > itemQty) {
      return;
    }

    setSharedUnitSplits((current) => ({
      ...current,
      [itemId]: { units: splitQuantity, participantIds },
    }));
  };

  const clearSharedSplit = (itemId: string) => {
    setSharedUnitSplits((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
  };

  const clearAssignments = (itemId: string) => {
    setSharedUnitSplits((current) => {
      const next = { ...current };
      delete next[itemId];
      return next;
    });
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
    <div className="space-y-4">
      <BillWizardShell
        currentPath="/bills/new/assign"
        description="Tap each item to assign people. Progress shows when you're done."
        onBack={() =>
          navigate({ to: "/bills/new/participants", viewTransition: true })
        }
        step={4}
        title="Assign items"
        trailing={<LocalDraftDisclosure />}
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_16rem] lg:items-start">
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
              const itemId = item.id as string;
              const itemQty = getItemQuantity(item);
              const entries = normalizedMap[itemId] ?? [];
              const lineSplit = sharedUnitSplits[itemId];
              const assignedQty = getEffectiveAssignedUnits(
                normalizedMap,
                itemId,
                lineSplit,
              );
              const assignmentStatus = getItemAssignmentCardStatus(
                normalizedMap,
                itemId,
                itemQty,
                lineSplit,
              );
              const isExpanded = expandedItemId === item.id;
              const assignedPeople = [
                ...entries.map((entry) => ({
                  participant: participantById[entry.participantId],
                  quantity: getParticipantEffectiveUnits(
                    normalizedMap,
                    itemId,
                    entry.participantId,
                    lineSplit,
                  ),
                })),
                ...(lineSplit?.participantIds ?? [])
                  .filter(
                    (participantId) =>
                      !entries.some((entry) => entry.participantId === participantId),
                  )
                  .map((participantId) => ({
                    participant: participantById[participantId],
                    quantity: getParticipantEffectiveUnits(
                      normalizedMap,
                      itemId,
                      participantId,
                      lineSplit,
                    ),
                  })),
              ].filter((row) => row.participant && row.quantity > 0);
              return (
                <article
                  className={`rounded-2xl border px-2.5 py-2 transition-all duration-200 sm:px-3 sm:py-2.5 ${itemAssignmentCardClassName(assignmentStatus)}`}
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
                      <span className="mb-0.5 inline-flex items-center gap-1.5">
                        <span className="inline-flex rounded-full border border-[var(--line)] bg-white/70 px-1.5 py-0.5 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-[var(--muted)] sm:text-[0.62rem]">
                          {assignedQty}/{itemQty} assigned
                        </span>
                        {itemQty > 1 ? (
                          <span className="inline-flex rounded-full bg-[var(--accent-soft)] px-1.5 py-0.5 text-[0.58rem] font-bold text-[var(--accent-strong)]">
                            ×{itemQty}
                          </span>
                        ) : null}
                      </span>
                      <span className="block text-[0.72rem] font-semibold leading-snug text-[var(--ink)] sm:text-xs">
                        {item.name}
                      </span>
                      <span className="mt-0.5 block text-[0.66rem] tabular-nums text-[var(--muted)] sm:text-[0.72rem]">
                        ${item.price.toFixed(2)}
                        {itemQty > 1 ? ` each · $${(item.price * itemQty).toFixed(2)} line` : ""}
                      </span>
                    </span>
                    {!isExpanded ? (
                      <span className="max-w-[58%] shrink-0 text-right">
                        {assignedPeople.length > 0 ? (
                          <span className="line-clamp-2 text-[0.63rem] leading-snug text-[var(--muted)] sm:text-[0.7rem]">
                            {assignedPeople
                              .map(
                                ({ participant, quantity }) =>
                                  `${participant!.name} (${formatUnits(quantity)})`,
                              )
                              .join(", ")}
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
                            className="mini-chip px-2 py-0.5 text-[0.62rem] sm:text-[0.68rem]"
                            onClick={() =>
                              openSplitDialog(itemId, item.name, itemQty)
                            }
                            type="button"
                          >
                            Split…
                          </button>
                          {lineSplit ? (
                            <button
                              className="mini-chip px-2 py-0.5 text-[0.62rem] sm:text-[0.68rem]"
                              onClick={() => clearSharedSplit(itemId)}
                              type="button"
                            >
                              Clear split
                            </button>
                          ) : null}
                          <button
                            className={`mini-chip px-2 py-0.5 text-[0.62rem] sm:text-[0.68rem] ${assignedQty === 0 ? "border-rose-500/45 bg-rose-500/14 text-rose-700" : ""}`}
                            onClick={() => clearAssignments(item.id)}
                            type="button"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                      {bill.participants.map((participant) => {
                        const participantId = participant.id as string;
                        const effectiveQty = getParticipantEffectiveUnits(
                          normalizedMap,
                          itemId,
                          participantId,
                          lineSplit,
                        );
                        const isAssigned = effectiveQty > 0;
                        return (
                          <button
                            className={`mini-chip py-1 text-[0.66rem] sm:text-[0.72rem] ${isAssigned ? "border-transparent shadow-[0_6px_14px_rgba(31,22,17,0.14)]" : ""}`}
                            key={participant.id}
                            onClick={() =>
                              handleParticipantTap(
                                item,
                                participantId,
                                participant.name,
                              )
                            }
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
                              className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full border px-0.5 text-[0.58rem] font-bold ${isAssigned ? "border-current bg-current/15" : "border-[var(--line)] bg-white/60 text-[var(--muted)]"}`}
                            >
                              {isAssigned
                                ? formatUnits(effectiveQty)
                                : participant.initials}
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
              <p className="section-label leading-none">Progress</p>
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
                          <ParticipantRoleBadges participant={participant} size="compact" />
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
              : "Assign all item quantities to continue"}
          </button>
        </aside>
      </section>

      <AssignSplitDialog
        currentEntries={
          splitDialog
            ? (normalizedMap[splitDialog.itemId] ?? [])
            : []
        }
        existingSplit={
          splitDialog ? sharedUnitSplits[splitDialog.itemId] : null
        }
        initialSelectedIds={splitDialog?.initialSelectedIds ?? []}
        initialSplitQuantity={splitDialog?.initialSplitQuantity ?? 0}
        itemName={splitDialog?.itemName ?? ""}
        itemQuantity={splitDialog?.itemQuantity ?? 1}
        onClose={() => setSplitDialog(null)}
        onConfirm={(splitQuantity, participantIds) => {
          if (!splitDialog) return;
          applySplit(splitDialog.itemId, splitQuantity, participantIds);
        }}
        unitPrice={
          splitDialog
            ? (bill.items.find((row) => row.id === splitDialog.itemId)?.price ?? 0)
            : 0
        }
        open={splitDialog != null}
        participants={bill.participants}
      />

      <AssignQtyDialog
        allowRemove={qtyDialog?.allowRemove}
        initialQuantity={qtyDialog?.initialQuantity ?? 1}
        itemName={qtyDialog?.itemName ?? ""}
        itemQuantity={qtyDialog?.itemQuantity}
        maxQuantity={qtyDialog?.maxQuantity ?? 1}
        onClose={() => setQtyDialog(null)}
        onConfirm={(quantity) => {
          if (!qtyDialog) return;
          setParticipantQuantity(qtyDialog.itemId, qtyDialog.participantId, quantity);
        }}
        open={qtyDialog != null}
        participantName={qtyDialog?.participantName ?? ""}
      />

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
  const { participant, items, itemSubtotal, taxTipShare, total, birthdayCoverIn, birthdayCoverOut } =
    row;
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
            <DialogTitle className="page-title text-left text-lg">
              {participant.name}
            </DialogTitle>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ParticipantRoleBadges participant={participant} />
              <span className="text-xs text-[var(--muted)]">{tipModeLabel}</span>
            </div>
          </div>
          <p className="shrink-0 text-right">
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Owes
            </span>
            <span className="block text-xl font-bold tabular-nums leading-none text-[var(--ink)]">
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
            {items.map(({ item, share, quantity }) => (
              <li
                className="flex items-center justify-between gap-3 px-3 py-2.5 first:rounded-t-xl last:rounded-b-xl"
                key={item.id}
              >
                <span className="min-w-0 truncate text-sm font-medium text-[var(--ink)]">
                  {item.name}
                  {quantity > 1 ? ` ×${quantity}` : ""}
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
          {birthdayCoverIn != null && birthdayCoverIn > 0 ? (
            <div className="flex justify-between gap-4 tabular-nums">
              <dt className="text-[var(--muted)]">Covering birthday</dt>
              <dd className="text-[var(--ink)]">+${birthdayCoverIn.toFixed(2)}</dd>
            </div>
          ) : null}
          {birthdayCoverOut != null && birthdayCoverOut > 0 ? (
            <div className="flex justify-between gap-4 tabular-nums">
              <dt className="text-[var(--muted)]">Birthday (covered)</dt>
              <dd className="text-[var(--ink)]">$0.00</dd>
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
