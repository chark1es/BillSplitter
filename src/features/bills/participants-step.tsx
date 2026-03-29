import { useEffect, useMemo, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useNavigate } from "@tanstack/react-router";
import { SearchIcon, Trash2Icon, UserPlusIcon, UsersIcon } from "lucide-react";
import { cn } from "#/lib/utils";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import { LocalDraftDisclosure } from "./local-draft-disclosure";
import type { ParticipantDraft } from "../../lib/types";
import { BillWizardNavBar } from "./bill-wizard-nav";
import { ParticipantPaidBadge } from "./participant-paid-badge";
import { useBillWizardRoutePreload } from "./bill-wizard-routing";

const COLOR_PALETTE = [
  "#9c4e1f",
  "#0f766e",
  "#1d4ed8",
  "#7c3aed",
  "#b45309",
  "#be123c",
  "#047857",
  "#4338ca",
];

const initialsFromName = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

const colorForIndex = (index: number) => COLOR_PALETTE[index % COLOR_PALETTE.length];

const getInitialSelection = (
  participants: Array<{
    name: string;
    initials: string;
    color: string;
    isSelf: boolean;
  }>,
): ParticipantDraft[] =>
  participants.map((participant, i) => ({
    ...participant,
    color: participant.color || colorForIndex(i),
  }));

type Row = ParticipantDraft & { key: string };

const columnHelper = createColumnHelper<Row>();

