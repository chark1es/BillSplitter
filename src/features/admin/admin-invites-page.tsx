import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { fairShareQueries } from "../../lib/queries";

export function AdminInvitesPage() {
  const listQuery = useQuery(fairShareQueries.admin.allowedEmails());
  const inviteMutation = useMutation({
    mutationFn: useConvexMutation(api.admin.inviteEmail),
    onSuccess: () => listQuery.refetch(),
  });
  const removeMutation = useMutation({
    mutationFn: useConvexMutation(api.admin.removeAllowedEmail),
    onSuccess: () => listQuery.refetch(),
  });

  const [email, setEmail] = useState("");

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      <section className="hero-panel px-7 py-8 sm:px-10 sm:py-10">
        <p className="eyebrow mb-3">Admin</p>
        <h1 className="display text-4xl text-[var(--ink)] sm:text-5xl">Invites</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">
          Add emails allowed to sign in. They receive an invitation email with a link
          to the app.
        </p>
      </section>

      <section className="panel p-6 sm:p-8">
        <form
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) {
              return;
            }
            inviteMutation.mutate(
              { email: email.trim() },
              {
                onSuccess: () => setEmail(""),
              },
            );
          }}
        >
          <label className="grid flex-1 gap-1 text-sm">
            <span className="font-semibold text-[var(--ink)]">Email</span>
            <input
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3 text-[var(--ink)]"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              type="email"
              value={email}
            />
          </label>
          <button
            className="primary-button justify-center sm:w-40"
            disabled={inviteMutation.isPending}
            type="submit"
          >
            {inviteMutation.isPending ? "Sending…" : "Invite"}
          </button>
        </form>

        <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--line)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-2)]">
              <tr className="border-b border-[var(--line)]">
                <th className="px-4 py-3 font-semibold text-[var(--muted)]">Email</th>
                <th className="px-4 py-3 font-semibold text-[var(--muted)]">Invited</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((row) => (
                <tr className="border-b border-[var(--line)] last:border-0" key={row.id}>
                  <td className="px-4 py-3 font-medium text-[var(--ink)]">{row.email}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {new Date(row.invitedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-sm font-semibold text-rose-700"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate({ email: row.email })}
                      type="button"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {listQuery.data?.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">
              No invited emails yet.
            </p>
          ) : null}
        </div>

        <Link className="mt-6 inline-block text-sm font-semibold text-[var(--accent)]" to="/settings">
          ← Settings
        </Link>
      </section>
    </div>
  );
}
