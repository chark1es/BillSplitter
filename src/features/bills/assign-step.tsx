import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  assignmentMapsEqualForItems,
  buildBillSummary,
  buildCompactItemList,
  hydrateBillWithAssignments,
} from "../../lib/bill-calculations";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import type { AssignmentMap } from "../../lib/types";
import { BillWizardNavBar } from "./bill-wizard-nav";
import { LocalDraftDisclosure } from "./local-draft-disclosure";
import { ParticipantPaidBadge } from "./participant-paid-badge";
import { localDraftToBillDetail } from "../../lib/drafts/local-draft-to-bill-detail";
import { useBillWizardRoutePreload } from "./bill-wizard-routing";

export function AssignStep() {
  const navigate = useNavigate();
  const { draft, patchDraft, hydrated } = useActiveBillDraft();
  useBillWizardRoutePreload("/bills/new/assign");

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
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

  if (!bill || !summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <BillWizardNavBar
        currentPath="/bills/new/assign"
        onBack={() =>
          navigate({ to: "/bills/new/participants", viewTransition: true })
        }
        step={4}
        totalSteps={5}
      />
      <section className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow mb-3">Step 4</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-6xl">
          Assign every item.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Tap an item to choose who shared it. When collapsed, you’ll see who’s
          on each line.
        </p>
        <div className="mt-4">
          <LocalDraftDisclosure />
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_18rem]">
        <article className="panel p-4 sm:p-5">
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

        <aside className="panel space-y-4 p-4 sm:p-5 xl:sticky xl:top-6">
          <div>
            <div className="mb-2 flex items-end justify-between gap-3">
              <p className="eyebrow text-[0.62rem] leading-none">Live split</p>
              <span className="text-[0.65rem] font-semibold tabular-nums text-[var(--muted)]">
                ${summary.grandTotal.toFixed(2)}
                <span className="ml-1 font-normal opacity-80">total</span>
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-gradient-to-b from-white/80 to-[var(--surface-2)]/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
              {summary.summaries.map(({ participant, total, items }, idx) => {
                const { visibleNames, hiddenCount } = buildCompactItemList(items, 2);
                const itemLabel =
                  items.length === 0
                    ? "No items yet"
                    : hiddenCount > 0
                      ? `${visibleNames.join(", ")} · +${hiddenCount} more`
                      : visibleNames.join(", ");
                return (
                  <div
                    className={`flex gap-2 px-2.5 py-1.5 sm:gap-2.5 sm:px-3 sm:py-2 ${idx > 0 ? "border-t border-[var(--line)]/70" : ""}`}
                    key={participant.id}
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
                  </div>
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
    </div>
  );
}
