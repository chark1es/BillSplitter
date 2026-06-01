import { describe, expect, it } from "vitest";
import {
  getEffectiveAssignedUnits,
  getParticipantEffectiveUnits,
} from "./shared-unit-splits";

describe("shared unit splits", () => {
  const map = {
    wings: [
      { participantId: "bob", quantity: 2 },
      { participantId: "john", quantity: 2 },
    ],
  };
  const split = { units: 1, participantIds: ["bob", "john"] };

  it("counts exclusive plus shared pool toward line total", () => {
    expect(getEffectiveAssignedUnits(map, "wings", split)).toBe(5);
  });

  it("adds half a shared unit to each split member", () => {
    expect(getParticipantEffectiveUnits(map, "wings", "bob", split)).toBe(2.5);
    expect(getParticipantEffectiveUnits(map, "wings", "john", split)).toBe(2.5);
  });
});
