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
    <section id={id} className="scroll-mt-24 rounded-[2rem] border border-moss/10 bg-white/80 p-6 shadow-card backdrop-blur sm:p-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-moss/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-leaf">{eyebrow}</p>
          <h2 className="mt-2 font-display text-3xl text-ink">{title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-moss/80">{subtitle}</p>
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
