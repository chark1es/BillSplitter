import { useEffect, useMemo, useState } from "react";
import type { ItemAssignment } from "../../lib/assignments/assignment-map";
import { getAssignedQuantity } from "../../lib/assignments/assignment-map";
import {
  getParticipantEffectiveUnits,
  shareUnitsPerParticipant,
  type SharedUnitSplit,
} from "../../lib/assignments/shared-unit-splits";
import type { BillParticipant } from "../../lib/types";
import { Button } from "#/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { cn } from "#/lib/utils";

type AssignSplitDialogProps = {
  open: boolean;
  itemName: string;
  itemQuantity: number;
  unitPrice: number;
  currentEntries: ItemAssignment[];
  existingSplit?: SharedUnitSplit | null;
  participants: BillParticipant[];
  initialSelectedIds: string[];
  initialSplitQuantity: number;
  onClose: () => void;
  onConfirm: (splitQuantity: number, participantIds: string[]) => void;
};

const formatUnits = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

export function AssignSplitDialog({
  open,
  itemName,
  itemQuantity,
  unitPrice,
  currentEntries,
  existingSplit,
  participants,
  initialSelectedIds,
  initialSplitQuantity,
  onClose,
  onConfirm,
}: AssignSplitDialogProps) {
  const [splitQuantity, setSplitQuantity] = useState(initialSplitQuantity);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);

  const maxUnits = useMemo(() => {
    const exclusive = getAssignedQuantity({ x: currentEntries }, "x");
    return Math.max(
      0,
      itemQuantity - exclusive + (existingSplit?.units ?? 0),
    );
  }, [currentEntries, existingSplit, itemQuantity]);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(initialSelectedIds);
    setSplitQuantity(
      Math.min(Math.max(0, initialSplitQuantity), Math.max(0, maxUnits)),
    );
  }, [open, initialSplitQuantity, initialSelectedIds, maxUnits]);

  useEffect(() => {
    if (!open) return;
    setSplitQuantity((current) => Math.min(current, maxUnits));
  }, [maxUnits, open]);

  const previewSplit: SharedUnitSplit | null =
    selectedIds.length > 0 && splitQuantity > 0
      ? { units: splitQuantity, participantIds: selectedIds }
      : null;

  const preview = useMemo(() => {
    if (!previewSplit) {
      return [];
    }
    const entriesMap = { x: currentEntries };
    return selectedIds.map((participantId) => {
      const exclusive =
        currentEntries.find((entry) => entry.participantId === participantId)
          ?.quantity ?? 0;
      const effective = getParticipantEffectiveUnits(
        entriesMap,
        "x",
        participantId,
        previewSplit,
      );
      return {
        participantId,
        exclusive,
        effective,
        added: shareUnitsPerParticipant(previewSplit),
        dollars: effective * unitPrice,
      };
    });
  }, [currentEntries, previewSplit, selectedIds, unitPrice]);

  const toggleParticipant = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((participantId) => participantId !== id)
        : [...current, id],
    );
  };

  const canApply =
    selectedIds.length > 0 && splitQuantity > 0 && splitQuantity <= maxUnits;

  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-5">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[var(--ink)]">
            Split units on {itemName}
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--muted)]">
            Adds a shared pool on top of existing assignments. Line has {itemQuantity}{" "}
            total · up to {maxUnits} unassigned available to split.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <span className="text-xs font-semibold text-[var(--muted)]">
            Units to share (additional)
          </span>
          <div className="flex items-center justify-center gap-4">
            <Button
              className="size-10 rounded-full"
              disabled={splitQuantity <= 0}
              onClick={() => setSplitQuantity((q) => Math.max(0, q - 1))}
              type="button"
              variant="outline"
            >
              −
            </Button>
            <span className="min-w-[2ch] text-center text-2xl font-bold tabular-nums text-[var(--ink)]">
              {splitQuantity}
            </span>
            <Button
              className="size-10 rounded-full"
              disabled={splitQuantity >= maxUnits}
              onClick={() => setSplitQuantity((q) => Math.min(maxUnits, q + 1))}
              type="button"
              variant="outline"
            >
              +
            </Button>
          </div>
        </div>

        <div className="grid gap-2">
          <span className="text-xs font-semibold text-[var(--muted)]">Share between</span>
          <div className="flex flex-wrap gap-1.5">
            {participants.map((participant) => {
              const id = participant.id as string;
              const selected = selectedIds.includes(id);
              return (
                <button
                  className={cn(
                    "mini-chip py-1 text-xs transition",
                    selected && "border-transparent shadow-sm",
                  )}
                  key={id}
                  onClick={() => toggleParticipant(id)}
                  style={
                    selected
                      ? {
                          backgroundColor: `${participant.color}18`,
                          borderColor: participant.color,
                          color: participant.color,
                        }
                      : undefined
                  }
                  type="button"
                >
                  {participant.name}
                </button>
              );
            })}
          </div>
        </div>

        {canApply ? (
          <ul className="rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--muted)]">
            {preview.map((entry) => {
              const person = participants.find((p) => p.id === entry.participantId);
              return (
                <li className="flex justify-between gap-2 py-0.5" key={entry.participantId}>
                  <span className="font-medium text-[var(--ink)]">{person?.name}</span>
                  <span className="text-right tabular-nums">
                    {formatUnits(entry.exclusive)}
                    {entry.added > 0 ? ` + ${formatUnits(entry.added)}` : ""} ={" "}
                    <span className="font-semibold text-[var(--ink)]">
                      {formatUnits(entry.effective)}
                    </span>
                    <span className="ml-1 text-[var(--muted)]">
                      · ${entry.dollars.toFixed(2)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-amber-800">
            Pick who shares the pool and how many extra units to split.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            className="border-0 bg-[var(--accent-strong)] text-white"
            disabled={!canApply}
            onClick={() => {
              onConfirm(splitQuantity, selectedIds);
              onClose();
            }}
            type="button"
          >
            Apply split
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
