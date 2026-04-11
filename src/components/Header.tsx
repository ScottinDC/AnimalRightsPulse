const NAV_ITEMS = [
  ["overview", "Overview"],
  ["gsc", "Search Demand"],
  ["ga4", "Internal Search"],
  ["reddit", "Reddit"],
  ["google-trends", "Google Trends"],
  ["google-news", "Google News"],
  ["story-ideas", "Action Queue"]
];

export function Header() {
  return (
    <header id="top" className="border-b border-[#99ADC6]/45 bg-white px-6 py-6 sm:px-8">
      <div className="flex flex-col gap-4">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#99ADC6]">Animal Rights Signal Monitor</p>
          <h1 className="mt-2 text-[2rem] font-semibold leading-tight text-[#4A678F] sm:text-[2.15rem]">Trends and Insights Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4A678F]/76">
            Static reporting for organic search growth, internal site queries, and emerging animal-rights topics across search,
            community, and news signals.
          </p>
        </div>
      </div>
    </header>
  );
}
