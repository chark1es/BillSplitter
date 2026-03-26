import { createFileRoute, redirect } from "@tanstack/react-router";
import { getBillSnapshot } from "../../../../lib/auth/session.functions";

export const Route = createFileRoute("/_authenticated/bills/$billId/share")({
  loader: async ({ params }) => {
    const bill = await getBillSnapshot({
      data: {
        billId: params.billId,
      },
    });

    if (!bill) {
      throw redirect({ to: "/dashboard" });
    }

    return bill;
  },
});
