import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { buildBillSummary } from "../../lib/bill-calculations";
import { fairShareQueries } from "../../lib/queries";
import type { BillDetail, BillId } from "../../lib/types";

export function SharePage({
  billId,
  initialBill,
}: {
  billId: BillId;
  initialBill: BillDetail;
}) {
  const [copied, setCopied] = useState(false);
  const billQuery = useQuery({
    ...fairShareQueries.bills.detail(billId),
    initialData: initialBill,
  });
  const bill = billQuery.data ?? initialBill;
  const summary = buildBillSummary(bill);

  const copySummary = async () => {
    const text = summary.summaries
      .map(
        ({ participant, total }) =>
          `${participant.name}: $${total.toFixed(2)}`,
      )
      .join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2_000);
  };

  return (
    <div className="space-y-6">
      <section className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow mb-3">Confirmed</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-6xl">
          The split is ready to send.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Copy the summary, paste it into the group chat, and keep the totals
          clean for everyone at the table.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <article className="share-panel p-6 sm:p-8">
          <p className="eyebrow">Split summary</p>
          <div className="mt-6 grid gap-4">
            {summary.summaries.map(({ participant, total }) => (
              <div className="receipt-row" key={participant.id}>
                <span className="flex items-center gap-3">
                  <span
                    className="avatar-badge h-11 w-11 text-xs"
                    style={{ backgroundColor: participant.color }}
                  >
                    {participant.initials}
                  </span>
                  <span className="font-semibold text-white">{participant.name}</span>
                </span>
                <span className="display text-3xl text-white">
                  ${total.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </article>

        <aside className="panel p-6">
          <p className="eyebrow mb-3">Share actions</p>
          <button className="primary-button w-full justify-center" onClick={copySummary}>
            {copied ? "Copied!" : "Copy summary"}
          </button>
          <div className="mt-4 rounded-[1.6rem] border border-[var(--line)] bg-[var(--surface-2)] p-4">
            <p className="text-sm leading-6 text-[var(--muted)]">
              Totals stay synced with your saved bill — what you reviewed is what
              you share.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
