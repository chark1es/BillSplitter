import { createLazyFileRoute } from "@tanstack/react-router";
import { UploadStep } from "../../../../features/bills/upload-step";

export const Route = createLazyFileRoute("/_authenticated/bills/new/upload")({
  component: UploadStep,
});
