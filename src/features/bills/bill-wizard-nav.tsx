import { useNavigate } from "@tanstack/react-router";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import {
  BILL_WIZARD_STEPS,
  canNavigateToWizardStep,
  type BillWizardStepPath,
} from "./bill-wizard-routing";

type BillWizardNavBarProps = {
  step: number;
  currentPath: BillWizardStepPath;
  totalSteps?: number;
  onBack: () => void;
  backLabel?: string;
};

export function BillWizardNavBar({
  step,
  currentPath,
  totalSteps = 4,
  onBack,
  backLabel = "Back",
}: BillWizardNavBarProps) {
  const navigate = useNavigate();
  const { draft } = useActiveBillDraft();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className="secondary-button" onClick={onBack} type="button">
          {backLabel}
        </button>
        {BILL_WIZARD_STEPS.map((wizardStep) => {
          const isActive = wizardStep.path === currentPath;
          const isAllowed = canNavigateToWizardStep(wizardStep.path, draft);
          return (
            <button
              className={`nav-pill ${isActive ? "is-active ring-2 ring-[var(--accent)]" : ""} ${!isAllowed ? "cursor-not-allowed opacity-45" : ""}`}
              disabled={!isAllowed}
              key={wizardStep.path}
              onClick={() =>
                navigate({
                  to: wizardStep.path,
                  viewTransition: true,
                })
              }
              type="button"
            >
              <span className="text-[0.72rem] tabular-nums text-[var(--muted)]">
                {wizardStep.step}
              </span>
              <span>{wizardStep.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <p className="text-sm font-medium tabular-nums text-[var(--muted)]">
        Step {step} of {totalSteps}
      </p>
    </div>
  );
}