export function ParticipantsStep() {
  const navigate = useNavigate();
  const { draft, patchDraft, hydrated } = useActiveBillDraft();
  useBillWizardRoutePreload("/bills/new/participants");

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>(() =>
    getInitialSelection(draft?.participants ?? []).map((p, i) => ({
      ...p,
      key: `p-${i}-${p.name}`,
    })),
  );

  useEffect(() => {
    if (!draft) return;
    setRows(
      getInitialSelection(draft.participants).map((p, i) => ({
        ...p,
        key: `p-${i}-${p.name}`,
      })),
    );
  }, [draft]);

  useEffect(() => {
    if (!hydrated) return;
    if (!draft?.receipt.parsed) {
      navigate({ to: "/bills/new/upload" });
    }
  }, [draft, hydrated, navigate]);

  const [draftName, setDraftName] = useState("");
  const [draftSelf, setDraftSelf] = useState(false);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return rows;
    }
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.initials.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const table = useReactTable({
    data: filteredRows,
    getRowId: (row) => row.key,
    columns: [
      columnHelper.accessor("initials", {
        header: "",
        cell: (info) => (
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.6rem] font-extrabold text-white shadow-sm ring-2 ring-white/90"
            style={{ backgroundColor: info.row.original.color }}
          >
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("name", {
        header: "Name",
        cell: (info) => (
          <span className="font-semibold text-[var(--ink)]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("isSelf", {
        header: "Paid",
        cell: (info) =>
          info.getValue() ? (
            <ParticipantPaidBadge isSelf={true} />
          ) : (
            <span className="text-sm text-[var(--muted)]">—</span>
          ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <button
            aria-label={`Remove ${info.row.original.name}`}
            className="inline-flex rounded-xl p-2 text-[var(--muted)] transition hover:bg-[var(--accent-soft)] hover:text-[var(--accent-strong)]"
            onClick={() => removeRow(info.row.original.key)}
            type="button"
          >
            <Trash2Icon aria-hidden className="size-4" />
          </button>
        ),
      }),
    ],
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const removeRow = (key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const addParticipant = () => {
    const name = draftName.trim();
    if (!name) {
      return;
    }
    const initials = initialsFromName(name);
    setRows((prev) => {
      let next = prev;
      if (draftSelf) {
        next = prev.map((r) => ({ ...r, isSelf: false }));
      }
      const color = colorForIndex(next.length);
      return [
        ...next,
        {
          key: crypto.randomUUID(),
          name,
          initials,
          color,
          isSelf: draftSelf,
        },
      ];
    });
    setDraftName("");
    setDraftSelf(false);
  };

  const canContinue = rows.length >= 2;

  return (
    <div className="space-y-6">
      <BillWizardNavBar
        currentPath="/bills/new/participants"
        onBack={() =>
          navigate({ to: "/bills/new/itemized", viewTransition: true })
        }
        step={3}
        totalSteps={5}
        backLabel="Back to itemized receipt"
      />
      <section className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <div className="flex gap-6 sm:gap-8">
          <div
            aria-hidden
            className="hidden w-1 shrink-0 rounded-full bg-gradient-to-b from-[var(--accent)] to-[var(--accent-soft)] sm:block"
          />
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-3">Step 3 · People</p>
            <h1 className="display text-4xl text-[var(--ink)] sm:text-5xl lg:text-6xl">
              Who split the table?
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
              Name everyone who shared the bill. Colors are assigned automatically so you can tell
              line items apart on the next step. Mark who paid so totals stay clear.
            </p>
            <div className="mt-5">
              <LocalDraftDisclosure />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_17rem] lg:items-start">
        <article className="panel min-w-0 overflow-hidden p-0">
          <div className="border-b border-[var(--line)] bg-[var(--surface-2)]/90 px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-white/80 text-[var(--accent)] shadow-sm ring-1 ring-[var(--line)]">
                <UserPlusIcon aria-hidden className="size-[1.15rem]" strokeWidth={2.25} />
              </span>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">Add someone</h2>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  Color is picked automatically in order — easy to spot on the assign step.
                </p>
              </div>
            </div>

            <label className="mt-5 grid gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                Display name
              </span>
              <input
                className="w-full rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3 text-[var(--ink)] shadow-sm outline-none transition focus:ring-2 focus:ring-[var(--accent)]"
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addParticipant();
                  }
                }}
                placeholder="e.g. Jordan Lee"
                value={draftName}
              />
            </label>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-[var(--line)] bg-white/50 p-3.5 transition hover:bg-white/80">
              <input
                checked={draftSelf}
                className="mt-0.5 size-4 shrink-0 rounded border-[var(--line)] accent-[var(--accent)]"
                onChange={(e) => setDraftSelf(e.target.checked)}
                type="checkbox"
              />
              <span className="text-sm leading-snug text-[var(--ink)]">
                <span className="font-semibold">Paid the bill</span>
                <span className="block text-xs font-normal text-[var(--muted)]">
                  Shown as &quot;Paid&quot; in summaries so everyone knows who covered the check.
                </span>
              </span>
            </label>

            <button
              className="secondary-button mt-5 w-full justify-center sm:w-auto"
              onClick={addParticipant}
              type="button"
            >
              <UserPlusIcon aria-hidden className="size-4" strokeWidth={2.25} />
              Add to list
            </button>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-9 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  <UsersIcon aria-hidden className="size-[1.15rem]" strokeWidth={2.25} />
                </span>
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-[var(--ink)]">Your group</h2>
                  <p className="text-xs text-[var(--muted)]">
                    {rows.length === 0
                      ? "Nobody yet — add at least two people."
                      : `${rows.length} on the bill${rows.length >= 2 ? "" : " · need one more"}`}
                  </p>
                </div>
              </div>

              <div className="relative w-full sm:max-w-xs">
                <SearchIcon
                  aria-hidden
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
                  strokeWidth={2}
                />
                <input
                  aria-label="Filter participants"
                  className="w-full rounded-2xl border border-[var(--line)] bg-white/70 py-2.5 pl-10 pr-4 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:ring-2 focus:ring-[var(--accent)]"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search names or initials…"
                  value={search}
                />
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--line)] bg-white/45 shadow-inner">
              <div className="max-h-[min(28rem,55vh)] overflow-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="sticky top-0 z-[1] bg-[rgba(255,252,246,0.92)] backdrop-blur-sm">
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="border-b border-[var(--line)]">
                        {headerGroup.headers.map((header) => (
                          <th
                            className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-[var(--muted)] first:pl-5 last:pr-5"
                            key={header.id}
                            scope="col"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row, i) => (
                      <tr
                        className={cn(
                          "border-b border-[var(--line)] transition last:border-0 hover:bg-[var(--accent-soft)]/30",
                          i % 2 === 1 && "bg-[rgba(255,255,255,0.35)]",
                        )}
                        key={row.id}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td className="px-4 py-2.5 align-middle first:pl-5 last:pr-5" key={cell.id}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredRows.length === 0 ? (
                <p className="border-t border-[var(--line)] px-5 py-8 text-center text-sm text-[var(--muted)]">
                  {rows.length === 0
                    ? "Your roster will show up here — use the form above."
                    : "No matches — try another search or clear the filter."}
                </p>
              ) : null}
            </div>
          </div>
        </article>

        <aside className="panel flex flex-col p-6 sm:p-7 lg:sticky lg:top-6">
          <p className="eyebrow mb-2">Next step</p>
          <p className="display text-4xl leading-none text-[var(--ink)]">{rows.length}</p>
          <p className="mt-1.5 text-sm font-medium text-[var(--muted)]">people at the table</p>

          {rows.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {rows.slice(0, 6).map((r) => (
                <span
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--surface)] text-[0.6rem] font-extrabold text-white shadow-sm",
                    r.isSelf && "ring-2 ring-[var(--teal)] ring-offset-2 ring-offset-[var(--surface)]",
                  )}
                  key={r.key}
                  style={{ backgroundColor: r.color }}
                  title={r.isSelf ? `${r.name} (paid)` : r.name}
                >
                  {r.initials}
                </span>
              ))}
              {rows.length > 6 ? (
                <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2 text-xs font-bold text-[var(--muted)]">
                  +{rows.length - 6}
                </span>
              ) : null}
            </div>
          ) : null}

          {rows.some((r) => r.isSelf) ? (
            <p className="mt-4 flex flex-wrap items-center gap-2 text-xs leading-snug text-[var(--muted)]">
              <ParticipantPaidBadge isSelf={true} size="compact" />
              <span>
                <span className="font-semibold text-[var(--ink)]">
                  {rows.find((r) => r.isSelf)?.name}
                </span>{" "}
                covered the check.
              </span>
            </p>
          ) : rows.length > 0 ? (
            <p className="mt-4 text-xs text-[var(--muted)]">
              Tip: check &quot;Paid the bill&quot; for whoever paid so the label shows in summaries.
            </p>
          ) : null}

          <p
            className={cn(
              "mt-5 text-xs leading-relaxed",
              canContinue ? "font-semibold text-[var(--teal)]" : "text-[var(--muted)]",
            )}
          >
            {canContinue
              ? "You're set — continue to assign items to each person."
              : "Add at least two people so the bill can be split fairly."}
          </p>

          <button
            className="primary-button mt-8 w-full justify-center"
            disabled={!canContinue}
            onClick={() => {
              patchDraft((prev) => ({
                ...prev,
                participants: rows.map(({ key, ...rest }) => ({
                  id: key,
                  ...rest,
                })),
              }));
              navigate({ to: "/bills/new/assign", viewTransition: true });
            }}
            type="button"
          >
            Next: assign items
          </button>
        </aside>
      </section>
    </div>
  );
}
