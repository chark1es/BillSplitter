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
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import { LocalDraftDisclosure } from "./local-draft-disclosure";
import type { ParticipantDraft } from "../../lib/types";
import { BillWizardNavBar } from "./bill-wizard-nav";

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

const getInitialSelection = (
  participants: Array<{
    name: string;
    initials: string;
    color: string;
    isSelf: boolean;
  }>,
): ParticipantDraft[] => participants.map((participant) => ({ ...participant }));

type Row = ParticipantDraft & { key: string };

const columnHelper = createColumnHelper<Row>();

export function ParticipantsStep() {
  const navigate = useNavigate();
  const { draft, patchDraft, hydrated } = useActiveBillDraft();

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
  const [draftColor, setDraftColor] = useState(COLOR_PALETTE[0]);
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
            className="avatar-badge shrink-0 text-[0.65rem]"
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
        header: "Role",
        cell: (info) => (
          <span className="text-sm text-[var(--muted)]">
            {info.getValue() ? "Bill owner" : "Guest"}
          </span>
        ),
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (info) => (
          <button
            className="text-sm font-semibold text-[var(--accent)]"
            onClick={() => removeRow(info.row.original.key)}
            type="button"
          >
            Remove
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
      return [
        ...next,
        {
          key: crypto.randomUUID(),
          name,
          initials,
          color: draftColor,
          isSelf: draftSelf,
        },
      ];
    });
    setDraftName("");
    setDraftSelf(false);
    setDraftColor(COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)]);
  };

  const canContinue = rows.length >= 2;

  return (
    <div className="space-y-6">
      <BillWizardNavBar
        onBack={() => navigate({ to: "/bills/new/upload" })}
        step={2}
        backLabel="Back to upload"
      />
      <section className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow mb-3">Step 2</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-6xl">
          Who split the table?
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
          Add real people — search and sort the list, then save to continue.
        </p>
        <div className="mt-4">
          <LocalDraftDisclosure />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <article className="panel min-w-0 p-6 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[var(--ink)]">Name</span>
              <input
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="e.g. Jordan Lee"
                value={draftName}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold text-[var(--ink)]">Color</span>
              <select
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[var(--ink)]"
                onChange={(e) => setDraftColor(e.target.value)}
                value={draftColor}
              >
                {COLOR_PALETTE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[var(--muted)]">
            <input
              checked={draftSelf}
              className="size-4 rounded border-[var(--line)]"
              onChange={(e) => setDraftSelf(e.target.checked)}
              type="checkbox"
            />
            This person is me (bill owner)
          </label>
          <button
            className="secondary-button mt-4"
            onClick={addParticipant}
            type="button"
          >
            Add participant
          </button>

          <div className="mt-8">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-[var(--ink)]">Search</span>
              <input
                className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[var(--ink)] outline-none focus:ring-2 focus:ring-[var(--accent)]"
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by name or initials"
                value={search}
              />
            </label>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--line)]">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="sticky top-0 bg-[var(--surface)]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-[var(--line)]">
                    {headerGroup.headers.map((header) => (
                      <th className="px-4 py-3 font-semibold text-[var(--muted)]" key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr className="border-b border-[var(--line)] last:border-0" key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td className="px-4 py-3 align-middle" key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRows.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">
                No matches — clear search or add someone new.
              </p>
            ) : null}
          </div>
        </article>

        <aside className="panel p-6">
          <p className="eyebrow mb-3">Selection</p>
          <p className="display text-3xl text-[var(--ink)]">{rows.length} people</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Need at least two to continue.</p>
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
              navigate({ to: "/bills/new/assign" });
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
