import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "../../features/dashboard/dashboard-page";
import { getDashboardSnapshot } from "../../lib/auth/session.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: () => getDashboardSnapshot(),
  component: DashboardRoute,
});

function DashboardRoute() {
  const bills = Route.useLoaderData();
  return <DashboardPage initialBills={bills} />;
}
