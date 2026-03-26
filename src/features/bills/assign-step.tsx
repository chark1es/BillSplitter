import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  assignmentMapsEqualForItems,
  buildBillSummary,
  hydrateBillWithAssignments,
} from "../../lib/bill-calculations";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import type { AssignmentMap, BillDetail } from "../../lib/types";
import { BillWizardNavBar } from "./bill-wizard-nav";
import { LocalDraftDisclosure } from "./local-draft-disclosure";
import { localDraftToBillDetail } from "../../lib/drafts/local-draft-to-bill-detail";

export function AssignStep() {
  const navigate = useNavigate();
  const { draft, patchDraft, hydrated } = useActiveBillDraft();

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

  if (!bill || !summary) {
    return null;
  }

  return (
    <div className="space-y-6">
      <BillWizardNavBar
        onBack={() => navigate({ to: "/bills/new/participants" })}
        step={3}
      />
      <section className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow mb-3">Step 3</p>
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

      <section className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <article className="panel p-6 sm:p-8">
          <div className="mt-2 grid gap-2">
            {bill.items.map((item) => {
              const assignedIds = assignmentMap[item.id] ?? [];
              const isExpanded = expandedItemId === item.id;
              const hasAssignees = assignedIds.length > 0;
              const assignedPeople = assignedIds
                .map((id) => participantById[id])
                .filter(Boolean);

              return (
                <article
                  className={`rounded-[1.7rem] border px-3 py-2.5 transition-colors sm:px-3.5 sm:py-3 ${
                    hasAssignees
                      ? "border-emerald-500/25 bg-emerald-600/[0.06]"
                      : "border-rose-400/30 bg-rose-500/[0.06]"
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
                      <span className="block text-xs font-semibold leading-snug text-[var(--ink)] sm:text-sm">
                        {item.name}
                      </span>
                      <span className="mt-0.5 block text-[0.7rem] tabular-nums text-[var(--muted)] sm:text-xs">
                        ${item.price.toFixed(2)}
                      </span>
                    </span>
                    {!isExpanded ? (
                      <span className="max-w-[58%] shrink-0 text-right">
                        {assignedPeople.length > 0 ? (
                          <span className="line-clamp-2 text-[0.65rem] leading-snug text-[var(--muted)] sm:text-xs">
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
                    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[var(--line)] pt-2.5">
                      {bill.participants.map((participant) => {
                        const isAssigned = assignedIds.includes(participant.id);
                        return (
                          <button
                            className={`mini-chip py-1.5 text-[0.7rem] sm:text-xs ${isAssigned ? "ring-2 ring-[var(--accent)]" : ""}`}
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
                            {participant.initials} {participant.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </article>

        <aside className="panel p-6">
          <p className="eyebrow mb-3">Live split</p>
          <div className="space-y-3">
            {summary.summaries.map(({ participant, total }) => (
              <div className="receipt-row" key={participant.id}>
                <span className="flex items-center gap-3">
                  <span
                    className="avatar-badge h-10 w-10 text-xs"
                    style={{ backgroundColor: participant.color }}
                  >
                    {participant.initials}
                  </span>
                  <span className="font-semibold text-[var(--ink)]">{participant.name}</span>
                </span>
                <span className="font-semibold text-[var(--ink)]">
                  ${total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <p className="mt-4 text-xs text-[var(--muted)]">
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
            className="primary-button mt-4 w-full justify-center"
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
