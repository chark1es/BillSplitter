import { createFileRoute } from "@tanstack/react-router";
import { DashboardPage } from "../../features/dashboard/dashboard-page";
import { fairShareQueries } from "../../lib/queries";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({
      ...fairShareQueries.bills.list(),
    }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const bills = Route.useLoaderData();
  return <DashboardPage initialBills={bills} />;
}
