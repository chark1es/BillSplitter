import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { fairShareQueries } from "../../lib/queries";
import type { DashboardBill } from "../../lib/types";
import { useReopenBillForEditing } from "../bills/use-reopen-bill-for-editing";
import { useStartNewBill } from "../bills/use-start-new-bill";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value);

const formatDate = (value: number) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));

export function DashboardPage({ initialBills }: { initialBills: DashboardBill[] }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const reopenBillForEditing = useReopenBillForEditing();
  const startNewBill = useStartNewBill();
  const billsQuery = useQuery({
    ...fairShareQueries.bills.list(),
    initialData: initialBills,
  });

  const bills = billsQuery.data ?? [];
  const draftCount = bills.filter((bill) => bill.status === "draft").length;
  const confirmedCount = bills.filter((bill) => bill.status === "confirmed").length;

  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const deleteDraftMutation = useMutation({
    mutationFn: useConvexMutation(api.bills.deleteDraftBill),
    onSuccess: () => {
      setCleanupMessage(null);
      queryClient.invalidateQueries({
        queryKey: fairShareQueries.bills.list().queryKey,
      });
    },
  });

  const cleanupDraftsMutation = useMutation({
    mutationFn: useConvexMutation(api.bills.deleteExpiredDraftsForViewer),
    onSuccess: (data) => {
      const deletedCount = (data as { deletedCount?: number }).deletedCount ?? 0;
      setCleanupMessage(
        deletedCount > 0
          ? `Deleted ${deletedCount} expired draft${deletedCount === 1 ? "" : "s"}.`
          : "No expired drafts to delete."
      );
      queryClient.invalidateQueries({
        queryKey: fairShareQueries.bills.list().queryKey,
      });
    },
    onError: () => setCleanupMessage("Could not clean up drafts."),
  });

  const openBill = (bill: DashboardBill) => {
    if (bill.status === "confirmed") {
      navigate({
        to: "/bills/$billId/share",
        params: { billId: bill.id },
      });
      return;
    }

    // In-progress splits are browser-local drafts; Convex "draft" rows are legacy.
    window.alert(
      "In-progress splits are saved only in this browser. Open “New bill” to continue your local draft.",
    );
    navigate({ to: "/bills/new/upload" });
  };

  return (
    <div className="space-y-6">
      <section className="hero-panel overflow-hidden px-7 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow mb-3">Dashboard</p>
            <h1 className="display text-4xl text-[var(--ink)] sm:text-6xl">
              Dinner drafts, kept in motion.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
              Saved bills stay in sync — leave mid-split and pick up exactly where
              you stopped.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="primary-button"
              onClick={startNewBill}
              type="button"
            >
              Start a new bill
            </button>
            <button
              className="secondary-button"
              disabled={cleanupDraftsMutation.isPending}
              onClick={() => {
                const ok = window.confirm(
                  "Delete drafts older than 30 days for your account?",
                );
                if (!ok) return;
                setCleanupMessage(null);
                cleanupDraftsMutation.mutate({});
              }}
              type="button"
            >
              {cleanupDraftsMutation.isPending
                ? "Cleaning..."
                : "Clean up old drafts"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Draft bills", draftCount.toString()],
          ["Confirmed bills", confirmedCount.toString()],
          ["Tracked total", formatMoney(bills.reduce((sum, bill) => sum + bill.grandTotal, 0))],
        ].map(([label, value]) => (
          <article key={label} className="panel p-5">
            <p className="eyebrow mb-3">{label}</p>
            <p className="display text-4xl text-[var(--ink)]">{value}</p>
          </article>
        ))}
      </section>

      {cleanupMessage ? (
        <p className="mt-1 text-sm text-[var(--muted)]">{cleanupMessage}</p>
      ) : null}

      <section className="panel p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">Recent bills</p>
            <h2 className="display text-3xl text-[var(--ink)]">Keep a night moving forward.</h2>
          </div>
        </div>

        {bills.length === 0 ? (
          <div className="mt-8 rounded-[1.7rem] border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-6 py-10 text-center">
            <p className="display text-3xl text-[var(--ink)]">No bills yet.</p>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
              Upload a receipt to start a draft and walk it through the flow.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            {bills.map((bill) => (
              <article key={bill.id} className="bill-card">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="display text-2xl text-[var(--ink)]">{bill.title}</p>
                      <span className={`status-pill ${bill.status === "confirmed" ? "is-confirmed" : ""}`}>
                        {bill.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Updated {formatDate(bill.updatedAt)} • {bill.participantCount} people • {bill.itemCount} items
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-full bg-[var(--surface-2)] px-4 py-2 text-sm font-semibold text-[var(--ink)]">
                      {formatMoney(bill.grandTotal)}
                    </div>
                    {bill.status === "draft" ? (
                      <button
                        className="secondary-button text-rose-700"
                        disabled={deleteDraftMutation.isPending}
                        onClick={() => {
                          const ok = window.confirm("Delete this draft bill?");
                          if (!ok) return;
                          deleteDraftMutation.mutate({ billId: bill.id });
                        }}
                        type="button"
                      >
                        Delete
                      </button>
                    ) : null}
                    {bill.status === "confirmed" ? (
                      <button
                        className="secondary-button"
                        onClick={() => void reopenBillForEditing(bill.id)}
                        type="button"
                      >
                        Edit bill
                      </button>
                    ) : null}
                    <button
                      className="secondary-button"
                      onClick={() => openBill(bill)}
                      type="button"
                    >
                      {bill.status === "confirmed"
                        ? "Open share screen"
                        : `Continue ${bill.nextStep}`}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
