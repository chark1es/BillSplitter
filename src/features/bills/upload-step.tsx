import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { ClipboardPaste, ImagePlus, MousePointer2, Upload } from "lucide-react";
import { parseReceiptFromUrls } from "../../lib/ai/parse-receipt.fn";
import { convertReceiptFileToWebp } from "../../lib/receipt/image-to-webp";
import {
  calculateParsedReceiptGrandTotalForeign,
  calculateParsedReceiptGrandTotalUsd,
  calculateParsedReceiptSubtotalForeign,
  calculateParsedReceiptSubtotalUsd,
} from "../../lib/receipt/receipt-totals";
import { useUploadThing } from "../../lib/uploadthing";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import { LocalDraftDisclosure } from "./local-draft-disclosure";
import { BillWizardHero } from "./bill-wizard-hero";
import { BillWizardNavBar } from "./bill-wizard-nav";
import { ExchangeRateCard } from "./exchange-rate-card";
import { useBillWizardRoutePreload } from "./bill-wizard-routing";
import { cn } from "../../lib/utils";

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
  useBillWizardRoutePreload("/bills/new/upload");

  const { draft, ensureDraft, patchDraft } = useActiveBillDraft();
  useEffect(() => {
    ensureDraft();
  }, [ensureDraft]);

  const [uploadRows, setUploadRows] = useState<PreviewRow[]>([]);
  const [uploadMode, setUploadMode] = useState<"add" | "replace">("add");
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const dragDepthRef = useRef(0);
  const suppressNextZoneClickRef = useRef(false);
  const uploadModeRef = useRef(uploadMode);
  uploadModeRef.current = uploadMode;

  const { startUpload, isUploading } = useUploadThing("receiptImage");

  const parsedReceipt = draft?.receipt.parsed ?? null;
  const readyUrls = useMemo(
    () => (draft?.receipt.pages ?? []).map((p) => p.ufsUrl),
    [draft?.receipt.pages],
  );

  const canParse =
    readyUrls.length > 0 && uploadRows.length === 0 && !isUploading && !isParsing;

  const computedSubtotalUsd = parsedReceipt
    ? calculateParsedReceiptSubtotalUsd(parsedReceipt)
    : 0;
  const computedSubtotalForeign = parsedReceipt
    ? calculateParsedReceiptSubtotalForeign(parsedReceipt)
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
  const adjustedGrandTotalForeign = parsedReceipt
    ? calculateParsedReceiptGrandTotalForeign({
        ...parsedReceipt,
        discountForeignAmount,
      })
    : 0;
  const adjustedGrandTotalUsd = parsedReceipt
    ? calculateParsedReceiptGrandTotalUsd({
        ...parsedReceipt,
        discountUsdAmount,
      })
    : 0;

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

  const replaceOrAddPagesWithFiles = useCallback(
    async (fileList: FileList | File[] | null, mode: "add" | "replace") => {
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
    },
    [patchDraft, startUpload],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable='true']")) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items?.length) {
        return;
      }
      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f) {
            files.push(f);
          }
        }
      }
      if (files.length === 0) {
        return;
      }
      e.preventDefault();
      void replaceOrAddPagesWithFiles(files, uploadModeRef.current);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [replaceOrAddPagesWithFiles]);

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

  const openFilePicker = () => {
    document.getElementById(inputId)?.click();
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current -= 1;
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    suppressNextZoneClickRef.current = true;
    requestAnimationFrame(() => {
      suppressNextZoneClickRef.current = false;
    });
    void replaceOrAddPagesWithFiles(e.dataTransfer.files, uploadMode);
  };

  const handleUploadZoneClick = () => {
    if (suppressNextZoneClickRef.current) {
      return;
    }
    openFilePicker();
  };

  const pageCount = draft?.receipt.pages.length ?? 0;
  const isUploadActive = isUploading || uploadRows.length > 0;

  return (
    <div className="space-y-5 px-1 sm:space-y-6 sm:px-0">
      <BillWizardNavBar
        currentPath="/bills/new/upload"
        onBack={() => navigate({ to: "/dashboard", viewTransition: true })}
        step={1}
        totalSteps={5}
      />
      <BillWizardHero
        description="Drop, paste, or browse. Images are compressed to WebP before upload; tap parse when your pages are ready."
        eyebrow="Receipt"
        step={1}
        title="Upload the receipt."
        trailing={<LocalDraftDisclosure />}
      />

      <section className="grid gap-5 lg:grid-cols-[1fr_18rem] lg:items-start lg:gap-6">
        <article className="panel min-w-0 p-5 sm:p-7">
          <div className="mb-5 flex flex-col gap-3 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-lg text-[var(--ink)]">Receipt pages</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {pageCount === 0
                  ? "No pages yet — add one or more images or a PDF."
                  : `${pageCount} page${pageCount === 1 ? "" : "s"} ready`}
              </p>
            </div>
            <div
              className="inline-flex rounded-full border border-[var(--line)] bg-[var(--surface-2)] p-1"
              role="group"
              aria-label="Whether new files add pages or replace all"
            >
              <button
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
                  uploadMode === "add"
                    ? "bg-white text-[var(--ink)] shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--ink)]",
                )}
                onClick={() => setUploadMode("add")}
                type="button"
              >
                Add
              </button>
              <button
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition-colors",
                  uploadMode === "replace"
                    ? "bg-white text-[var(--ink)] shadow-sm"
                    : "text-[var(--muted)] hover:text-[var(--ink)]",
                )}
                onClick={() => setUploadMode("replace")}
                type="button"
              >
                Replace all
              </button>
            </div>
          </div>

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

          <div
            aria-label="Upload receipt files"
            className={cn(
              "upload-zone w-full border-2 border-dashed border-[var(--line)] bg-[var(--surface-2)]/80",
              isDragging && "upload-zone--drag",
              isUploadActive && "upload-zone--compact",
            )}
            onClick={handleUploadZoneClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openFilePicker();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div
              className={cn(
                "flex flex-col items-start gap-4",
                !isUploadActive && "sm:flex-row sm:items-center sm:gap-5",
              )}
            >
              {!isUploadActive ? (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[var(--line)] bg-white/80 text-[var(--accent)] shadow-sm">
                  <ImagePlus aria-hidden className="size-7" strokeWidth={1.75} />
                </div>
              ) : null}
              <div className="min-w-0 flex-1 text-left">
                <span className="eyebrow">
                  {uploadMode === "replace" ? "Replace with new files" : "Add receipt pages"}
                </span>
                <span className="display mt-2 block text-2xl text-[var(--ink)] sm:text-3xl">
                  {isDragging ? "Drop to upload" : "PDF, HEIC, PNG, JPEG…"}
                </span>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--muted)] sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1">
                  <li className="flex items-center gap-2">
                    <Upload aria-hidden className="size-4 shrink-0 opacity-70" />
                    Drag and drop files
                  </li>
                  <li className="flex items-center gap-2">
                    <ClipboardPaste aria-hidden className="size-4 shrink-0 opacity-70" />
                    Paste image from clipboard
                  </li>
                  <li className="flex items-center gap-2">
                    <MousePointer2 aria-hidden className="size-4 shrink-0 opacity-70" />
                    Click to browse
                  </li>
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-[var(--muted)]/90">
                  Each file is converted to WebP (&lt;100KB) before upload.{" "}
                  <span className="font-medium text-[var(--muted)]">
                    {uploadMode === "replace"
                      ? "Existing pages are cleared when upload starts."
                      : "New pages append to the list."}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {draft?.receipt.pages.length ? (
            <div className="mt-4 divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] bg-white/45">
              {draft.receipt.pages.map((page) => (
                <div
                  className="flex items-center gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-3"
                  key={page.id}
                >
                  <button
                    className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-2)] sm:h-12 sm:w-12"
                    onClick={() => window.open(page.ufsUrl, "_blank")}
                    type="button"
                  >
                    <img
                      alt=""
                      className="h-full w-full object-cover"
                      src={page.ufsUrl}
                    />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--ink)]">{page.label}</p>
                    <p className="text-[0.65rem] text-[var(--muted)]">Ready</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
                    <button
                      className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                      onClick={() => window.open(page.ufsUrl, "_blank")}
                      type="button"
                    >
                      View
                    </button>
                    <button
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-rose-50 hover:text-rose-800"
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
            <div className="mt-3 divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] border-dashed bg-[var(--surface-2)]/60">
              {uploadRows.map((row) => (
                <div
                  className="flex items-center gap-2.5 px-2.5 py-2 sm:gap-3 sm:px-3"
                  key={row.id}
                >
                  {row.previewUrl ? (
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--surface-2)] sm:h-12 sm:w-12">
                      <img
                        alt=""
                        className="h-full w-full object-cover"
                        src={row.previewUrl}
                      />
                    </div>
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--line)] text-[0.65rem] text-[var(--muted)] sm:h-12 sm:w-12">
                      …
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--ink)]">{row.label}</p>
                    <p className="text-[0.65rem] text-[var(--muted)]">
                      {row.status === "converting"
                        ? "Optimizing…"
                        : row.status === "uploading"
                          ? "Uploading…"
                          : row.status === "ready"
                            ? "Ready"
                            : row.error ?? "Error"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      className="rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-40"
                      disabled={!row.ufsUrl && row.status !== "error"}
                      onClick={() =>
                        window.open(row.ufsUrl ?? row.previewUrl, "_blank")
                      }
                      type="button"
                    >
                      View
                    </button>
                    <button
                      className="rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--muted)] hover:bg-rose-50 hover:text-rose-800"
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
            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="eyebrow text-[0.65rem]">Parsed</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    Totals from the receipt — refine line items on the next step.
                  </p>
                </div>
                <button
                  className="secondary-button shrink-0 self-start text-xs sm:self-auto"
                  disabled={!canParse || isParsing}
                  onClick={() => void handleParse()}
                  type="button"
                >
                  {isParsing ? "Re-parsing…" : "Re-parse"}
                </button>
              </div>

              <ExchangeRateCard
                onParsedReceiptChange={updateParsedReceipt}
                parsedReceipt={parsedReceipt}
              />

              <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface-2)] px-3 py-3 sm:px-4">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  Receipt math
                </p>
                <div className="mt-2 grid gap-3 text-xs sm:grid-cols-2 sm:gap-6">
                  <dl className="space-y-1">
                    <div className="flex justify-between gap-3 tabular-nums">
                      <dt className="text-[var(--muted)]">Sub</dt>
                      <dd className="font-medium text-[var(--ink)]">
                        {computedSubtotalForeign.toFixed(2)} {parsedReceipt.currencyCode}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 tabular-nums">
                      <dt className="text-[var(--muted)]">+Tax</dt>
                      <dd>{parsedReceipt.taxForeignAmount.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 tabular-nums">
                      <dt className="text-[var(--muted)]">+Tip</dt>
                      <dd>{parsedReceipt.tipForeignAmount.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 tabular-nums">
                      <dt className="text-[var(--muted)]">−Disc</dt>
                      <dd>{discountForeignAmount.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-[var(--line)] pt-1 tabular-nums">
                      <dt className="font-semibold text-[var(--ink)]">Σ</dt>
                      <dd className="font-bold text-[var(--ink)]">
                        {adjustedGrandTotalForeign.toFixed(2)} {parsedReceipt.currencyCode}
                      </dd>
                    </div>
                  </dl>
                  <dl className="space-y-1">
                    <div className="flex justify-between gap-3 tabular-nums">
                      <dt className="text-[var(--muted)]">Sub</dt>
                      <dd className="font-medium text-[var(--ink)]">
                        {computedSubtotalUsd.toFixed(2)} USD
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 tabular-nums">
                      <dt className="text-[var(--muted)]">+Tax</dt>
                      <dd>{parsedReceipt.taxUsdAmount.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 tabular-nums">
                      <dt className="text-[var(--muted)]">+Tip</dt>
                      <dd>{parsedReceipt.tipUsdAmount.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 tabular-nums">
                      <dt className="text-[var(--muted)]">−Disc</dt>
                      <dd>{discountUsdAmount.toFixed(2)}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-[var(--line)] pt-1 tabular-nums">
                      <dt className="font-semibold text-[var(--ink)]">Σ</dt>
                      <dd className="font-bold text-[var(--ink)]">
                        {adjustedGrandTotalUsd.toFixed(2)} USD
                      </dd>
                    </div>
                  </dl>
                </div>
                <p className="mt-2 text-[0.65rem] leading-snug text-[var(--muted)]">
                  USD amounts use the snapshot rate above; changing FX updates item USD
                  values elsewhere in the flow.
                </p>
              </div>
            </div>
          ) : null}
        </article>

        <aside className="panel flex flex-col p-5 sm:p-6 lg:sticky lg:top-5">
          <p className="eyebrow mb-3 text-[0.65rem]">What&apos;s next</p>
          <ol className="space-y-3.5 text-sm leading-relaxed text-[var(--muted)]">
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums text-[var(--accent)]">
                1
              </span>
              <span>Optimize and upload your receipt pages.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums text-[var(--accent)]">
                2
              </span>
              <span>Review and edit line items in the table.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold tabular-nums text-[var(--accent)]">
                3
              </span>
              <span>Add everyone who split the bill.</span>
            </li>
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
                  viewTransition: true,
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
