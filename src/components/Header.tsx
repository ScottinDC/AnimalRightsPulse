const NAV_ITEMS = [
  ["overview", "Overview"],
  ["gsc", "Search demand"],
  ["ga4", "Internal search"],
  ["reddit", "Reddit"],
  ["google-trends", "Google Trends"],
  ["google-news", "Google News"],
  ["story-ideas", "Action queue"]
];

export function Header() {
  return (
    <header className="rounded-[1.75rem] border border-[#99ADC6]/45 bg-white px-6 py-8 shadow-card sm:px-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#99ADC6]">Animal Rights Signal Monitor</p>
            <h1 className="mt-3 font-display text-4xl leading-tight text-[#4A678F] sm:text-5xl">
            A static newsroom dashboard for search demand, audience questions, and emerging animal-rights stories.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#4A678F]/80 sm:text-base">
              This build reads only committed JSON, making GitHub Pages deployment simple while GitHub Actions handles Google, Reddit,
              trend, and news ingestion safely behind the scenes.
            </p>
          </div>
          <div className="grid max-w-sm grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl border border-[#99ADC6]/45 bg-[#F4F9FC] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#99ADC6]">Sources</p>
              <p className="mt-2 font-display text-2xl text-[#4A678F]">5</p>
            </div>
            <div className="rounded-2xl border border-[#99ADC6]/45 bg-[#F4F9FC] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#99ADC6]">Mode</p>
              <p className="mt-2 font-display text-2xl text-[#4A678F]">Static</p>
            </div>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2 border-t border-[#99ADC6]/45 pt-5">
          {NAV_ITEMS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-[#99ADC6]/45 bg-[#F4F9FC] px-4 py-2 text-sm font-medium text-[#4A678F] transition hover:bg-white"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
