import { describe, expect, it } from "vitest";
import {
  calculateParsedReceiptGrandTotalForeign,
  calculateParsedReceiptGrandTotalUsd,
  calculateParsedReceiptSubtotalForeign,
  calculateParsedReceiptSubtotalUsd,
} from "./receipt-totals";

describe("receipt totals", () => {
  const receipt = {
    items: [
      { foreignPrice: 1200, usdPrice: 8 },
      { foreignPrice: 1800, usdPrice: 12 },
    ],
    taxForeignAmount: 300,
    tipForeignAmount: 150,
    taxUsdAmount: 2,
    tipUsdAmount: 1,
    discountForeignAmount: 100,
    discountUsdAmount: 0.5,
  };

  it("calculates subtotal from item amounts only", () => {
    expect(calculateParsedReceiptSubtotalForeign(receipt)).toBe(3000);
    expect(calculateParsedReceiptSubtotalUsd(receipt)).toBe(20);
  });

  it("calculates grand total manually from items, tax, tip, and discount", () => {
    expect(calculateParsedReceiptGrandTotalForeign(receipt)).toBe(3350);
    expect(calculateParsedReceiptGrandTotalUsd(receipt)).toBe(22.5);
  });
});
