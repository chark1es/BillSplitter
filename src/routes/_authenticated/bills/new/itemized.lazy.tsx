import { createLazyFileRoute } from "@tanstack/react-router";
import { ItemizedReceiptStep } from "../../../../features/bills/itemized-receipt-step";

export const Route = createLazyFileRoute("/_authenticated/bills/new/itemized")({
  component: ItemizedReceiptStep,
});
