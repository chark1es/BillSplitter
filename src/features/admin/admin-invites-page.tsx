import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../convex/_generated/api";
import { PageHeader } from "../../components/layout/page-header";
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
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <PageHeader
        label="Admin"
        title="Invites"
        description="Allow emails to sign in. They receive an invite link by email."
      />

      <section className="panel p-4 sm:p-5">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
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
          <label className="grid min-w-0 flex-1 gap-1 text-sm">
            <span className="font-medium text-[var(--ink)]">Email</span>
            <input
              className="input-field"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              type="email"
              value={email}
            />
          </label>
          <button
            className="primary-button sm:w-28"
            disabled={inviteMutation.isPending}
            type="submit"
          >
            {inviteMutation.isPending ? "Sending…" : "Invite"}
          </button>
        </form>

        <div className="mt-5 overflow-x-auto rounded-[var(--radius-control)] border border-[var(--line)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--surface-2)]">
              <tr className="border-b border-[var(--line)]">
                <th className="px-3 py-2 font-medium text-[var(--muted)]">Email</th>
                <th className="px-3 py-2 font-medium text-[var(--muted)]">Invited</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((row) => (
                <tr className="border-b border-[var(--line)] last:border-0" key={row.id}>
                  <td className="px-3 py-2 font-medium text-[var(--ink)]">{row.email}</td>
                  <td className="px-3 py-2 text-[var(--muted)]">
                    {new Date(row.invitedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="ghost-button text-rose-700"
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
            <p className="px-3 py-5 text-center text-sm text-[var(--muted)]">
              No invited emails yet.
            </p>
          ) : null}
        </div>

        <Link className="mt-4 inline-block text-sm font-semibold text-[var(--accent)]" to="/settings">
          ← Settings
        </Link>
      </section>
    </div>
  );
}
