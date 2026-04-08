import type { SourceType } from "../lib/types";

const SOURCE_STYLES: Record<SourceType, string> = {
  gsc: "bg-sky/60 text-ink",
  ga4: "bg-leaf/15 text-moss",
  reddit: "bg-ember/15 text-ember",
  "google-trends": "bg-yellow-100 text-yellow-900",
  "google-news": "bg-blue-100 text-blue-900"
};

interface SourceBadgeProps {
  source: SourceType;
  label?: string;
}

export function SourceBadge({ source, label }: SourceBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${SOURCE_STYLES[source]}`}>
      {label ?? source}
    </span>
  );
}
