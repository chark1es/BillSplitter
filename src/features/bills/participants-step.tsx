import { useEffect, useMemo, useRef, useState } from "react";
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
import { BillWizardShell } from "./bill-wizard-shell";
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
type ParticipantRole = "none" | "paid" | "birthday";

const roleForRow = (row: Row): ParticipantRole => {
  if (row.isSelf) return "paid";
  if (row.isBirthday) return "birthday";
  return "none";
};

const columnHelper = createColumnHelper<Row>();

export function ParticipantsStep() {
  const navigate = useNavigate();
  const { draft, patchDraft, hydrated } = useActiveBillDraft();
  useBillWizardRoutePreload("/bills/new/participants");

  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[]>(() =>
    (draft?.participants ?? []).map((participant) => ({
      ...getInitialSelection([participant])[0]!,
      key: participant.id,
      isBirthday: participant.isBirthday ?? false,
      birthdayCoveredByParticipantIds: participant.birthdayCoveredByParticipantIds,
    })),
  );
  const hydratedRowsRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !draft || hydratedRowsRef.current) return;
    hydratedRowsRef.current = true;
    setRows(
      draft.participants.map((participant) => ({
        ...getInitialSelection([participant])[0]!,
        key: participant.id,
        isBirthday: participant.isBirthday ?? false,
        birthdayCoveredByParticipantIds: participant.birthdayCoveredByParticipantIds,
      })),
    );
  }, [draft, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!draft?.receipt.parsed) {
      navigate({ to: "/bills/new/upload" });
    }
  }, [draft, hydrated, navigate]);

  useEffect(() => {
    if (rows.length === 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      patchDraft((prev) => ({
        ...prev,
        participants: rows.map(({ key, ...rest }) => ({
          id: key,
          ...rest,
        })),
      }));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [rows, patchDraft]);

  const [draftName, setDraftName] = useState("");

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
      columnHelper.display({
        id: "role",
        header: "Role",
        cell: (info) => {
          const row = info.row.original;
          const role = roleForRow(row);
          return (
            <div className="grid gap-2">
              <select
                aria-label={`Role for ${row.name}`}
                className="w-full min-w-[8.5rem] rounded-xl border border-[var(--line)] bg-white/80 px-2 py-1.5 text-xs font-semibold text-[var(--ink)]"
                onChange={(event) =>
                  updateParticipantRole(row.key, event.target.value as ParticipantRole)
                }
                value={role}
              >
                <option value="none">None</option>
                <option value="paid">Paid the bill</option>
                <option value="birthday">Birthday</option>
              </select>
              {row.isBirthday ? (
                <div className="flex flex-wrap gap-1">
                  {rows
                    .filter((participant) => participant.key !== row.key)
                    .map((participant) => {
                      const selected =
                        row.birthdayCoveredByParticipantIds?.includes(participant.key) ??
                        false;
                      return (
                        <button
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[0.62rem] font-semibold transition",
                            selected
                              ? "border-violet-400 bg-violet-500/15 text-violet-900"
                              : "border-[var(--line)] bg-white/60 text-[var(--muted)]",
                          )}
                          key={participant.key}
                          onClick={() => toggleBirthdayCoverer(row.key, participant.key)}
                          type="button"
                        >
                          {participant.name}
                        </button>
                      );
                    })}
                </div>
              ) : null}
            </div>
          );
        },
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

  const updateParticipantRole = (key: string, role: ParticipantRole) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key === key) {
          if (role === "paid") {
            return {
              ...row,
              isSelf: true,
              isBirthday: false,
              birthdayCoveredByParticipantIds: undefined,
            };
          }
          if (role === "birthday") {
            return {
              ...row,
              isSelf: false,
              isBirthday: true,
              birthdayCoveredByParticipantIds: prev
                .filter((participant) => participant.key !== key)
                .map((participant) => participant.key),
            };
          }
          return {
            ...row,
            isSelf: false,
            isBirthday: false,
            birthdayCoveredByParticipantIds: undefined,
          };
        }
        return role === "paid" ? { ...row, isSelf: false } : row;
      }),
    );
  };

  const toggleBirthdayCoverer = (birthdayKey: string, covererKey: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== birthdayKey) {
          return row;
        }
        const current = row.birthdayCoveredByParticipantIds ?? [];
        const next = current.includes(covererKey)
          ? current.filter((id) => id !== covererKey)
          : [...current, covererKey];
        return { ...row, birthdayCoveredByParticipantIds: next };
      }),
    );
  };

  const addParticipant = () => {
    const name = draftName.trim();
    if (!name) {
      return;
    }
    const initials = initialsFromName(name);
    setRows((prev) => {
      const color = colorForIndex(prev.length);
      return [
        ...prev,
        {
          key: crypto.randomUUID(),
          name,
          initials,
          color,
          isSelf: false,
          isBirthday: false,
        },
      ];
    });
    setDraftName("");
  };

  const canContinue = rows.length >= 2;

  return (
    <div className="space-y-4">
      <BillWizardShell
        currentPath="/bills/new/participants"
        description="Add everyone at the table. Mark who paid or whose birthday is covered."
        onBack={() =>
          navigate({ to: "/bills/new/itemized", viewTransition: true })
        }
        step={3}
        title="Who's splitting?"
        trailing={<LocalDraftDisclosure />}
      />

      <section className="grid gap-4 lg:grid-cols-[1fr_15rem] lg:items-start">
        <article className="panel min-w-0 overflow-hidden p-0">
          <div className="border-b border-[var(--line)] bg-[var(--surface-2)]/90 px-5 py-5 sm:px-7 sm:py-6">
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

            <form
              className="mt-5"
              onSubmit={(event) => {
                event.preventDefault();
                addParticipant();
              }}
            >
              <label className="grid gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Display name
                </span>
                <input
                  className="input-field"
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  value={draftName}
                />
              </label>
              <p className="mt-2 text-xs text-[var(--muted)]">
                Press Enter to add. Set paid or birthday in the table after adding.
              </p>

            <button
              className="secondary-button mt-5 w-full justify-center sm:w-auto"
              type="submit"
            >
              <UserPlusIcon aria-hidden className="size-4" strokeWidth={2.25} />
              Add to list
            </button>
            </form>
          </div>

          <div className="px-5 py-5 sm:px-7 sm:py-7">
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
                  className="input-field py-2 pl-9"
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search names…"
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

        <aside className="panel flex flex-col p-4 sm:p-5 lg:sticky lg:top-20">
          <p className="section-label mb-2">Group size</p>
          <p className="text-3xl font-bold tabular-nums leading-none text-[var(--ink)]">
            {rows.length}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">people</p>

          {rows.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {rows.slice(0, 6).map((r) => (
                <span
                  className={cn(
                    "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--surface)] text-[0.6rem] font-extrabold text-white shadow-sm",
                    (r.isSelf || r.isBirthday) &&
                      "ring-2 ring-[var(--teal)] ring-offset-2 ring-offset-[var(--surface)]",
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

          {rows.length > 0 ? (
            <p className="mt-4 text-xs text-[var(--muted)]">
              Use the Role column for paid or birthday — no extra labels needed.
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
