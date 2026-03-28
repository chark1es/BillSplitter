import { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { parseReceiptFromUrls } from "../../lib/ai/parse-receipt.fn";
import { convertReceiptFileToWebp } from "../../lib/receipt/image-to-webp";
import { useUploadThing } from "../../lib/uploadthing";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import { LocalDraftDisclosure } from "./local-draft-disclosure";
import { BillWizardNavBar } from "./bill-wizard-nav";
import { ExchangeRateCard } from "./exchange-rate-card";

type PreviewRow = {
  id: string;
  previewUrl: string;
  ufsUrl: string | null;
  label: string;
  status: "converting" | "uploading" | "ready" | "error";
  error?: string;
};

export function UploadStep() {
  const navigate = useNavigate();
  const inputId = useId();

  const { draft, ensureDraft, patchDraft } = useActiveBillDraft();
  useEffect(() => {
    ensureDraft();
  }, [ensureDraft]);

  const [uploadRows, setUploadRows] = useState<PreviewRow[]>([]);
  const [uploadMode, setUploadMode] = useState<"add" | "replace">("add");
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const { startUpload, isUploading } = useUploadThing("receiptImage");

  const parsedReceipt = draft?.receipt.parsed ?? null;
  const readyUrls = useMemo(
    () => (draft?.receipt.pages ?? []).map((p) => p.ufsUrl),
    [draft?.receipt.pages],
  );

  const canParse =
    readyUrls.length > 0 && uploadRows.length === 0 && !isUploading && !isParsing;

  const computedSubtotalUsd = parsedReceipt
    ? parsedReceipt.items.reduce((sum, item) => sum + item.usdPrice, 0)
    : 0;
  const computedSubtotalForeign = parsedReceipt
    ? parsedReceipt.items.reduce((sum, item) => sum + item.foreignPrice, 0)
    : 0;
  const computedGrandTotalUsd = parsedReceipt
    ? computedSubtotalUsd +
      parsedReceipt.taxUsdAmount +
      parsedReceipt.tipUsdAmount
    : 0;
  const computedGrandTotalForeign = parsedReceipt
    ? computedSubtotalForeign +
      parsedReceipt.taxForeignAmount +
      parsedReceipt.tipForeignAmount
    : 0;
  const parsedReceiptRecord = parsedReceipt as Record<string, unknown> | null;
  const discountForeignAmount =
    parsedReceiptRecord && typeof parsedReceiptRecord.discountForeignAmount === "number"
      ? parsedReceiptRecord.discountForeignAmount
      : parsedReceiptRecord && typeof parsedReceiptRecord.discountAmount === "number"
        ? parsedReceiptRecord.discountAmount
        : 0;
  const discountUsdAmount =
    parsedReceiptRecord && typeof parsedReceiptRecord.discountUsdAmount === "number"
      ? parsedReceiptRecord.discountUsdAmount
      : parsedReceiptRecord && typeof parsedReceiptRecord.discountAmountUsd === "number"
        ? parsedReceiptRecord.discountAmountUsd
        : 0;
  const adjustedGrandTotalForeign = computedGrandTotalForeign - discountForeignAmount;
  const adjustedGrandTotalUsd = computedGrandTotalUsd - discountUsdAmount;

  const canProceed = Boolean(parsedReceipt) && !isParsing;

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

  const replaceOrAddPagesWithFiles = async (
    fileList: FileList | null,
    mode: "add" | "replace",
  ) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) {
      return;
    }

    setParseError(null);

    patchDraft((prev) => {
      const pages = mode === "replace" ? [] : prev.receipt.pages;
      return {
        ...prev,
        receipt: {
          ...prev.receipt,
          pages,
          parsed: null,
        },
        assignments: {},
      };
    });

    // Upload sequentially to keep the UI stable.
    for (const file of files) {
      const rowId = crypto.randomUUID();
      const label = file.name;

      setUploadRows((prev) => [
        ...prev,
        {
          id: rowId,
          previewUrl: "",
          ufsUrl: null,
          label,
          status: "converting",
        },
      ]);

      try {
        const webpBlob = await convertReceiptFileToWebp(file);
        const previewUrl = URL.createObjectURL(webpBlob);
        const webpFile = new File(
          [webpBlob],
          `${file.name.replace(/\.[^.]+$/, "")}.webp`,
          { type: "image/webp" },
        );

        setUploadRows((prev) =>
          prev.map((row) =>
            row.id === rowId
              ? { ...row, previewUrl, status: "uploading" as const }
              : row,
          ),
        );

        const uploaded = await startUpload([webpFile]);
        const first = uploaded?.[0];
        const ufsUrl =
          first &&
          typeof first === "object" &&
          "ufsUrl" in first &&
          typeof (first as { ufsUrl?: string }).ufsUrl === "string"
            ? (first as { ufsUrl: string }).ufsUrl
            : first &&
                typeof first === "object" &&
                "url" in first &&
                typeof (first as { url?: string }).url === "string"
              ? (first as { url: string }).url
              : null;

        if (!ufsUrl) {
          throw new Error("Upload did not return a URL");
        }

        // Persist as part of the local draft receipt.
        patchDraft((prev) => ({
          ...prev,
          receipt: {
            ...prev.receipt,
            pages: [
              ...prev.receipt.pages,
              {
                id: rowId,
                label,
                ufsUrl,
              },
            ],
            parsed: null,
          },
          assignments: {},
        }));

        setUploadRows((prev) => {
          const row = prev.find((r) => r.id === rowId);
          if (row?.previewUrl.startsWith("blob:")) {
            URL.revokeObjectURL(row.previewUrl);
          }
          return prev.filter((r) => r.id !== rowId);
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Upload failed";
        setUploadRows((prev) =>
          prev.map((row) =>
            row.id === rowId
              ? { ...row, status: "error" as const, error: message }
              : row,
          ),
        );
      }
    }
  };

  const removeReceiptPage = (id: string) => {
    setParseError(null);
    patchDraft((prev) => ({
      ...prev,
      receipt: {
        ...prev.receipt,
        pages: prev.receipt.pages.filter((p) => p.id !== id),
        parsed: null,
      },
      assignments: {},
    }));
  };

  const removeUploadRow = (id: string) => {
    setUploadRows((prev) => {
      const row = prev.find((r) => r.id === id);
      if (row?.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(row.previewUrl);
      }
      return prev.filter((r) => r.id !== id);
    });
  };

  const handleParse = async () => {
    if (!canParse) return;

    if (!readyUrls.length) {
      setParseError("Upload at least one receipt page first.");
      return;
    }

    setParseError(null);
    setIsParsing(true);
    try {
      const parsed = await parseReceiptFromUrls({ data: { imageUrls: readyUrls } });

      patchDraft((prev) => ({
        ...prev,
        receipt: {
          ...prev.receipt,
          parsed: {
            title: parsed.title,
            currencyCode: parsed.currencyCode,
            fxSnapshot: parsed.fxSnapshot,
            items: parsed.items.map((item) => ({
              id: crypto.randomUUID(),
              foreignName: item.foreignName,
              translatedName: item.translatedName,
              foreignPrice: item.foreignPrice,
              usdPrice: item.usdPrice,
            })),
            taxTipMode: parsed.taxTipMode,
            taxForeignAmount: parsed.taxForeignAmount,
            tipForeignAmount: parsed.tipForeignAmount,
            taxUsdAmount: parsed.taxUsdAmount,
            tipUsdAmount: parsed.tipUsdAmount,
            confidence: parsed.confidence,
          },
        },
        assignments: {},
      }));
    } catch (e) {
      setParseError(
        e instanceof Error ? e.message : "Could not read receipt",
      );
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div className="space-y-6">
      <BillWizardNavBar
        onBack={() => navigate({ to: "/dashboard" })}
        step={1}
        totalSteps={5}
      />
      <section className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow mb-3">Step 1</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-6xl">
          Upload the receipt.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Images are converted to lightweight WebP, stored securely, then parsed
          into line items. You can preview or remove each file before continuing.
        </p>
        <div className="mt-4">
          <LocalDraftDisclosure />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <article className="panel min-w-0 p-6 sm:p-8">
          <input
            accept="image/*,application/pdf,.heic,.heif"
            className="sr-only"
            id={inputId}
            multiple
            onChange={(event) => {
              void replaceOrAddPagesWithFiles(event.target.files, uploadMode);
              event.target.value = "";
            }}
            type="file"
          />

          <button
            className="upload-zone w-full"
            onClick={() => {
              setUploadMode("add");
              document.getElementById(inputId)?.click();
            }}
            type="button"
          >
            <span className="eyebrow">Add receipt pages</span>
            <span className="display mt-3 block text-3xl text-[var(--ink)]">
              PDF, HEIC, PNG, JPEG…
            </span>
            <span className="mt-2 block text-sm text-[var(--muted)]">
              Each file is converted to WebP (&lt;100KB) before upload.
            </span>
          </button>

          <button
            className="secondary-button mt-3 w-full justify-center"
            onClick={() => {
              setUploadMode("replace");
              document.getElementById(inputId)?.click();
            }}
            type="button"
          >
            Replace all pages
          </button>

          {draft?.receipt.pages.length ? (
            <div className="mt-8 grid gap-4">
              {draft.receipt.pages.map((page) => (
                <div className="receipt-row flex-wrap gap-4" key={page.id}>
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <button
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]"
                      onClick={() => window.open(page.ufsUrl, "_blank")}
                      type="button"
                    >
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={page.ufsUrl}
                      />
                    </button>
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--ink)]">{page.label}</p>
                      <p className="text-sm text-[var(--muted)]">Ready</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      className="secondary-button"
                      onClick={() => window.open(page.ufsUrl, "_blank")}
                      type="button"
                    >
                      View
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => removeReceiptPage(page.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {uploadRows.length ? (
            <div className="mt-6 grid gap-4">
              {uploadRows.map((row) => (
                <div className="receipt-row flex-wrap gap-4" key={row.id}>
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    {row.previewUrl ? (
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface-2)]">
                        <img
                          alt=""
                          className="h-full w-full object-cover"
                          src={row.previewUrl}
                        />
                      </div>
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-[var(--line)] text-xs text-[var(--muted)]">
                        …
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--ink)]">{row.label}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {row.status === "converting"
                          ? "Optimizing…"
                          : row.status === "uploading"
                            ? "Uploading…"
                            : row.status === "ready"
                              ? "Ready"
                              : row.error ?? "Error"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      className="secondary-button"
                      disabled={!row.ufsUrl && row.status !== "error"}
                      onClick={() =>
                        window.open(row.ufsUrl ?? row.previewUrl, "_blank")
                      }
                      type="button"
                    >
                      View
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => removeUploadRow(row.id)}
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {parseError ? (
            <p className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {parseError}
            </p>
          ) : null}

          {parsedReceipt ? (
            <div className="mt-8 border-t border-[var(--line)] pt-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="eyebrow mb-2">Receipt parsed</p>
                  <p className="text-sm text-[var(--muted)]">
                    Continue to the next step to review line items in a table and edit
                    them in a mobile-friendly modal.
                  </p>
                </div>
                <button
                  className="secondary-button text-xs"
                  disabled={!canParse || isParsing}
                  onClick={() => void handleParse()}
                  type="button"
                >
                  {isParsing ? "Re-parsing…" : "Re-parse"}
                </button>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.7rem] border border-[var(--line)] bg-[var(--surface-2)] p-5">
                  <p className="eyebrow">Before ({parsedReceipt.currencyCode})</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Subtotal</dt>
                      <dd className="tabular-nums font-semibold text-[var(--ink)]">
                        {computedSubtotalForeign.toFixed(2)} {parsedReceipt.currencyCode}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Tax</dt>
                      <dd className="tabular-nums font-semibold text-[var(--ink)]">
                        {parsedReceipt.taxForeignAmount.toFixed(2)} {parsedReceipt.currencyCode}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Tip</dt>
                      <dd className="tabular-nums font-semibold text-[var(--ink)]">
                        {parsedReceipt.tipForeignAmount.toFixed(2)} {parsedReceipt.currencyCode}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Discount</dt>
                      <dd className="tabular-nums font-semibold text-[var(--ink)]">
                        -{discountForeignAmount.toFixed(2)} {parsedReceipt.currencyCode}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-2">
                      <dt className="font-semibold text-[var(--ink)]">Total</dt>
                      <dd className="tabular-nums font-bold text-[var(--ink)]">
                        {adjustedGrandTotalForeign.toFixed(2)} {parsedReceipt.currencyCode}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-[1.7rem] border border-[var(--line)] bg-[var(--surface-2)] p-5">
                  <p className="eyebrow">After (USD)</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Subtotal</dt>
                      <dd className="tabular-nums font-semibold text-[var(--ink)]">
                        {computedSubtotalUsd.toFixed(2)} USD
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Tax</dt>
                      <dd className="tabular-nums font-semibold text-[var(--ink)]">
                        {parsedReceipt.taxUsdAmount.toFixed(2)} USD
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Tip</dt>
                      <dd className="tabular-nums font-semibold text-[var(--ink)]">
                        {parsedReceipt.tipUsdAmount.toFixed(2)} USD
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-[var(--muted)]">Discount</dt>
                      <dd className="tabular-nums font-semibold text-[var(--ink)]">
                        -{discountUsdAmount.toFixed(2)} USD
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 border-t border-[var(--line)] pt-2">
                      <dt className="font-semibold text-[var(--ink)]">Total</dt>
                      <dd className="tabular-nums font-bold text-[var(--ink)]">
                        {adjustedGrandTotalUsd.toFixed(2)} USD
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <ExchangeRateCard
                onParsedReceiptChange={updateParsedReceipt}
                parsedReceipt={parsedReceipt}
              />
            </div>
          ) : null}
        </article>

        <aside className="panel p-6">
          <p className="eyebrow mb-3">Next</p>
          <ol className="space-y-3 text-sm leading-6 text-[var(--muted)]">
            <li>1. Optimize and upload images.</li>
            <li>2. Review itemized receipt in table view.</li>
            <li>3. Add who split the bill.</li>
          </ol>
          {!parsedReceipt ? (
            <button
              className="primary-button mt-8 w-full justify-center"
              disabled={!canParse}
              onClick={() => void handleParse()}
              type="button"
            >
              {isParsing ? "Parsing…" : "Parse receipt"}
            </button>
          ) : (
            <button
              className="primary-button mt-8 w-full justify-center"
              disabled={!canProceed}
              onClick={() =>
                navigate({
                  to: "/bills/new/itemized",
                })
              }
              type="button"
            >
              Next: itemized receipt
            </button>
          )}
        </aside>
      </section>
    </div>
  );
}
