import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Button } from "#/components/ui/button";
import { useIsMobile } from "../../hooks/use-mobile";

type ReceiptPreviewRailProps = {
  receiptImageUrls: string[];
  imageNames?: string[];
  title?: string;
  /** Tighter layout, smaller preview — for step headers */
  compact?: boolean;
  /**
   * When compact: one preview only (no thumbnail strip). Multi-page via prev/next.
   * Use on itemized step so the panel isn’t split into two image areas.
   */
  compactSinglePreview?: boolean;
};

const getReceiptLabel = (imageNames: string[] | undefined, index: number) =>
  imageNames?.[index] ?? `Receipt page ${index + 1}`;

export function ReceiptPreviewRail({
  receiptImageUrls,
  imageNames,
  title = "Receipt preview",
  compact = false,
  compactSinglePreview = false,
}: ReceiptPreviewRailProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  const pages = useMemo(
    () =>
      receiptImageUrls.map((url, index) => ({
        url,
        label: getReceiptLabel(imageNames, index),
      })),
    [imageNames, receiptImageUrls],
  );

  if (pages.length === 0) {
    return null;
  }

  const selected = pages[Math.min(selectedIndex, pages.length - 1)] ?? pages[0];
  if (!selected) {
    return null;
  }

  const panelClass = compact
    ? "panel h-fit max-w-full p-2.5 sm:p-3"
    : "panel h-fit p-4 sm:p-5 lg:sticky lg:top-6";
  const imgMaxClass =
    compact && compactSinglePreview
      ? "max-h-36 w-full object-contain sm:max-h-44"
      : compact
        ? "max-h-20 sm:max-h-24"
        : "max-h-[28rem]";
  const thumbClass = compact
    ? "h-9 w-9 shrink-0 rounded-md object-cover"
    : "h-20 w-full object-cover";

  const showThumbStrip = compact ? !compactSinglePreview : true;
  const singleNav = compact && compactSinglePreview && pages.length > 1;

  const goPrev = () => {
    setSelectedIndex((i) => (i - 1 + pages.length) % pages.length);
  };
  const goNext = () => {
    setSelectedIndex((i) => (i + 1) % pages.length);
  };

  return (
    <>
      <aside className={panelClass}>
        <div className={`flex items-start justify-between gap-2 ${compact ? "gap-3" : ""}`}>
          <div className="min-w-0">
            <p className={`eyebrow ${compact ? "mb-0.5 text-[0.6rem]" : "mb-2"}`}>Receipt</p>
            <p
              className={`font-semibold text-[var(--ink)] ${compact ? "truncate text-xs leading-snug sm:text-sm" : ""}`}
            >
              {title}
            </p>
            <p
              className={`text-[var(--muted)] ${compact ? "mt-0.5 line-clamp-1 text-[0.65rem]" : "mt-1 text-sm"}`}
            >
              {selected.label}
            </p>
          </div>
          <button
            className={
              compact
                ? "secondary-button shrink-0 px-2 py-1.5 text-[0.65rem] font-semibold sm:px-2.5 sm:text-xs"
                : "secondary-button"
            }
            onClick={() => setOpen(true)}
            type="button"
          >
            {isMobile ? "Open" : "Expand"}
          </button>
        </div>

        <div
          className={
            compact && !compactSinglePreview
              ? "mt-2.5 flex items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : compactSinglePreview
                ? "mt-2.5"
                : ""
          }
        >
          <button
            className={`${
              compact && compactSinglePreview
                ? "mt-0 min-h-[9rem] w-full sm:min-h-[11rem]"
                : compact
                  ? "h-[5.25rem] w-[6.75rem] shrink-0 sm:h-24 sm:w-[7.25rem]"
                  : "mt-4 w-full"
            } block overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface-2)] sm:rounded-2xl`}
            onClick={() => setOpen(true)}
            type="button"
          >
            <img
              alt={selected.label}
              className={`mx-auto h-full w-full object-contain ${imgMaxClass}`}
              src={selected.url}
            />
          </button>

          {singleNav ? (
            <div className="mt-2 flex items-center justify-center gap-1 sm:gap-2">
              <Button
                aria-label="Previous receipt page"
                className="size-8 shrink-0 rounded-full border-[var(--line)] bg-white/80 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                type="button"
                variant="outline"
              >
                <ChevronLeft aria-hidden className="size-4" />
              </Button>
              <span className="min-w-[4.5rem] text-center text-[0.7rem] font-semibold tabular-nums text-[var(--muted)] sm:text-xs">
                {selectedIndex + 1} / {pages.length}
              </span>
              <Button
                aria-label="Next receipt page"
                className="size-8 shrink-0 rounded-full border-[var(--line)] bg-white/80 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                type="button"
                variant="outline"
              >
                <ChevronRight aria-hidden className="size-4" />
              </Button>
            </div>
          ) : null}

          {!compact ? (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {pages.map((page, index) => (
                <button
                  className={`overflow-hidden rounded-[1rem] border ${index === selectedIndex ? "border-[var(--accent)] shadow-[0_0_0_2px_var(--accent-soft)]" : "border-[var(--line)]"}`}
                  key={page.url}
                  onClick={() => setSelectedIndex(index)}
                  type="button"
                >
                  <img alt={page.label} className={thumbClass} src={page.url} />
                </button>
              ))}
            </div>
          ) : showThumbStrip ? (
            <div className="flex min-w-0 shrink-0 gap-1">
              {pages.map((page, index) => (
                <button
                  className={`h-9 w-9 shrink-0 overflow-hidden rounded-md border sm:h-10 sm:w-10 ${index === selectedIndex ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]" : "border-[var(--line)]"}`}
                  key={page.url}
                  onClick={() => setSelectedIndex(index)}
                  type="button"
                >
                  <img alt={page.label} className="h-full w-full object-cover" src={page.url} />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {!compact ? (
          <button
            className="secondary-button mt-4 w-full justify-center"
            onClick={() => window.open(selected.url, "_blank", "noopener,noreferrer")}
            type="button"
          >
            Open full size
          </button>
        ) : (
          <button
            className="secondary-button mt-2 w-full justify-center py-1.5 text-[0.7rem] font-semibold sm:py-2 sm:text-xs"
            onClick={() => window.open(selected.url, "_blank", "noopener,noreferrer")}
            type="button"
          >
            Open full size
          </button>
        )}
      </aside>

      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent className="max-w-5xl border-[var(--line)] bg-[var(--surface)] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{selected.label}</DialogTitle>
          </DialogHeader>
          {compactSinglePreview ? (
            <div className="flex flex-col gap-3">
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-2)]">
                <img
                  alt={selected.label}
                  className="max-h-[75vh] w-full object-contain"
                  src={selected.url}
                />
              </div>
              {pages.length > 1 ? (
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <Button
                    aria-label="Previous receipt page"
                    className="size-9 rounded-full border-[var(--line)] bg-white/80"
                    onClick={goPrev}
                    type="button"
                    variant="outline"
                  >
                    <ChevronLeft aria-hidden className="size-4" />
                  </Button>
                  <span className="min-w-[5rem] text-center text-sm font-semibold tabular-nums text-[var(--muted)]">
                    Page {selectedIndex + 1} of {pages.length}
                  </span>
                  <Button
                    aria-label="Next receipt page"
                    className="size-9 rounded-full border-[var(--line)] bg-white/80"
                    onClick={goNext}
                    type="button"
                    variant="outline"
                  >
                    <ChevronRight aria-hidden className="size-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_8rem]">
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-2)]">
                <img
                  alt={selected.label}
                  className="max-h-[75vh] w-full object-contain"
                  src={selected.url}
                />
              </div>
              <div className="grid max-h-[75vh] grid-cols-2 gap-2 overflow-auto lg:grid-cols-1">
                {pages.map((page, index) => (
                  <button
                    className={`overflow-hidden rounded-[1rem] border ${index === selectedIndex ? "border-[var(--accent)] shadow-[0_0_0_2px_var(--accent-soft)]" : "border-[var(--line)]"}`}
                    key={`${page.url}-dialog`}
                    onClick={() => setSelectedIndex(index)}
                    type="button"
                  >
                    <img
                      alt={page.label}
                      className="h-24 w-full object-cover"
                      src={page.url}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
