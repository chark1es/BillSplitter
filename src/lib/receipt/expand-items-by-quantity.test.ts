import { describe, expect, it } from "vitest";
import {
  coerceItemQuantity,
  expandLogicalLinesToParsedItems,
  splitLineTotalAcrossUnits,
} from "./expand-items-by-quantity";

const mockFx = {
  baseCurrency: "USD" as const,
  currencyCode: "USD",
  date: "2026-01-01",
  foreignUnitsPerUsd: 1,
};

describe("coerceItemQuantity", () => {
  it("defaults missing or invalid to 1", () => {
    expect(coerceItemQuantity(undefined)).toBe(1);
    expect(coerceItemQuantity(null)).toBe(1);
    expect(coerceItemQuantity(NaN)).toBe(1);
    expect(coerceItemQuantity(0)).toBe(1);
    expect(coerceItemQuantity(-2)).toBe(1);
  });

  it("floors positive numbers and caps huge values", () => {
    expect(coerceItemQuantity(2.7)).toBe(2);
    expect(coerceItemQuantity(501)).toBe(500);
  });
});

describe("splitLineTotalAcrossUnits", () => {
  it("passes through a single unit", () => {
    expect(splitLineTotalAcrossUnits(10, 1)).toEqual([10]);
  });

  it("splits $10.00 across 3 units with exact sum", () => {
    const parts = splitLineTotalAcrossUnits(10, 3);
    expect(parts).toHaveLength(3);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(10, 10);
    expect(parts.sort((a, b) => b - a)).toEqual([3.34, 3.33, 3.33]);
  });

  it("handles odd cents", () => {
    const parts = splitLineTotalAcrossUnits(10.01, 2);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(10.01, 10);
    expect(parts).toEqual([5.01, 5.0]);
  });
});

describe("expandLogicalLinesToParsedItems", () => {
  it("duplicates rows for quantity > 1 with matching USD for USD receipt", () => {
    const items = expandLogicalLinesToParsedItems(
      [
        {
          foreignName: "Coffee",
          translatedName: "Coffee",
          foreignLineTotal: 6,
          quantity: 2,
        },
      ],
      mockFx,
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual(items[1]);
    expect(items[0]?.foreignPrice).toBe(3);
    expect(items[0]?.usdPrice).toBe(3);
  });

  it("keeps one row per line when quantity is 1", () => {
    const items = expandLogicalLinesToParsedItems(
      [
        {
          foreignName: "Tea",
          translatedName: "Tea",
          foreignLineTotal: 4.5,
          quantity: 1,
        },
      ],
      mockFx,
    );
    expect(items).toHaveLength(1);
    expect(items[0]?.foreignPrice).toBe(4.5);
  });
});
