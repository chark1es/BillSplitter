import { describe, expect, it } from "vitest";
import { collapseExpandedReceiptItems } from "./collapse-expanded-items";

describe("collapseExpandedReceiptItems", () => {
  it("merges duplicate unit rows and combines assignments", () => {
    const result = collapseExpandedReceiptItems(
      [
        {
          id: "a",
          foreignName: "Beer",
          translatedName: "Beer",
          foreignPrice: 5,
          usdPrice: 5,
        },
        {
          id: "b",
          foreignName: "Beer",
          translatedName: "Beer",
          foreignPrice: 5,
          usdPrice: 5,
        },
      ],
      {
        a: [{ participantId: "p1", quantity: 1 }],
        b: [{ participantId: "p2", quantity: 1 }],
      },
    );

    expect(result.collapsed).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.quantity).toBe(2);
    expect(result.assignments[result.items[0]!.id]).toEqual(
      expect.arrayContaining([
        { participantId: "p1", quantity: 1 },
        { participantId: "p2", quantity: 1 },
      ]),
    );
  });
});
