import { describe, expect, it } from "vitest";
import { distributeQuantityAcrossParticipants } from "./distribute-quantity";

describe("distributeQuantityAcrossParticipants", () => {
  it("splits evenly with remainder to first ids", () => {
    expect(
      distributeQuantityAcrossParticipants(5, ["a", "b", "c"]),
    ).toEqual([
      { participantId: "a", quantity: 2 },
      { participantId: "b", quantity: 2 },
      { participantId: "c", quantity: 1 },
    ]);
  });

  it("returns empty for no participants", () => {
    expect(distributeQuantityAcrossParticipants(3, [])).toEqual([]);
  });
});
