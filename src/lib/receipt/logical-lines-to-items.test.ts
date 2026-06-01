import { describe, expect, it } from "vitest";
import { logicalLinesToGroupedItems } from "./logical-lines-to-items";

const fx = {
  baseCurrency: "USD" as const,
  currencyCode: "USD",
  date: "2026-06-01",
  foreignUnitsPerUsd: 1,
  rateSource: "parity" as const,
};

describe("logicalLinesToGroupedItems", () => {
  it("keeps one row with quantity when qty > 1", () => {
    const items = logicalLinesToGroupedItems(
      [
        {
          foreignName: "Taco",
          translatedName: "Taco",
          foreignLineTotal: 30,
          quantity: 3,
        },
      ],
      fx,
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(3);
    expect(items[0]?.foreignPrice).toBe(10);
    expect(items[0]?.usdPrice).toBe(10);
  });
});
