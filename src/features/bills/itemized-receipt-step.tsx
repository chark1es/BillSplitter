import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { BillWizardHero } from "./bill-wizard-hero";
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
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newForeignName, setNewForeignName] = useState("");
  const [newTranslatedName, setNewTranslatedName] = useState("");
  const [newForeignPriceInput, setNewForeignPriceInput] = useState("");
  const [newUsdPriceInput, setNewUsdPriceInput] = useState("");
  const [newItemError, setNewItemError] = useState<string | null>(null);

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

  const resetNewItemForm = () => {
    setNewForeignName("");
    setNewTranslatedName("");
    setNewForeignPriceInput("");
    setNewUsdPriceInput("");
    setNewItemError(null);
  };

  const handleNewItemPriceChange = (currency: "foreign" | "usd", value: string) => {
    const rate = parsedReceipt?.fxSnapshot.foreignUnitsPerUsd ?? 1;

    if (currency === "foreign") {
      setNewForeignPriceInput(value);
      if (!value.trim()) {
        setNewUsdPriceInput("");
        return;
      }
      const next = Number(value);
      if (!Number.isFinite(next)) return;
      setNewUsdPriceInput(formatOptionalMoneyInput(roundMoney(next / rate)));
      return;
    }

    setNewUsdPriceInput(value);
    if (!value.trim()) {
      setNewForeignPriceInput("");
      return;
    }
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    setNewForeignPriceInput(formatOptionalMoneyInput(roundMoney(next * rate)));
  };

  const handleAddItemSubmit = () => {
    if (!parsedReceipt) return;

    const foreignName = newForeignName.trim();
    const translatedName = newTranslatedName.trim();
    const rate = parsedReceipt.fxSnapshot.foreignUnitsPerUsd ?? 1;
    const foreignValue = newForeignPriceInput.trim()
      ? Number(newForeignPriceInput)
      : Number.NaN;
    const usdValue = newUsdPriceInput.trim() ? Number(newUsdPriceInput) : Number.NaN;
    const hasForeign = Number.isFinite(foreignValue);
    const hasUsd = Number.isFinite(usdValue);

    if (!foreignName && !translatedName) {
      setNewItemError("Add at least one item name.");
      return;
    }
    if (!hasForeign && !hasUsd) {
      setNewItemError("Add a valid price in either currency.");
      return;
    }

    const foreignPrice = hasForeign ? roundMoney(foreignValue) : roundMoney(usdValue * rate);
    const usdPrice = hasUsd ? roundMoney(usdValue) : roundMoney(foreignValue / rate);

    updateParsedReceipt((parsed) => ({
      ...parsed,
      items: [
        ...parsed.items,
        {
          id:
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          foreignName: foreignName || translatedName,
          translatedName: translatedName || foreignName,
          foreignPrice,
          usdPrice,
        },
      ],
    }));

    resetNewItemForm();
    setIsAddItemOpen(false);
  };

  const handleDeleteItem = (itemId: string) => {
    updateParsedReceipt((parsed) => ({
      ...parsed,
      items: parsed.items.filter((item) => item.id !== itemId),
    }));
    if (editingItemId === itemId) {
      setEditingItemId(null);
    }
  };

  if (!parsedReceipt) {
    return null;
  }

  return (
    <div className="space-y-5 px-1 sm:space-y-6 sm:px-0">
      <BillWizardNavBar
        currentPath="/bills/new/itemized"
        onBack={() => navigate({ to: "/bills/new/upload", viewTransition: true })}
        step={2}
        totalSteps={5}
      />
      <BillWizardHero
        description="Edit names and prices in the table, or open an item for the full form. Tax, tip, and totals stay in sync with your FX rate."
        eyebrow="Itemized"
        step={2}
        title="Review itemized receipt."
        trailing={<LocalDraftDisclosure />}
      />

      <ReceiptPreviewRail
        compact
        compactSinglePreview
        receiptImageUrls={draft?.receipt.pages.map((page) => page.ufsUrl) ?? []}
        title={draft?.receipt.parsed?.title ?? "Receipt"}
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-start lg:gap-6">
        <article className="panel min-w-0 p-5 sm:p-7">
          <div className="flex flex-col gap-1 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-[0.65rem]">Line items</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Fix names and prices here; tax, tip, and FX live below.
              </p>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              {parsedReceipt.confidence != null ? (
                <p className="text-[0.65rem] text-[var(--muted)]">
                  Parse confidence {(parsedReceipt.confidence * 100).toFixed(0)}%
                </p>
              ) : null}
              <Button
                className="rounded-full border-[var(--line)] bg-white/85 px-4 text-xs font-semibold text-[var(--ink)] hover:bg-white"
                onClick={() => {
                  resetNewItemForm();
                  setIsAddItemOpen(true);
                }}
                size="sm"
                variant="outline"
              >
                Add item
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            <Table className="min-w-[28rem] md:min-w-full">
              <TableHeader className="bg-[var(--surface-2)]">
                <TableRow className="border-[var(--line)] hover:bg-transparent">
                  <TableHead className="px-3 py-2.5 text-left text-xs font-semibold text-[var(--muted)] sm:px-4 sm:py-3">
                    Name
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--muted)] sm:px-4 sm:py-3">
                    {parsedReceipt.currencyCode}
                  </TableHead>
                  <TableHead className="px-3 py-2.5 text-right text-xs font-semibold text-[var(--muted)] sm:px-4 sm:py-3">
                    USD
                  </TableHead>
                  <TableHead className="w-[7.5rem] px-3 py-2.5 text-right text-xs font-semibold text-[var(--muted)] sm:w-auto sm:px-4 sm:py-3">
                    <span className="hidden sm:inline">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parsedReceipt.items.map((item) => (
                  <TableRow
                    className="border-[var(--line)] hover:bg-[var(--surface-2)]"
                    key={item.id}
                  >
                    <TableCell className="max-w-[14rem] px-3 py-2 sm:max-w-[18rem] sm:px-4 sm:py-3">
                      <p className="truncate font-semibold text-[var(--ink)]">
                        {item.translatedName}
                      </p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {item.foreignName}
                      </p>
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right tabular-nums text-[var(--ink)] sm:px-4 sm:py-3">
                      {item.foreignPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right tabular-nums font-semibold text-[var(--ink)] sm:px-4 sm:py-3">
                      ${item.usdPrice.toFixed(2)}
                    </TableCell>
                    <TableCell className="px-3 py-2 text-right sm:px-4 sm:py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          className="h-8 rounded-full border-[var(--line)] bg-white/70 px-3 text-xs text-[var(--ink)] hover:bg-white"
                          onClick={() => setEditingItemId(item.id)}
                          size="sm"
                          variant="outline"
                        >
                          Edit
                        </Button>
                        <Button
                          className="h-8 rounded-full border-rose-200 bg-rose-50 px-3 text-xs text-rose-700 hover:bg-rose-100"
                          onClick={() => handleDeleteItem(item.id)}
                          size="sm"
                          variant="outline"
                        >
                          Delete
                        </Button>
                      </div>
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

          <section className="mt-6 border-t border-[var(--line)] pt-5">
            <div>
              <p className="eyebrow text-[0.65rem]">Tax, tip, totals</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Values sync across currencies using your FX snapshot.
              </p>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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

            <div className="mt-5 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-3 sm:px-4 sm:py-4">
              <p className="eyebrow text-[0.65rem]">Updated totals</p>
              <div className="mt-3 grid gap-4 lg:grid-cols-2 lg:gap-6">
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

        <aside className="panel p-5 sm:p-6 lg:sticky lg:top-5">
          <p className="eyebrow mb-3 text-[0.65rem]">Next</p>
          <ol className="space-y-2.5 text-sm leading-relaxed text-[var(--muted)]">
            <li className="flex gap-2">
              <span className="font-semibold tabular-nums text-[var(--accent)]">1</span>
              <span>Upload & parse</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold tabular-nums text-[var(--accent)]">2</span>
              <span>Review line items (you are here)</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold tabular-nums text-[var(--accent)]">3</span>
              <span>Add who split the bill</span>
            </li>
          </ol>
          <Button
            className="mt-6 w-full justify-center rounded-full border-0 bg-[var(--accent-strong)] py-5 text-white hover:bg-[var(--accent)] sm:mt-8 sm:py-6"
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

      <Dialog
        onOpenChange={(nextOpen) => {
          setIsAddItemOpen(nextOpen);
          if (!nextOpen) {
            resetNewItemForm();
          }
        }}
        open={isAddItemOpen}
      >
        <DialogContent className="rounded-[1.7rem] border border-[var(--line)] bg-[var(--surface)] p-5 sm:max-w-lg sm:p-6">
          <DialogHeader>
            <DialogTitle className="display text-3xl text-[var(--ink)]">Add item</DialogTitle>
            <DialogDescription className="text-[var(--muted)]">
              Add a missing line from the receipt. Price fields auto-sync with your FX rate.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            <div className="grid gap-2">
              <Label className="text-xs font-semibold tracking-wide text-[var(--muted)]">
                Original name ({parsedReceipt.currencyCode})
              </Label>
              <Input
                className="h-11 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
                onChange={(e) => setNewForeignName(e.target.value)}
                placeholder="e.g. Yakisoba"
                type="text"
                value={newForeignName}
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs font-semibold tracking-wide text-[var(--muted)]">
                Translated name (USD)
              </Label>
              <Input
                className="h-11 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
                onChange={(e) => setNewTranslatedName(e.target.value)}
                placeholder="e.g. Fried noodles"
                type="text"
                value={newTranslatedName}
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
                  onChange={(e) => handleNewItemPriceChange("foreign", e.target.value)}
                  placeholder={`0.00 ${parsedReceipt.currencyCode}`}
                  type="text"
                  value={newForeignPriceInput}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-semibold tracking-wide text-[var(--muted)]">
                  Price (USD)
                </Label>
                <Input
                  className="h-11 rounded-2xl border-[var(--line)] bg-white/70 px-4 text-[var(--ink)]"
                  inputMode="decimal"
                  onChange={(e) => handleNewItemPriceChange("usd", e.target.value)}
                  placeholder="0.00 USD"
                  type="text"
                  value={newUsdPriceInput}
                />
              </div>
            </div>

            {newItemError ? (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {newItemError}
              </p>
            ) : null}

            <div className="flex justify-end gap-2">
              <Button
                className="rounded-full border-[var(--line)] bg-white/70 px-5 text-[var(--ink)] hover:bg-white"
                onClick={() => setIsAddItemOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="rounded-full border-0 bg-[var(--accent-strong)] px-5 text-white hover:bg-[var(--accent)]"
                onClick={handleAddItemSubmit}
              >
                Add line item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
