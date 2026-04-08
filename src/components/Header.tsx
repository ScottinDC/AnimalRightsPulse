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
    <header className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-10 text-sand shadow-card sm:px-8">
      <div className="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_top,rgba(181,217,223,0.45),transparent_45%)] lg:block" />
      <div className="relative flex flex-col gap-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky">Animal Rights Signal Monitor</p>
          <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
            A static newsroom dashboard for search demand, audience questions, and emerging animal-rights stories.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-sand/80 sm:text-base">
            This build reads only committed JSON, making GitHub Pages deployment simple while GitHub Actions handles Google, Reddit,
            trend, and news ingestion safely behind the scenes.
          </p>
        </div>
        <nav className="flex flex-wrap gap-3">
          {NAV_ITEMS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-sand transition hover:bg-white/10"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
