import { createLazyFileRoute } from "@tanstack/react-router";
import { AssignStep } from "../../../../features/bills/assign-step";

export const Route = createLazyFileRoute("/_authenticated/bills/new/assign")({
  component: AssignStep,
});
