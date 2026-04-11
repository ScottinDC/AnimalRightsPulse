import type { SourceType } from "../lib/types";

const SOURCE_STYLES: Record<SourceType, string> = {
  gsc: "border-[#99ADC6] bg-[#F4F9FC] text-[#4A678F]",
  ga4: "border-[#99ADC6] bg-white text-[#4A678F]",
  reddit: "border-[#CB693A]/30 bg-[#CB693A]/10 text-[#CB693A]",
  "google-trends": "border-[#99ADC6] bg-[#F4F9FC] text-[#4A678F]",
  "google-news": "border-[#CB693A]/20 bg-[#F4F9FC] text-[#4A678F]"
};

const SOURCE_LABELS: Record<SourceType, string> = {
  gsc: "GSC",
  ga4: "GA4",
  reddit: "Reddit",
  "google-trends": "Google Trends",
  "google-news": "Google News"
};

interface SourceBadgeProps {
  source: SourceType;
  label?: string;
}

export function SourceBadge({ source, label }: SourceBadgeProps) {
  return (
    <span className={`inline-flex items-center border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${SOURCE_STYLES[source]}`}>
      {label ?? SOURCE_LABELS[source]}
    </span>
  );
}
