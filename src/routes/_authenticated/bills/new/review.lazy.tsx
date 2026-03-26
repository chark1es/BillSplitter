import { createLazyFileRoute } from "@tanstack/react-router";
import { ReviewStep } from "../../../../features/bills/review-step";

export const Route = createLazyFileRoute("/_authenticated/bills/new/review")({
  component: ReviewStep,
});
