import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyFxSnapshotToParsedReceipt,
  fetchUsdFxSnapshot,
} from "./usd-fx";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("fetchUsdFxSnapshot", () => {
  it("returns USD parity without calling external APIs", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const snapshot = await fetchUsdFxSnapshot("usd");

    expect(snapshot.foreignUnitsPerUsd).toBe(1);
    expect(snapshot.currencyCode).toBe("USD");
    expect(snapshot.rateSource).toBe("parity");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("prefers currencyapi when a server key is configured", async () => {
    vi.stubEnv("CURRENCY_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        meta: { last_updated_at: "2026-03-29T09:30:00Z" },
        data: { JPY: { code: "JPY", value: 151.2345 } },
      }),
    } as Response);

    const snapshot = await fetchUsdFxSnapshot("jpy");

    expect(snapshot).toMatchObject({
      currencyCode: "JPY",
      foreignUnitsPerUsd: 151.2345,
      rateSource: "currencyapi",
      lastUpdatedAt: "2026-03-29T09:30:00Z",
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to Frankfurter when currencyapi fails", async () => {
    vi.stubEnv("CURRENCY_API_KEY", "test-key");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          amount: 1,
          base: "USD",
          date: "2026-03-29",
          rates: { VND: 25400 },
        }),
      } as Response);

    const snapshot = await fetchUsdFxSnapshot("vnd");

    expect(snapshot).toMatchObject({
      currencyCode: "VND",
      foreignUnitsPerUsd: 25400,
      rateSource: "frankfurter",
      date: "2026-03-29",
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("applyFxSnapshotToParsedReceipt", () => {
  it("recomputes USD amounts from the original foreign values", () => {
    const updated = applyFxSnapshotToParsedReceipt(
      {
        currencyCode: "JPY",
        fxSnapshot: {
          baseCurrency: "USD",
          currencyCode: "JPY",
          date: "2026-03-28",
          foreignUnitsPerUsd: 150,
        },
        items: [
          {
            id: "1",
            foreignName: "Ramen",
            translatedName: "Ramen",
            foreignPrice: 1500,
            usdPrice: 10,
          },
        ],
        taxForeignAmount: 150,
        tipForeignAmount: 0,
        taxUsdAmount: 1,
        tipUsdAmount: 0,
      },
      {
        baseCurrency: "USD",
        currencyCode: "JPY",
        date: "2026-03-29",
        foreignUnitsPerUsd: 125,
        lastUpdatedAt: "2026-03-29T09:45:00Z",
        rateSource: "currencyapi",
      },
    );

    expect(updated.items[0]?.usdPrice).toBe(12);
    expect(updated.taxUsdAmount).toBe(1.2);
    expect(updated.tipUsdAmount).toBe(0);
    expect(updated.fxSnapshot.foreignUnitsPerUsd).toBe(125);
  });
});
