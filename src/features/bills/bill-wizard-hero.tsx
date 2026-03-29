import type { ReactNode } from "react";

type BillWizardHeroProps = {
  step: number;
  eyebrow: string;
  title: string;
  description: string;
  trailing?: ReactNode;
};

export function BillWizardHero({
  step,
  eyebrow,
  title,
  description,
  trailing,
}: BillWizardHeroProps) {
  return (
    <section className="hero-panel relative overflow-hidden px-5 py-7 sm:px-9 sm:py-9">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[var(--accent-soft)] blur-3xl sm:h-64 sm:w-64"
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-[var(--line)] bg-white/70 px-2 text-xs font-bold tabular-nums text-[var(--accent)] shadow-sm">
              {step}
            </span>
            <span className="eyebrow">{eyebrow}</span>
          </div>
          <h1 className="display text-3xl leading-[1.05] text-[var(--ink)] sm:text-4xl lg:text-[2.75rem]">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
            {description}
          </p>
        </div>
        {trailing ? (
          <div className="w-full shrink-0 sm:w-auto lg:max-w-[min(100%,20rem)] lg:text-right">
            {trailing}
          </div>
        ) : null}
      </div>
    </section>
  );
}
