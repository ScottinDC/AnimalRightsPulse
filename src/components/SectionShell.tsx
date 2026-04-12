import type { PropsWithChildren, ReactNode } from "react";

interface SectionShellProps extends PropsWithChildren {
  id: string;
  eyebrow?: string;
  title?: string;
  subtitle: string;
  actions?: ReactNode;
  headerDivider?: boolean;
  topDivider?: boolean;
}

export function SectionShell({ id, eyebrow, title, subtitle, actions, children, headerDivider = true, topDivider = true }: SectionShellProps) {
  return (
    <section id={id} className={`scroll-mt-24 bg-white px-6 py-6 sm:px-8 ${topDivider ? "border-t border-[#99ADC6]/45" : ""}`}>
      <div className={`mb-6 flex flex-col gap-4 pb-4 lg:flex-row lg:items-end lg:justify-between ${headerDivider ? "border-b border-[#99ADC6]/45" : ""}`}>
        <div>
          {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#99ADC6]">{eyebrow}</p> : null}
          {title ? <h2 className="mt-2 text-[1.6rem] font-semibold leading-tight text-[#000000]">{title}</h2> : null}
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A678F]/76">{subtitle}</p>
        </div>
        {actions}
      </div>
      {children}
      <div className="mt-6 flex justify-end">
        <a href="#top" className="border border-[#99ADC6]/35 bg-[#F4F9FC] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4A678F] transition hover:bg-white">
          Back to Top
        </a>
      </div>
    </section>
  );
}
