import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { cn } from "../../lib/utils";
import { useActiveBillDraft } from "../../lib/drafts/use-active-bill-draft";
import {
  BILL_WIZARD_STEPS,
  canNavigateToWizardStep,
  type BillWizardStepPath,
} from "./bill-wizard-routing";

type BillWizardShellProps = {
  step: number;
  currentPath: BillWizardStepPath;
  onBack: () => void;
  title: string;
  description?: string;
  trailing?: ReactNode;
  totalSteps?: number;
};

export function BillWizardShell({
  step,
  currentPath,
  onBack,
  title,
  description,
  trailing,
  totalSteps = BILL_WIZARD_STEPS.length,
}: BillWizardShellProps) {
  const { draft } = useActiveBillDraft();

  return (
    <div className="wizard-shell">
      <div className="wizard-shell__card">
        <nav aria-label="Bill steps" className="wizard-steps">
          {BILL_WIZARD_STEPS.map((wizardStep) => {
            const isCurrent = wizardStep.path === currentPath;
            const isAllowed = canNavigateToWizardStep(wizardStep.path, draft);
            const isPast = wizardStep.step < step;

            const content = (
              <>
                <span className="wizard-step__num">{wizardStep.step}</span>
                <span>{wizardStep.shortLabel}</span>
              </>
            );

            if (isCurrent) {
              return (
                <span
                  aria-current="step"
                  className="wizard-step is-current"
                  key={wizardStep.path}
                >
                  {content}
                </span>
              );
            }

            if (isAllowed) {
              return (
                <Link
                  className={cn("wizard-step", isPast && "is-done")}
                  key={wizardStep.path}
                  to={wizardStep.path}
                  viewTransition
                >
                  {content}
                </Link>
              );
            }

            return (
              <span
                aria-disabled
                className="wizard-step"
                key={wizardStep.path}
                title="Complete earlier steps first"
              >
                {content}
              </span>
            );
          })}
        </nav>

        <div className="wizard-shell__body">
          <div className="flex flex-wrap items-start gap-2">
            <button
              className="ghost-button shrink-0 gap-1"
              onClick={onBack}
              type="button"
            >
              <ArrowLeftIcon aria-hidden className="size-3.5" />
              Back
            </button>
            <span className="ml-auto text-xs font-medium tabular-nums text-[var(--muted)]">
              {step} / {totalSteps}
            </span>
          </div>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="page-title">{title}</h1>
              {description ? (
                <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>
              ) : null}
            </div>
            {trailing ? <div className="w-full sm:max-w-xs shrink-0">{trailing}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
