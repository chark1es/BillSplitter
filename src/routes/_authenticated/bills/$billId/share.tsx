import { createFileRoute, redirect } from "@tanstack/react-router";
import { fairShareQueries } from "../../../../lib/queries";
import { asBillId } from "../../../../lib/types";

export const Route = createFileRoute("/_authenticated/bills/$billId/share")({
  loader: async ({ context, params }) => {
    const bill = await context.queryClient.ensureQueryData({
      ...fairShareQueries.bills.detail(asBillId(params.billId)),
    });

    if (!bill) {
      throw redirect({ to: "/dashboard" });
    }

    return bill;
  },
});
