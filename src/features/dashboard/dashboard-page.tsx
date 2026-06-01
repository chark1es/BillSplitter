import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { useMemo, useState } from "react";
import { fairShareQueries } from "../../lib/queries";
import type { DashboardBill } from "../../lib/types";
import { PageHeader } from "../../components/layout/page-header";
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
    year: "numeric",
  }).format(new Date(value));

type BillFilter = "all" | "draft" | "confirmed";

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
  const [filter, setFilter] = useState<BillFilter>("all");
  const [search, setSearch] = useState("");
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  const draftCount = bills.filter((bill) => bill.status === "draft").length;
  const confirmedCount = bills.filter((bill) => bill.status === "confirmed").length;
  const trackedTotal = bills.reduce((sum, bill) => sum + bill.grandTotal, 0);

  const filteredBills = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bills.filter((bill) => {
      if (filter !== "all" && bill.status !== filter) return false;
      if (!q) return true;
      return bill.title.toLowerCase().includes(q);
    });
  }, [bills, filter, search]);

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
          : "No expired drafts to delete.",
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

    window.alert(
      "In-progress splits are saved only in this browser. Open “New bill” to continue your local draft.",
    );
    navigate({ to: "/bills/new/upload" });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Your bills"
        description="Pick up a split or start a new one from a receipt."
        actions={
          <>
            <button className="primary-button" onClick={startNewBill} type="button">
              New bill
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
              {cleanupDraftsMutation.isPending ? "Cleaning…" : "Clean old drafts"}
            </button>
          </>
        }
      />

      <p className="stat-inline -mt-2">
        <span>
          <strong>{draftCount}</strong> drafts
        </span>
        <span>
          <strong>{confirmedCount}</strong> saved
        </span>
        <span>
          <strong>{formatMoney(trackedTotal)}</strong> total tracked
        </span>
      </p>

      {cleanupMessage ? (
        <p className="text-sm text-[var(--muted)]">{cleanupMessage}</p>
      ) : null}

      <section className="panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="filter-tabs" role="tablist" aria-label="Filter bills">
            {(
              [
                ["all", "All"],
                ["draft", "Drafts"],
                ["confirmed", "Saved"],
              ] as const
            ).map(([value, label]) => (
              <button
                className={`filter-tab ${filter === value ? "is-active" : ""}`}
                key={value}
                onClick={() => setFilter(value)}
                role="tab"
                aria-selected={filter === value}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <input
            aria-label="Search bills"
            className="input-field sm:max-w-xs"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title…"
            type="search"
            value={search}
          />
        </div>

        {filteredBills.length === 0 ? (
          <div className="mt-6 rounded-[var(--radius-control)] border border-dashed border-[var(--line)] bg-[var(--surface-2)] px-4 py-8 text-center">
            <p className="font-semibold text-[var(--ink)]">
              {bills.length === 0 ? "No bills yet" : "No bills match"}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {bills.length === 0
                ? "Upload a receipt to create your first split."
                : "Try another search or filter."}
            </p>
            {bills.length === 0 ? (
              <button
                className="primary-button mt-4"
                onClick={startNewBill}
                type="button"
              >
                Start a bill
              </button>
            ) : null}
          </div>
        ) : (
          <ul className="mt-4 grid gap-2">
            {filteredBills.map((bill) => (
              <li key={bill.id}>
                <article className="bill-row">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-base font-semibold text-[var(--ink)]">
                          {bill.title}
                        </h2>
                        <span
                          className={`status-pill ${bill.status === "confirmed" ? "is-confirmed" : ""}`}
                        >
                          {bill.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        Updated {formatDate(bill.updatedAt)} · {bill.participantCount}{" "}
                        people · {bill.itemCount} items ·{" "}
                        <span className="font-semibold text-[var(--ink)]">
                          {formatMoney(bill.grandTotal)}
                        </span>
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {bill.status === "draft" ? (
                        <button
                          className="ghost-button text-rose-700"
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
                          Edit
                        </button>
                      ) : null}
                      <button
                        className="primary-button"
                        onClick={() => openBill(bill)}
                        type="button"
                      >
                        {bill.status === "confirmed" ? "Share" : "Continue"}
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
