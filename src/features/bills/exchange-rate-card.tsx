import { useEffect, useMemo, useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import type { LocalParsedReceipt } from "../../lib/drafts/local-bill-draft";
import {
  applyFxSnapshotToParsedReceipt,
  convertForeignToUsd,
  convertUsdToForeign,
} from "../../lib/fx/usd-fx";
import { getFxSnapshot } from "../../lib/fx/get-fx-snapshot.fn";

type ExchangeRateCardProps = {
  parsedReceipt: LocalParsedReceipt;
  onParsedReceiptChange: (
    updater: (parsedReceipt: LocalParsedReceipt) => LocalParsedReceipt,
  ) => void;
};

const formatMoneyInput = (value: number) => value.toFixed(2);

const formatRate = (value: number) =>
  value.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });

const getRateSourceLabel = (rateSource?: LocalParsedReceipt["fxSnapshot"]["rateSource"]) => {
  if (rateSource === "currencyapi") {
    return "currencyapi";
  }

  if (rateSource === "frankfurter") {
    return "Frankfurter";
  }

  return "USD parity";
};

export function ExchangeRateCard({
  parsedReceipt,
  onParsedReceiptChange,
}: ExchangeRateCardProps) {
  const isForeignReceipt = parsedReceipt.currencyCode !== "USD";
  const [foreignAmount, setForeignAmount] = useState("");
  const [usdAmount, setUsdAmount] = useState("");
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const receiptTotalForeign = useMemo(
    () =>
      parsedReceipt.items.reduce((sum, item) => sum + item.foreignPrice, 0) +
      parsedReceipt.taxForeignAmount +
      parsedReceipt.tipForeignAmount,
    [parsedReceipt],
  );
  const receiptTotalUsd = useMemo(
    () =>
      parsedReceipt.items.reduce((sum, item) => sum + item.usdPrice, 0) +
      parsedReceipt.taxUsdAmount +
      parsedReceipt.tipUsdAmount,
    [parsedReceipt],
  );

  useEffect(() => {
    if (!isForeignReceipt) {
      return;
    }

    setForeignAmount(formatMoneyInput(receiptTotalForeign));
    setUsdAmount(formatMoneyInput(receiptTotalUsd));
  }, [isForeignReceipt, receiptTotalForeign, receiptTotalUsd]);

  if (!isForeignReceipt) {
    return null;
  }

  const handleForeignAmountChange = (value: string) => {
    setForeignAmount(value);

    if (!value.trim()) {
      setUsdAmount("");
      return;
    }

    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }

    setUsdAmount(
      formatMoneyInput(convertForeignToUsd(next, parsedReceipt.fxSnapshot)),
    );
  };

  const handleUsdAmountChange = (value: string) => {
    setUsdAmount(value);

    if (!value.trim()) {
      setForeignAmount("");
      return;
    }

    const next = Number(value);
    if (!Number.isFinite(next)) {
      return;
    }

    setForeignAmount(
      formatMoneyInput(convertUsdToForeign(next, parsedReceipt.fxSnapshot)),
    );
  };

  const handleRefreshRate = async () => {
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const fxSnapshot = await getFxSnapshot({
        data: { currencyCode: parsedReceipt.currencyCode },
      });
      onParsedReceiptChange((current) =>
        applyFxSnapshotToParsedReceipt(current, fxSnapshot),
      );
    } catch (error) {
      setRefreshError(
        error instanceof Error ? error.message : "Could not refresh exchange rate.",
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="mt-6 rounded-[1.7rem] border border-[var(--line)] bg-[var(--surface-2)] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Live FX calculator</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Detected foreign currency: {parsedReceipt.currencyCode}. Refresh to pull
            the latest rate and recalculate the USD values for this receipt.
          </p>
        </div>
        <Button
          className="rounded-full border-[var(--line)] bg-white/70 text-[var(--ink)] hover:bg-white"
          disabled={isRefreshing}
          onClick={() => void handleRefreshRate()}
          variant="outline"
        >
          {isRefreshing ? "Refreshing…" : "Refresh rate"}
        </Button>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 text-sm">
          <p className="font-semibold text-[var(--ink)]">
            1 USD = {formatRate(parsedReceipt.fxSnapshot.foreignUnitsPerUsd)}{" "}
            {parsedReceipt.currencyCode}
          </p>
          <p className="mt-2 text-[var(--muted)]">
            1 {parsedReceipt.currencyCode} ={" "}
            {formatRate(1 / parsedReceipt.fxSnapshot.foreignUnitsPerUsd)} USD
          </p>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Source: {getRateSourceLabel(parsedReceipt.fxSnapshot.rateSource)}
          </p>
          <p className="text-xs text-[var(--muted)]">
            Updated:{" "}
            {parsedReceipt.fxSnapshot.lastUpdatedAt ?? parsedReceipt.fxSnapshot.date}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs">
            <span className="text-[var(--muted)]">
              Amount ({parsedReceipt.currencyCode})
            </span>
            <Input
              className="h-11 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
              inputMode="decimal"
              onChange={(event) => handleForeignAmountChange(event.target.value)}
              placeholder={`0.00 ${parsedReceipt.currencyCode}`}
              step="0.01"
              type="number"
              value={foreignAmount}
            />
          </label>

          <label className="grid gap-1 text-xs">
            <span className="text-[var(--muted)]">Amount (USD)</span>
            <Input
              className="h-11 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
              inputMode="decimal"
              onChange={(event) => handleUsdAmountChange(event.target.value)}
              placeholder="0.00 USD"
              step="0.01"
              type="number"
              value={usdAmount}
            />
          </label>

          <Button
            className="rounded-full border-[var(--line)] bg-white/70 text-[var(--ink)] hover:bg-white sm:col-span-2"
            onClick={() => handleForeignAmountChange(formatMoneyInput(receiptTotalForeign))}
            type="button"
            variant="outline"
          >
            Use receipt total
          </Button>
        </div>
      </div>

      {refreshError ? (
        <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {refreshError}
        </p>
      ) : null}
    </div>
  );
}
