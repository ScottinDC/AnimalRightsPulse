import type { SiteScope, SourceType, TrendLabel } from "../lib/types";

export interface Filters {
  source: SourceType | "all";
  site: SiteScope | "all";
  trendLabel: TrendLabel | "all";
  dateWindow: "current" | "previous" | "all";
}

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: T;
  options: Array<{ label: string; value: T }>;
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm text-[#4A678F]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#99ADC6]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="border border-[#99ADC6]/45 bg-white px-4 py-3 text-sm text-[#4A678F] outline-none ring-0 transition focus:border-[#4A678F]"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <div className="grid gap-4 border border-[#99ADC6]/45 bg-white px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
      <Select
        label="Source"
        value={filters.source}
        options={[
          { label: "All sources", value: "all" },
          { label: "Google Search Console", value: "gsc" },
          { label: "GA4 internal search", value: "ga4" },
          { label: "Reddit", value: "reddit" },
          { label: "Google Trends", value: "google-trends" },
          { label: "Google News", value: "google-news" }
        ]}
        onChange={(source) => onChange({ ...filters, source })}
      />
      <Select
        label="Site"
        value={filters.site}
        options={[
          { label: "All scopes", value: "all" },
          { label: "CHE", value: "site-a" },
          { label: "AWA", value: "site-b" },
          { label: "Global", value: "global" }
        ]}
        onChange={(site) => onChange({ ...filters, site })}
      />
      <Select
        label="Trend label"
        value={filters.trendLabel}
        options={[
          { label: "All labels", value: "all" },
          { label: "New", value: "new" },
          { label: "Breakout", value: "breakout" },
          { label: "Rising", value: "rising" },
          { label: "Steady", value: "steady" },
          { label: "Declining", value: "declining" }
        ]}
        onChange={(trendLabel) => onChange({ ...filters, trendLabel })}
      />
      <Select
        label="Time window"
        value={filters.dateWindow}
        options={[
          { label: "All windows", value: "all" },
          { label: "Current window", value: "current" },
          { label: "Comparison period", value: "previous" }
        ]}
        onChange={(dateWindow) => onChange({ ...filters, dateWindow })}
      />
    </div>
  );
}
