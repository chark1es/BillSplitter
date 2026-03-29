import { Fragment } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { cn } from "../../lib/utils";
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
};

function StepCrumbContent({
  stepNum,
  label,
  current,
}: {
  stepNum: number;
  label: string;
  current?: boolean;
}) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span
        className={cn(
          "min-w-[1.1rem] tabular-nums text-[0.7rem] font-semibold text-muted-foreground",
          current && "text-[var(--accent)]",
        )}
      >
        {stepNum}
      </span>
      <span className={cn("font-medium", current && "text-foreground")}>{label}</span>
    </span>
  );
}

export function BillWizardNavBar({
  step,
  currentPath,
  totalSteps = BILL_WIZARD_STEPS.length,
  onBack,
}: BillWizardNavBarProps) {
  const { draft } = useActiveBillDraft();

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 shadow-[var(--shadow)] backdrop-blur-sm sm:px-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          <Button
            className="shrink-0 gap-1.5 border-[var(--line)] bg-background/80 text-foreground hover:bg-muted/80"
            onClick={onBack}
            size="sm"
            type="button"
            variant="outline"
          >
            <ArrowLeftIcon aria-hidden className="size-3.5 opacity-70" />
            Back
          </Button>

          <Breadcrumb className="min-w-0">
            <BreadcrumbList>
              {BILL_WIZARD_STEPS.map((wizardStep, index) => {
                const isActive = wizardStep.path === currentPath;
                const isAllowed = canNavigateToWizardStep(wizardStep.path, draft);

                return (
                  <Fragment key={wizardStep.path}>
                    {index > 0 ? (
                      <BreadcrumbSeparator className="px-0.5" />
                    ) : null}
                    <BreadcrumbItem className="max-w-[9rem] sm:max-w-none">
                      {isActive ? (
                        <BreadcrumbPage className="inline-flex min-w-0">
                          <span className="truncate">
                            <StepCrumbContent
                              current
                              label={wizardStep.shortLabel}
                              stepNum={wizardStep.step}
                            />
                          </span>
                        </BreadcrumbPage>
                      ) : null}

                      {!isActive && isAllowed ? (
                        <BreadcrumbLink
                          className="inline-flex min-w-0 max-w-full text-muted-foreground"
                          render={(props) => (
                            <Link
                              {...props}
                              to={wizardStep.path}
                              viewTransition
                            />
                          )}
                        >
                          <span className="truncate">
                            <StepCrumbContent
                              label={wizardStep.shortLabel}
                              stepNum={wizardStep.step}
                            />
                          </span>
                        </BreadcrumbLink>
                      ) : null}

                      {!isActive && !isAllowed ? (
                        <span
                          aria-disabled
                          className="inline-flex min-w-0 max-w-full cursor-not-allowed truncate rounded-sm text-muted-foreground opacity-40"
                          title="Complete earlier steps first"
                        >
                          <StepCrumbContent
                            label={wizardStep.shortLabel}
                            stepNum={wizardStep.step}
                          />
                        </span>
                      ) : null}
                    </BreadcrumbItem>
                  </Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <p className="shrink-0 text-xs font-semibold tabular-nums tracking-wide text-muted-foreground">
          Step {step} of {totalSteps}
        </p>
      </div>
    </div>
  );
}
