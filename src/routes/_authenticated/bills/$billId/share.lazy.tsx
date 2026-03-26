import { createLazyFileRoute, getRouteApi } from "@tanstack/react-router";
import { SharePage } from "../../../../features/bills/share-page";
import { asBillId } from "../../../../lib/types";

const route = getRouteApi("/_authenticated/bills/$billId/share");

export const Route = createLazyFileRoute("/_authenticated/bills/$billId/share")({
  component: ShareLazyRoute,
});

function ShareLazyRoute() {
  const bill = route.useLoaderData();
  const params = route.useParams();

  return <SharePage billId={asBillId(params.billId)} initialBill={bill} />;
}
