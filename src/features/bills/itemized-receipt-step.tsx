import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BillWizardNavBar } from "./bill-wizard-nav";
import { ExchangeRateCard } from "./exchange-rate-card";
import { LocalDraftDisclosure } from "./local-draft-disclosure";
import {
  formatOptionalMoneyInput,
  useBillWizardRoutePreload,
} from "./bill-wizard-routing";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import { roundMoney } from "../../lib/drafts/local-bill-draft";
import {
  calculateParsedReceiptGrandTotalForeign,
  calculateParsedReceiptGrandTotalUsd,
  calculateParsedReceiptSubtotalForeign,
  calculateParsedReceiptSubtotalUsd,
} from "../../lib/receipt/receipt-totals";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { ReceiptPreviewRail } from "./receipt-preview-rail";

type EditableReceiptItem = {
  id: string;
  foreignName: string;
  translatedName: string;
  foreignPrice: number;
  usdPrice: number;
};

export function ItemizedReceiptStep() {
  const navigate = useNavigate();
  const { draft, patchDraft, hydrated } = useActiveBillDraft();
  const parsedReceipt = draft?.receipt.parsed ?? null;
  useBillWizardRoutePreload("/bills/new/itemized");

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [taxForeignInput, setTaxForeignInput] = useState("");
  const [taxUsdInput, setTaxUsdInput] = useState("");
  const [tipForeignInput, setTipForeignInput] = useState("");
  const [tipUsdInput, setTipUsdInput] = useState("");
  const [editingForeignName, setEditingForeignName] = useState("");
  const [editingTranslatedName, setEditingTranslatedName] = useState("");
  const [editingForeignPriceInput, setEditingForeignPriceInput] = useState("");
  const [editingUsdPriceInput, setEditingUsdPriceInput] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!draft?.receipt.parsed) {
      navigate({ to: "/bills/new/upload" });
    }
  }, [draft, hydrated, navigate]);

  const computedSubtotalUsd = parsedReceipt
    ? calculateParsedReceiptSubtotalUsd(parsedReceipt)
    : 0;
  const computedSubtotalForeign = parsedReceipt
    ? calculateParsedReceiptSubtotalForeign(parsedReceipt)
    : 0;
  const computedGrandTotalUsd = parsedReceipt
    ? calculateParsedReceiptGrandTotalUsd(parsedReceipt)
    : 0;
  const computedGrandTotalForeign = parsedReceipt
    ? calculateParsedReceiptGrandTotalForeign(parsedReceipt)
    : 0;

  const editingItem = useMemo(() => {
    if (!parsedReceipt || !editingItemId) return null;
    return parsedReceipt.items.find((item) => item.id === editingItemId) ?? null;
  }, [parsedReceipt, editingItemId]);

  useEffect(() => {
    if (!parsedReceipt) return;
    setTaxForeignInput(formatOptionalMoneyInput(parsedReceipt.taxForeignAmount));
    setTaxUsdInput(formatOptionalMoneyInput(parsedReceipt.taxUsdAmount));
    setTipForeignInput(formatOptionalMoneyInput(parsedReceipt.tipForeignAmount));
    setTipUsdInput(formatOptionalMoneyInput(parsedReceipt.tipUsdAmount));
  }, [
    parsedReceipt,
    parsedReceipt?.taxForeignAmount,
    parsedReceipt?.taxUsdAmount,
    parsedReceipt?.tipForeignAmount,
    parsedReceipt?.tipUsdAmount,
  ]);

  useEffect(() => {
    if (!editingItem) return;
    setEditingForeignName(editingItem.foreignName);
    setEditingTranslatedName(editingItem.translatedName);
    setEditingForeignPriceInput(formatOptionalMoneyInput(editingItem.foreignPrice));
    setEditingUsdPriceInput(formatOptionalMoneyInput(editingItem.usdPrice));
  }, [editingItemId]);

  const updateParsedReceipt = (
    updater: (
      parsed: NonNullable<typeof parsedReceipt>,
    ) => NonNullable<typeof parsedReceipt>,
  ) => {
    patchDraft((prev) => {
      if (!prev.receipt.parsed) return prev;
      return {
        ...prev,
        receipt: {
          ...prev.receipt,
          parsed: updater(prev.receipt.parsed),
        },
      };
    });
  };

  const updateItem = (
    itemId: string,
    updater: (item: EditableReceiptItem) => EditableReceiptItem,
  ) => {
    updateParsedReceipt((parsed) => ({
      ...parsed,
      items: parsed.items.map((item) =>
        item.id === itemId ? updater(item as EditableReceiptItem) : item,
      ),
    }));
  };

  const handleTaxTipForeignChange = (kind: "tax" | "tip", value: string) => {
    const rate = parsedReceipt?.fxSnapshot.foreignUnitsPerUsd ?? 1;

    if (kind === "tax") {
      setTaxForeignInput(value);
      if (!value.trim()) {
        setTaxUsdInput("");
        updateParsedReceipt((parsed) => ({
          ...parsed,
          taxForeignAmount: 0,
          taxUsdAmount: 0,
        }));
        return;
      }

      const next = Number(value);
      if (!Number.isFinite(next)) return;
      const usd = roundMoney(next / rate);
      setTaxUsdInput(formatOptionalMoneyInput(usd));
      updateParsedReceipt((parsed) => ({
        ...parsed,
        taxForeignAmount: next,
        taxUsdAmount: usd,
      }));
      return;
    }

    setTipForeignInput(value);
    if (!value.trim()) {
      setTipUsdInput("");
      updateParsedReceipt((parsed) => ({
        ...parsed,
        tipForeignAmount: 0,
        tipUsdAmount: 0,
      }));
      return;
    }

    const next = Number(value);
    if (!Number.isFinite(next)) return;
    const usd = roundMoney(next / rate);
    setTipUsdInput(formatOptionalMoneyInput(usd));
    updateParsedReceipt((parsed) => ({
      ...parsed,
      tipForeignAmount: next,
      tipUsdAmount: usd,
    }));
  };

  const handleTaxTipUsdChange = (kind: "tax" | "tip", value: string) => {
    const rate = parsedReceipt?.fxSnapshot.foreignUnitsPerUsd ?? 1;

    if (kind === "tax") {
      setTaxUsdInput(value);
      if (!value.trim()) {
        setTaxForeignInput("");
        updateParsedReceipt((parsed) => ({
          ...parsed,
          taxUsdAmount: 0,
          taxForeignAmount: 0,
        }));
        return;
      }

      const next = Number(value);
      if (!Number.isFinite(next)) return;
      const foreign = roundMoney(next * rate);
      setTaxForeignInput(formatOptionalMoneyInput(foreign));
      updateParsedReceipt((parsed) => ({
        ...parsed,
        taxUsdAmount: next,
        taxForeignAmount: foreign,
      }));
      return;
    }

    setTipUsdInput(value);
    if (!value.trim()) {
      setTipForeignInput("");
      updateParsedReceipt((parsed) => ({
        ...parsed,
        tipUsdAmount: 0,
        tipForeignAmount: 0,
      }));
      return;
    }

    const next = Number(value);
    if (!Number.isFinite(next)) return;
    const foreign = roundMoney(next * rate);
    setTipForeignInput(formatOptionalMoneyInput(foreign));
    updateParsedReceipt((parsed) => ({
      ...parsed,
      tipUsdAmount: next,
      tipForeignAmount: foreign,
    }));
  };

  const handleEditingItemPriceChange = (currency: "foreign" | "usd", value: string) => {
    if (!editingItem) return;

    const rate = parsedReceipt?.fxSnapshot.foreignUnitsPerUsd ?? 1;

    if (currency === "foreign") {
      setEditingForeignPriceInput(value);
      if (!value.trim()) {
        setEditingUsdPriceInput("");
        updateItem(editingItem.id, (item) => ({
          ...item,
          foreignPrice: 0,
          usdPrice: 0,
        }));
        return;
      }

      const next = Number(value);
      if (!Number.isFinite(next)) return;
      const usd = roundMoney(next / rate);
      setEditingUsdPriceInput(formatOptionalMoneyInput(usd));
      updateItem(editingItem.id, (item) => ({
        ...item,
        foreignPrice: next,
        usdPrice: usd,
      }));
      return;
    }

    setEditingUsdPriceInput(value);
    if (!value.trim()) {
      setEditingForeignPriceInput("");
      updateItem(editingItem.id, (item) => ({
        ...item,
        usdPrice: 0,
        foreignPrice: 0,
      }));
      return;
    }

    const next = Number(value);
    if (!Number.isFinite(next)) return;
    const foreign = roundMoney(next * rate);
    setEditingForeignPriceInput(formatOptionalMoneyInput(foreign));
    updateItem(editingItem.id, (item) => ({
      ...item,
      usdPrice: next,
      foreignPrice: foreign,
    }));
  };

  if (!parsedReceipt) {
    return null;
  }

  return (
    <div className="space-y-6">
      <BillWizardNavBar
        currentPath="/bills/new/itemized"
        onBack={() => navigate({ to: "/bills/new/upload", viewTransition: true })}
        step={2}
        totalSteps={5}
        backLabel="Back to upload"
      />
      <section className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow mb-3">Step 2</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-6xl">
          Review itemized receipt.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Items are shown in a table by default. Tap edit to open a phone-friendly
          modal and adjust names, prices, tax, and tip.
        </p>
        <div className="mt-4">
          <LocalDraftDisclosure />
        </div>
      </section>

      <ReceiptPreviewRail
        compact
        receiptImageUrls={draft?.receipt.pages.map((page) => page.ufsUrl) ?? []}
        title={draft?.receipt.parsed?.title ?? "Receipt"}
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <article className="panel min-w-0 p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Line items</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Check names and prices first, then adjust tax, tip, and the final
                totals below.
              </p>
            </div>
            <div className="text-right text-xs text-[var(--muted)]">
              <p>
                1 USD = {parsedReceipt.fxSnapshot.foreignUnitsPerUsd}{" "}
                {parsedReceipt.currencyCode}
              </p>
              <p>
                As of{" "}
                {parsedReceipt.fxSnapshot.lastUpdatedAt ??
                  parsedReceipt.fxSnapshot.date}
              </p>
            </div>
          </div>
          {parsedReceipt.confidence != null ? (
            <p className="mt-3 text-xs text-[var(--muted)]">
              Model confidence: {(parsedReceipt.confidence * 100).toFixed(0)}%
            </p>
          ) : null}

          <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
            <Table>
              <TableHeader className="bg-[var(--surface-2)]">
                <TableRow className="border-[var(--line)] hover:bg-transparent">
                  <TableHead className="px-4 py-3 font-semibold text-[var(--muted)]">
                    Name
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right font-semibold text-[var(--muted)]">
                    {parsedReceipt.currencyCode}
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right font-semibold text-[var(--muted)]">
                    USD
                  </TableHead>
                  <TableHead className="px-4 py-3 text-right font-semibold text-[var(--muted)]">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedReceipt.items.map((item) => (
                  <TableRow
                    className="border-[var(--line)] hover:bg-[var(--surface-2)]"
                    key={item.id}
                  >
                    <TableCell className="max-w-[18rem] px-4 py-3">
                      <p className="truncate font-semibold text-[var(--ink)]">
                        {item.translatedName}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {item.foreignName}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums text-[var(--ink)]">
                      {item.foreignPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right tabular-nums font-semibold text-[var(--ink)]">
                      ${item.usdPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <Button
                        className="rounded-full border-[var(--line)] bg-white/70 px-3 text-[var(--ink)] hover:bg-white"
                        onClick={() => setEditingItemId(item.id)}
                        variant="outline"
                      >
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {parsedReceipt.items.length === 0 ? (
                  <TableRow className="border-[var(--line)] hover:bg-transparent">
                    <TableCell
                      className="px-4 py-8 text-center text-sm text-[var(--muted)]"
                      colSpan={4}
                    >
                      No line items found yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <ExchangeRateCard
            onParsedReceiptChange={updateParsedReceipt}
            parsedReceipt={parsedReceipt}
          />

          <section className="mt-6 border-t border-[var(--line)] pt-6">
            <div>
              <p className="eyebrow">Tax, tip, and totals</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Empty fields stay blank. Valid values still sync across both
                currencies.
              </p>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <label className="grid gap-1 text-xs">
                <span className="text-[var(--muted)]">Tax ({parsedReceipt.currencyCode})</span>
                <Input
                  className="h-10 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
                  inputMode="decimal"
                  onChange={(e) => handleTaxTipForeignChange("tax", e.target.value)}
                  placeholder={`0.00 ${parsedReceipt.currencyCode}`}
                  type="text"
                  value={taxForeignInput}
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-[var(--muted)]">Tip ({parsedReceipt.currencyCode})</span>
                <Input
                  className="h-10 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
                  inputMode="decimal"
                  onChange={(e) => handleTaxTipForeignChange("tip", e.target.value)}
                  placeholder={`0.00 ${parsedReceipt.currencyCode}`}
                  type="text"
                  value={tipForeignInput}
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-[var(--muted)]">Tax (USD)</span>
                <Input
                  className="h-10 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
                  inputMode="decimal"
                  onChange={(e) => handleTaxTipUsdChange("tax", e.target.value)}
                  placeholder="0.00 USD"
                  type="text"
                  value={taxUsdInput}
                />
              </label>
              <label className="grid gap-1 text-xs">
                <span className="text-[var(--muted)]">Tip (USD)</span>
                <Input
                  className="h-10 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
                  inputMode="decimal"
                  onChange={(e) => handleTaxTipUsdChange("tip", e.target.value)}
                  placeholder="0.00 USD"
                  type="text"
                  value={tipUsdInput}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                className={
                  parsedReceipt.taxTipMode === "proportional"
                    ? "rounded-full border-[var(--line)] bg-white/85 text-[var(--ink)] ring-2 ring-[var(--accent)]"
                    : "rounded-full border-[var(--line)] bg-white/60 text-[var(--ink)]"
                }
                onClick={() =>
                  updateParsedReceipt((parsed) => ({
                    ...parsed,
                    taxTipMode: "proportional",
                  }))
                }
                variant="outline"
              >
                Tax & tip: proportional
              </Button>
              <Button
                className={
                  parsedReceipt.taxTipMode === "equal"
                    ? "rounded-full border-[var(--line)] bg-white/85 text-[var(--ink)] ring-2 ring-[var(--accent)]"
                    : "rounded-full border-[var(--line)] bg-white/60 text-[var(--ink)]"
                }
                onClick={() =>
                  updateParsedReceipt((parsed) => ({
                    ...parsed,
                    taxTipMode: "equal",
                  }))
                }
                variant="outline"
              >
                Tax & tip: equal split
              </Button>
            </div>

            <div className="mt-6 rounded-[1.7rem] border border-[var(--line)] bg-[var(--surface-2)] p-5">
              <p className="eyebrow">Updated totals</p>
              <div className="mt-4 grid gap-5 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    {parsedReceipt.currencyCode}
                  </p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Subtotal</dt>
                      <dd className="tabular-nums font-semibold text-[var(--ink)]">
                        {computedSubtotalForeign.toFixed(2)} {parsedReceipt.currencyCode}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Tax</dt>
                      <dd className="tabular-nums text-[var(--ink)]">
                        {parsedReceipt.taxForeignAmount.toFixed(2)} {parsedReceipt.currencyCode}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Tip</dt>
                      <dd className="tabular-nums text-[var(--ink)]">
                        {parsedReceipt.tipForeignAmount.toFixed(2)} {parsedReceipt.currencyCode}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-2">
                      <dt className="font-semibold text-[var(--ink)]">Total</dt>
                      <dd className="tabular-nums font-bold text-[var(--ink)]">
                        {computedGrandTotalForeign.toFixed(2)} {parsedReceipt.currencyCode}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                    USD
                  </p>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Subtotal</dt>
                      <dd className="tabular-nums font-semibold text-[var(--ink)]">
                        {computedSubtotalUsd.toFixed(2)} USD
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Tax</dt>
                      <dd className="tabular-nums text-[var(--ink)]">
                        {parsedReceipt.taxUsdAmount.toFixed(2)} USD
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Tip</dt>
                      <dd className="tabular-nums text-[var(--ink)]">
                        {parsedReceipt.tipUsdAmount.toFixed(2)} USD
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-2">
                      <dt className="font-semibold text-[var(--ink)]">Total</dt>
                      <dd className="tabular-nums font-bold text-[var(--ink)]">
                        {computedGrandTotalUsd.toFixed(2)} USD
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </section>
        </article>

        <aside className="panel p-6 lg:sticky lg:top-6">
          <p className="eyebrow mb-3">Next</p>
          <ol className="space-y-3 text-sm leading-6 text-[var(--muted)]">
            <li>1. Upload and parse receipt pages.</li>
            <li>2. Review/edit itemized receipt.</li>
            <li>3. Add people who split the bill.</li>
          </ol>
          <Button
            className="mt-8 w-full justify-center rounded-full border-0 bg-[var(--accent-strong)] py-6 text-white hover:bg-[var(--accent)]"
            onClick={() =>
              navigate({ to: "/bills/new/participants", viewTransition: true })
            }
          >
            Next: add people
          </Button>
        </aside>
      </section>

      <Dialog onOpenChange={(nextOpen) => !nextOpen && setEditingItemId(null)} open={Boolean(editingItem)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-[1.7rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:max-w-lg sm:p-6">
          {editingItem ? (
            <>
              <DialogHeader>
                <DialogTitle className="display text-3xl text-[var(--ink)]">
                  Edit item
                </DialogTitle>
                <DialogDescription className="text-[var(--muted)]">
                  Use either currency field. Values stay synchronized with the parsed FX
                  snapshot.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-5">
                <div className="grid gap-2">
                  <Label className="text-xs font-semibold tracking-wide text-[var(--muted)]">
                    Original name ({parsedReceipt.currencyCode})
                  </Label>
                  <Input
                    className="h-11 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
                    onChange={(e) => {
                      setEditingForeignName(e.target.value);
                      updateItem(editingItem.id, (item) => ({
                        ...item,
                        foreignName: e.target.value,
                      }));
                    }}
                    type="text"
                    value={editingForeignName}
                  />
                </div>

                <div className="grid gap-2">
                  <Label className="text-xs font-semibold tracking-wide text-[var(--muted)]">
                    Translated name (USD)
                  </Label>
                  <Input
                    className="h-11 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
                    onChange={(e) => {
                      setEditingTranslatedName(e.target.value);
                      updateItem(editingItem.id, (item) => ({
                        ...item,
                        translatedName: e.target.value,
                      }));
                    }}
                    type="text"
                    value={editingTranslatedName}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold tracking-wide text-[var(--muted)]">
                      Price ({parsedReceipt.currencyCode})
                    </Label>
                    <Input
                      className="h-11 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
                      inputMode="decimal"
                      onChange={(e) =>
                        handleEditingItemPriceChange("foreign", e.target.value)
                      }
                      placeholder={`0.00 ${parsedReceipt.currencyCode}`}
                      type="text"
                      value={editingForeignPriceInput}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs font-semibold tracking-wide text-[var(--muted)]">
                      Price (USD)
                    </Label>
                    <Input
                      className="h-11 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
                      inputMode="decimal"
                      onChange={(e) =>
                        handleEditingItemPriceChange("usd", e.target.value)
                      }
                      placeholder="0.00 USD"
                      type="text"
                      value={editingUsdPriceInput}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    className="rounded-full border-[var(--line)] bg-white/70 px-5 text-[var(--ink)] hover:bg-white"
                    onClick={() => setEditingItemId(null)}
                    variant="outline"
                  >
                    Done
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
