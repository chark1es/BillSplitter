type BillWizardNavBarProps = {
  step: number;
  totalSteps?: number;
  onBack: () => void;
  backLabel?: string;
};

export function BillWizardNavBar({
  step,
  totalSteps = 4,
  onBack,
  backLabel = "Back",
}: BillWizardNavBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
      <button className="secondary-button" onClick={onBack} type="button">
        {backLabel}
      </button>
      <p className="text-sm font-medium tabular-nums text-[var(--muted)]">
        Step {step} of {totalSteps}
      </p>
    </div>
  );
}
