import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminInvitesPage } from "../../../features/admin/admin-invites-page";

export const Route = createFileRoute("/_authenticated/admin/invites")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAdmin) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: AdminInvitesPage,
});
