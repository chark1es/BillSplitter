import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import type { LocalParsedReceipt } from "../../lib/drafts/local-bill-draft";
import {
  applyFxSnapshotToParsedReceipt,
  convertForeignToUsd,
  convertUsdToForeign,
} from "../../lib/fx/usd-fx";
import {
  calculateParsedReceiptGrandTotalForeign,
  calculateParsedReceiptGrandTotalUsd,
} from "../../lib/receipt/receipt-totals";
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

const getRateSourceLabel = (
  rateSource?: LocalParsedReceipt["fxSnapshot"]["rateSource"],
) => {
  if (rateSource === "currencyapi") {
    return "CurrencyAPI";
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
    () => calculateParsedReceiptGrandTotalForeign(parsedReceipt),
    [parsedReceipt],
  );
  const receiptTotalUsd = useMemo(
    () => calculateParsedReceiptGrandTotalUsd(parsedReceipt),
    [parsedReceipt],
  );

  const rate = parsedReceipt.fxSnapshot.foreignUnitsPerUsd;
  const inverseUsdPerForeign = 1 / rate;

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

  const dateShort =
    parsedReceipt.fxSnapshot.lastUpdatedAt ?? parsedReceipt.fxSnapshot.date;

  return (
    <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-3 sm:px-4 sm:py-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
        <div className="min-w-0 flex-1 font-mono text-[0.8125rem] leading-snug text-[var(--ink)] sm:text-sm">
          <span className="tabular-nums">
            1 USD = {formatRate(rate)} {parsedReceipt.currencyCode}
          </span>
          <span className="mx-1.5 text-[var(--muted)]">·</span>
          <span className="tabular-nums">
            1 {parsedReceipt.currencyCode} = {formatRate(inverseUsdPerForeign)} USD
          </span>
        </div>
        <Button
          aria-label="Refresh exchange rate"
          className="shrink-0 rounded-full border-[var(--line)] bg-white/80 text-[var(--ink)] hover:bg-white"
          disabled={isRefreshing}
          onClick={() => void handleRefreshRate()}
          size="icon-sm"
          variant="outline"
        >
          <RefreshCw
            aria-hidden
            className={isRefreshing ? "animate-spin" : ""}
            strokeWidth={2}
          />
        </Button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:gap-3">
        <label className="grid gap-1">
          <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--muted)]">
            {parsedReceipt.currencyCode}
          </span>
          <Input
            className="h-9 rounded-xl border-[var(--line)] bg-white/80 px-3 text-sm text-[var(--ink)]"
            inputMode="decimal"
            onChange={(event) => handleForeignAmountChange(event.target.value)}
            placeholder={`0.00`}
            type="text"
            value={foreignAmount}
          />
        </label>
        <label className="grid gap-1">
          <span className="text-[0.65rem] font-medium uppercase tracking-wide text-[var(--muted)]">
            USD
          </span>
          <Input
            className="h-9 rounded-xl border-[var(--line)] bg-white/80 px-3 text-sm text-[var(--ink)]"
            inputMode="decimal"
            onChange={(event) => handleUsdAmountChange(event.target.value)}
            placeholder="0.00"
            type="text"
            value={usdAmount}
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button
          className="text-xs font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
          onClick={() => handleForeignAmountChange(formatMoneyInput(receiptTotalForeign))}
          type="button"
        >
          Use receipt total
        </button>
        <p className="text-[0.65rem] text-[var(--muted)]">
          {getRateSourceLabel(parsedReceipt.fxSnapshot.rateSource)} · {dateShort}
        </p>
      </div>

      {refreshError ? (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs text-rose-700">
          {refreshError}
        </p>
      ) : null}
    </div>
  );
}
