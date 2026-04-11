import type { PropsWithChildren, ReactNode } from "react";

interface SectionShellProps extends PropsWithChildren {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

export function SectionShell({ id, eyebrow, title, subtitle, actions, children }: SectionShellProps) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[1.75rem] border border-[#99ADC6]/45 bg-white p-6 shadow-card sm:p-7">
      <div className="mb-6 flex flex-col gap-4 border-b border-[#99ADC6]/45 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#99ADC6]">{eyebrow}</p>
          <h2 className="mt-2 font-display text-[2rem] leading-tight text-[#4A678F]">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A678F]/78">{subtitle}</p>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
