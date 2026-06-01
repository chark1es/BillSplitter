import type { FxSnapshot, ParsedReceiptItem } from "../types";
import { convertForeignToUsd } from "../fx/usd-fx";
import {
  coerceItemQuantity,
  splitLineTotalAcrossUnits,
} from "./expand-items-by-quantity";

type LogicalLine = {
  foreignName: string;
  translatedName: string;
  foreignLineTotal: number;
  quantity: number;
};

/**
 * One receipt line per logical item, with optional quantity > 1 (unit prices).
 */
export const logicalLinesToGroupedItems = (
  lines: LogicalLine[],
  fxSnapshot: FxSnapshot,
): ParsedReceiptItem[] =>
  lines.map((line) => {
    const quantity = coerceItemQuantity(line.quantity);
    const unitForeign = splitLineTotalAcrossUnits(line.foreignLineTotal, quantity)[0]!;
    return {
      foreignName: line.foreignName,
      translatedName: line.translatedName,
      foreignPrice: unitForeign,
      usdPrice: convertForeignToUsd(unitForeign, fxSnapshot),
      quantity,
    };
  });
