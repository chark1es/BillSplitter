import type { FxSnapshot, ParsedReceiptItem } from "../types";
import { convertForeignToUsd } from "../fx/usd-fx";

const MAX_QUANTITY = 500;

/**
 * Coerce model output to a valid line quantity (integer >= 1).
 */
export const coerceItemQuantity = (raw: unknown): number => {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.floor(n), MAX_QUANTITY);
};

/**
 * Split a line-total foreign amount into `quantity` per-unit parts that sum
 * exactly to the original total (integer cent split).
 */
export const splitLineTotalAcrossUnits = (
  lineTotalForeign: number,
  quantity: number,
): number[] => {
  const n = Math.max(1, Math.floor(quantity));
  const totalCents = Math.round(lineTotalForeign * 100);
  const baseCents = Math.floor(totalCents / n);
  const remainderCents = totalCents - baseCents * n;
  const parts: number[] = [];
  for (let i = 0; i < n; i++) {
    const cents = baseCents + (i < remainderCents ? 1 : 0);
    parts.push(Number((cents / 100).toFixed(2)));
  }
  return parts;
};

type LogicalLine = {
  foreignName: string;
  translatedName: string;
  /** Full line total in receipt currency for this printed line. */
  foreignLineTotal: number;
  quantity: number;
};

/**
 * Expand logical receipt lines into one ParsedReceiptItem per unit (for assignment UX).
 */
export const expandLogicalLinesToParsedItems = (
  lines: LogicalLine[],
  fxSnapshot: FxSnapshot,
): ParsedReceiptItem[] => {
  const out: ParsedReceiptItem[] = [];
  for (const line of lines) {
    const qty = coerceItemQuantity(line.quantity);
    const unitForeigns = splitLineTotalAcrossUnits(line.foreignLineTotal, qty);
    for (const foreignPrice of unitForeigns) {
      out.push({
        foreignName: line.foreignName,
        translatedName: line.translatedName,
        foreignPrice,
        usdPrice: convertForeignToUsd(foreignPrice, fxSnapshot),
      });
    }
  }
  return out;
};
