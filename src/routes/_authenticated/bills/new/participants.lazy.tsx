import { createLazyFileRoute } from "@tanstack/react-router";
import { ParticipantsStep } from "../../../../features/bills/participants-step";

export const Route = createLazyFileRoute("/_authenticated/bills/new/participants")({
  component: ParticipantsStep,
});
