import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { toPng } from "html-to-image";
import { buildBillSummary } from "../../lib/bill-calculations";
import type { BillDetail } from "../../lib/types";
import { ParticipantPaidBadge } from "./participant-paid-badge";
import { ReceiptPreviewRail } from "./receipt-preview-rail";

type BillSummaryScreenProps = {
  bill: BillDetail;
  eyebrow: string;
  title: string;
  description: string;
  /** When set, hero matches bill wizard steps (badge + layout). */
  wizardStep?: number;
  headerExtras?: ReactNode;
  contentTop?: ReactNode;
  sidePanel: ReactNode;
};

function SplitSpendExportCard({
  bill,
  summary,
}: {
  bill: BillDetail;
  summary: ReturnType<typeof buildBillSummary>;
}) {
  return (
    <div
      className="rounded-2xl border border-neutral-200 bg-white p-5 text-neutral-900 shadow-sm"
      style={{ width: 380, fontFamily: "system-ui, sans-serif" }}
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-neutral-500">
        Split summary
      </p>
      <p className="mt-1 text-lg font-bold leading-tight">{bill.title}</p>
      <p className="mt-0.5 text-sm text-neutral-600">
        Total <span className="font-semibold text-neutral-900">${summary.grandTotal.toFixed(2)}</span>
      </p>
      <ul className="mt-4 space-y-3 border-t border-neutral-100 pt-3">
        {summary.summaries.map(
          ({ participant, total, items, taxTipShare }) => (
            <li className="text-sm" key={participant.id}>
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 font-semibold">{participant.name}</span>
                <span className="shrink-0 tabular-nums font-bold">${total.toFixed(2)}</span>
              </div>
              {items.length > 0 ? (
                <ul className="mt-1.5 space-y-0.5 text-xs text-neutral-600">
                  {items.map(({ item, share }) => (
                    <li className="flex justify-between gap-2" key={item.id}>
                      <span className="min-w-0 truncate">{item.name}</span>
                      <span className="shrink-0 tabular-nums">${share.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {taxTipShare > 0 ? (
                <p className="mt-1 text-[0.7rem] text-neutral-500">
                  Tax & tip share ${taxTipShare.toFixed(2)}
                </p>
              ) : null}
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

export function BillSummaryScreen({
  bill,
  eyebrow,
  title,
  description,
  wizardStep,
  headerExtras,
  contentTop,
  sidePanel,
}: BillSummaryScreenProps) {
  const summary = useMemo(() => buildBillSummary(bill), [bill]);
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportBusy, setExportBusy] = useState<"idle" | "copy" | "file" | "share">("idle");
  const [exportError, setExportError] = useState<string | null>(null);

  const runExport = useCallback(async () => {
    const node = exportRef.current;
    if (!node) {
      return null;
    }
    setExportError(null);
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });
    return dataUrl;
  }, []);

  const copyImage = async () => {
    setExportBusy("copy");
    try {
      const dataUrl = await runExport();
      if (!dataUrl) {
        return;
      }
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Could not copy image");
    } finally {
      setExportBusy("idle");
    }
  };

  const downloadPng = async () => {
    setExportBusy("file");
    try {
      const dataUrl = await runExport();
      if (!dataUrl) {
        return;
      }
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${bill.title.replace(/[^\w\s-]/g, "").slice(0, 40) || "split"}-summary.png`;
      a.click();
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Could not download");
    } finally {
      setExportBusy("idle");
    }
  };

  const shareImage = async () => {
    setExportBusy("share");
    try {
      const dataUrl = await runExport();
      if (!dataUrl) {
        return;
      }
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "split-summary.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: bill.title,
          text: `Split summary — ${bill.title}`,
        });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        return;
      }
      setExportError(e instanceof Error ? e.message : "Could not share");
    } finally {
      setExportBusy("idle");
    }
  };

  const canShareFiles =
    typeof navigator !== "undefined" &&
    typeof navigator.canShare === "function" &&
    typeof File !== "undefined"
      ? (() => {
          try {
            const f = new File([], "t.png", { type: "image/png" });
            return navigator.canShare({ files: [f] });
          } catch {
            return false;
          }
        })()
      : false;

  return (
    <div className={wizardStep != null ? "space-y-5 sm:space-y-6" : "space-y-6"}>
      <div
        aria-hidden
        className="pointer-events-none fixed left-[-10000px] top-0 z-[-1]"
        style={{ width: 380 }}
      >
        <div className="p-1" ref={exportRef}>
          <SplitSpendExportCard bill={bill} summary={summary} />
        </div>
      </div>

      <section
        className={
          wizardStep != null
            ? "hero-panel relative overflow-hidden px-5 py-7 sm:px-9 sm:py-9"
            : "hero-panel px-7 py-8 sm:px-10 sm:py-10"
        }
      >
        {wizardStep != null ? (
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[var(--accent-soft)] blur-3xl sm:h-64 sm:w-64"
          />
        ) : null}
        {wizardStep != null ? (
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white/70 px-2 text-xs font-bold tabular-nums text-[var(--accent)] shadow-sm">
                  {wizardStep}
                </span>
                <span className="eyebrow">{eyebrow}</span>
              </div>
              <h1 className="display text-3xl leading-[1.05] text-[var(--ink)] sm:text-4xl lg:text-[2.75rem]">
                {title}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                {description}
              </p>
            </div>
            {headerExtras ? (
              <div className="w-full shrink-0 lg:max-w-[min(100%,20rem)] lg:text-right">
                {headerExtras}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <p className="eyebrow mb-3">{eyebrow}</p>
            <h1 className="display text-4xl text-[var(--ink)] sm:text-6xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
              {description}
            </p>
            {headerExtras ? <div className="mt-4">{headerExtras}</div> : null}
          </>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <article className="panel min-w-0 p-5 sm:p-6">
          <div className="bill-total-card !p-4 sm:!p-5">
            <p className="eyebrow">Receipt total</p>
            <p className="display mt-2 text-4xl text-[var(--ink)] sm:text-5xl">
              ${summary.grandTotal.toFixed(2)}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="rounded-[1.1rem] border border-[var(--line)] bg-white/70 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                  Items
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">
                  ${summary.itemsSubtotal.toFixed(2)}
                </p>
              </div>
              <div className="rounded-[1.1rem] border border-[var(--line)] bg-white/70 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                  Tax & tip
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">
                  ${summary.taxAndTip.toFixed(2)}
                </p>
              </div>
              <div className="rounded-[1.1rem] border border-[var(--line)] bg-white/70 px-3 py-2">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                  People
                </p>
                <p className="mt-0.5 text-sm font-semibold text-[var(--ink)]">
                  {summary.summaries.length}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="secondary-button px-3 py-2 text-sm"
              disabled={exportBusy !== "idle"}
              onClick={() => void copyImage()}
              type="button"
            >
              {exportBusy === "copy" ? "Copying…" : "Copy split image"}
            </button>
            <button
              className="secondary-button px-3 py-2 text-sm"
              disabled={exportBusy !== "idle"}
              onClick={() => void downloadPng()}
              type="button"
            >
              {exportBusy === "file" ? "Saving…" : "Download PNG"}
            </button>
            {canShareFiles ? (
              <button
                className="secondary-button px-3 py-2 text-sm"
                disabled={exportBusy !== "idle"}
                onClick={() => void shareImage()}
                type="button"
              >
                {exportBusy === "share" ? "Sharing…" : "Share image"}
              </button>
            ) : null}
          </div>
          {exportError ? (
            <p className="mt-2 text-xs text-rose-700">{exportError}</p>
          ) : null}

          {contentTop ? <div className="mt-5">{contentTop}</div> : null}

          <div className="mt-5 grid gap-3">
            {summary.summaries.map(
              ({ participant, total, items, taxTipShare, itemSubtotal }) => {
                const isExpanded = expandedIds[participant.id] ?? false;
                const itemCount = items.length;

                return (
                  <article
                    className="bill-card !p-3.5 sm:!p-4"
                    key={participant.id}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="avatar-badge h-9 w-9 text-[0.65rem]"
                            style={{ backgroundColor: participant.color }}
                          >
                            {participant.initials}
                          </span>
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-[var(--ink)]">
                              {participant.name}
                              <ParticipantPaidBadge isSelf={participant.isSelf} />
                            </p>
                            <p className="text-xs text-[var(--muted)]">
                              {itemCount === 0
                                ? "No items assigned"
                                : `${itemCount} item${itemCount === 1 ? "" : "s"} · items $${itemSubtotal.toFixed(2)}`}
                              {taxTipShare > 0
                                ? ` · tax/tip $${taxTipShare.toFixed(2)}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <p className="display text-2xl leading-none text-[var(--ink)] sm:text-3xl">
                          ${total.toFixed(2)}
                        </p>
                        {items.length > 0 ? (
                          <button
                            className="mt-1.5 text-xs font-semibold text-[var(--accent)]"
                            onClick={() =>
                              setExpandedIds((current) => ({
                                ...current,
                                [participant.id]: !isExpanded,
                              }))
                            }
                            type="button"
                          >
                            {isExpanded ? "Hide line items" : "Line items"}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {isExpanded && items.length > 0 ? (
                      <div className="mt-3 space-y-1 border-t border-[var(--line)] pt-3 text-sm">
                        {items.map((entry) => (
                          <div className="receipt-row !py-1.5 !px-0" key={entry.item.id}>
                            <span className="text-[var(--muted)]">{entry.item.name}</span>
                            <span className="font-semibold tabular-nums text-[var(--ink)]">
                              ${entry.share.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              },
            )}
          </div>
        </article>

        <div className="space-y-6">
          {sidePanel}
          <ReceiptPreviewRail
            compact
            imageNames={bill.imageNames}
            receiptImageUrls={bill.receiptImageUrls}
            title={bill.title}
          />
        </div>
      </section>
    </div>
  );
}
