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
    <section id={id} className="scroll-mt-24 border-t border-[#99ADC6]/45 bg-white px-6 py-6 sm:px-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-[#99ADC6]/45 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#99ADC6]">{eyebrow}</p>
          <h2 className="mt-2 text-[1.6rem] font-semibold leading-tight text-[#4A678F]">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A678F]/76">{subtitle}</p>
        </div>
        {actions}
      </div>
      {children}
      <div className="mt-6 flex justify-end">
        <a href="#top" aria-label="Back to top" className="flex h-8 w-8 items-center justify-center border border-[#99ADC6]/45 bg-[#F4F9FC] text-[#4A678F] transition hover:bg-white hover:border-[#4A678F]/40">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 15l-6-6-6 6" />
          </svg>
        </a>
      </div>
    </section>
  );
}
