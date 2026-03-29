import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { useIsMobile } from "../../hooks/use-mobile";

type ReceiptPreviewRailProps = {
  receiptImageUrls: string[];
  imageNames?: string[];
  title?: string;
  /** Tighter layout, smaller preview — for step headers */
  compact?: boolean;
};

const getReceiptLabel = (imageNames: string[] | undefined, index: number) =>
  imageNames?.[index] ?? `Receipt page ${index + 1}`;

export function ReceiptPreviewRail({
  receiptImageUrls,
  imageNames,
  title = "Receipt preview",
  compact = false,
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
    ? "panel h-fit p-3 sm:p-4"
    : "panel h-fit p-4 sm:p-5 lg:sticky lg:top-6";
  const imgMaxClass = compact ? "max-h-[10rem]" : "max-h-[28rem]";
  const thumbClass = compact
    ? "h-12 w-12 shrink-0 rounded-lg object-cover"
    : "h-20 w-full object-cover";

  return (
    <>
      <aside className={panelClass}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`eyebrow ${compact ? "mb-1 text-[0.65rem]" : "mb-2"}`}>Receipt</p>
            <p
              className={`font-semibold text-[var(--ink)] ${compact ? "truncate text-sm" : ""}`}
            >
              {title}
            </p>
            <p className={`text-[var(--muted)] ${compact ? "mt-0.5 text-xs" : "mt-1 text-sm"}`}>
              {selected.label}
            </p>
          </div>
          <button
            className={compact ? "secondary-button shrink-0 px-2.5 py-1.5 text-xs" : "secondary-button"}
            onClick={() => setOpen(true)}
            type="button"
          >
            {isMobile ? "Open" : "Expand"}
          </button>
        </div>

        <div
          className={
            compact
              ? "mt-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : ""
          }
        >
          <button
            className={`${compact ? "min-w-0 flex-1" : "mt-4 w-full"} block overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--surface-2)] ${compact ? "max-w-[min(100%,14rem)]" : ""}`}
            onClick={() => setOpen(true)}
            type="button"
          >
            <img
              alt={selected.label}
              className={`h-full w-full object-contain ${imgMaxClass}`}
              src={selected.url}
            />
          </button>

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
          ) : (
            <div className="flex shrink-0 gap-1.5">
              {pages.map((page, index) => (
                <button
                  className={`size-12 shrink-0 overflow-hidden rounded-lg border ${index === selectedIndex ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft)]" : "border-[var(--line)]"}`}
                  key={page.url}
                  onClick={() => setSelectedIndex(index)}
                  type="button"
                >
                  <img alt={page.label} className="h-full w-full object-cover" src={page.url} />
                </button>
              ))}
            </div>
          )}
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
            className="secondary-button mt-3 w-full justify-center py-2 text-xs"
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
        </DialogContent>
      </Dialog>
    </>
  );
}
