import type { SourceType } from "../lib/types";

const SOURCE_STYLES: Record<SourceType, string> = {
  gsc: "border-[#99ADC6] bg-[#F4F9FC] text-[#4A678F]",
  ga4: "border-[#99ADC6] bg-white text-[#4A678F]",
  reddit: "border-[#CB693A]/30 bg-[#CB693A]/10 text-[#CB693A]",
  facebook: "border-[#4A678F]/20 bg-[#F4F9FC] text-[#4A678F]",
  "google-trends": "border-[#99ADC6] bg-[#F4F9FC] text-[#4A678F]",
  "google-news": "border-[#CB693A]/20 bg-[#F4F9FC] text-[#4A678F]"
};

const SOURCE_LABELS: Record<SourceType, string> = {
  gsc: "GSC",
  ga4: "GA4",
  reddit: "Reddit",
  facebook: "Facebook",
  "google-trends": "Google Trends",
  "google-news": "Google News"
};

interface SourceBadgeProps {
  source: SourceType;
  label?: string;
}

function normalizeSourceLabel(source: SourceType, label?: string) {
  if (!label) return SOURCE_LABELS[source];
  if (label === "Facebook Insights") return "FB Insights";
  if (label === "google-news") return "Google News";
  if (label === "google-trends") return "Google Trends";
  return label;
}

export function SourceBadge({ source, label }: SourceBadgeProps) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${SOURCE_STYLES[source]}`}>
      {normalizeSourceLabel(source, label)}
    </span>
  );
}
