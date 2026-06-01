import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Button } from "#/components/ui/button";

type AssignQtyDialogProps = {
  open: boolean;
  itemName: string;
  participantName: string;
  maxQuantity: number;
  initialQuantity: number;
  /** When true, confirm with 0 removes this person's assignment. */
  allowRemove?: boolean;
  itemQuantity?: number;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
};

export function AssignQtyDialog({
  open,
  itemName,
  participantName,
  maxQuantity,
  initialQuantity,
  allowRemove = false,
  itemQuantity = 1,
  onClose,
  onConfirm,
}: AssignQtyDialogProps) {
  const [quantity, setQuantity] = useState(initialQuantity);

  useEffect(() => {
    if (open) {
      const min = allowRemove && initialQuantity > 0 ? 0 : 1;
      setQuantity(Math.min(Math.max(min, initialQuantity), maxQuantity));
    }
  }, [allowRemove, open, initialQuantity, maxQuantity]);

  return (
    <Dialog onOpenChange={(next) => !next && onClose()} open={open}>
      <DialogContent className="max-w-sm rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] p-5">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[var(--ink)]">
            How many for {participantName}?
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--muted)]">
            {itemName}
            {itemQuantity === 1
              ? " · tap multiple people to split this item evenly"
              : ` · up to ${maxQuantity} available`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-center gap-4 py-2">
          <Button
            className="size-10 rounded-full"
            disabled={quantity <= (allowRemove ? 0 : 1)}
            onClick={() =>
              setQuantity((q) => Math.max(allowRemove ? 0 : 1, q - 1))
            }
            type="button"
            variant="outline"
          >
            −
          </Button>
          <span className="min-w-[2ch] text-center text-2xl font-bold tabular-nums text-[var(--ink)]">
            {quantity}
          </span>
          <Button
            className="size-10 rounded-full"
            disabled={quantity >= maxQuantity}
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            type="button"
            variant="outline"
          >
            +
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} type="button" variant="outline">
            Cancel
          </Button>
          <Button
            className="border-0 bg-[var(--accent-strong)] text-white"
            onClick={() => {
              onConfirm(quantity);
              onClose();
            }}
            type="button"
          >
            {quantity === 0 ? "Remove" : "Assign"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
