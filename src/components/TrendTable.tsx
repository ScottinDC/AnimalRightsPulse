import { formatPercentDelta, formatTrendScore, titleCaseFromSlug } from "../lib/format";
import type { NormalizedSignalRow } from "../lib/types";
import { SourceBadge } from "./SourceBadge";

interface TrendTableProps {
  title: string;
  rows: NormalizedSignalRow[];
  scoreMode?: "chip" | "bar";
  showSource?: boolean;
}

export function TrendTable({ title, rows, scoreMode = "chip", showSource = true }: TrendTableProps) {
  const headerHelp = {
    score: "Weighted editorial score based on search growth, source movement, novelty, and cross-source confirmation.",
    trend: "Rule-based label derived from the score and the strongest movement signals for the term.",
    momentum: "Source-specific movement signal. When there is no clean movement metric for a row, this stays blank.",
    highlights: "Short editorial cues pulled from the underlying signal flags."
  };

  const toneForValue = (value: number) => {
    if (value > 0) return "border-[#99ADC6] text-[#4A678F] bg-[#F4F9FC]";
    if (value < 0) return "border-[#CB693A]/20 text-[#CB693A] bg-[#CB693A]/10";
    return "text-[#4A678F] bg-white";
  };

  const momentumTone = (value: number) => {
    if (value < 0) {
      return {
        borderColor: "rgba(203,105,58,0.25)",
        backgroundColor: "rgba(203,105,58,0.10)",
        color: "#CB693A"
      };
    }

    const alpha = Math.max(0.12, Math.min(value / 100, 1));
    return {
      borderColor: `rgba(95,138,72,${Math.max(alpha, 0.18)})`,
      backgroundColor: `rgba(95,138,72,${alpha})`,
      color: "#335A2A"
    };
  };

  const toneForLabel = (label: string) => {
    if (label === "breakout" || label === "new" || label === "rising") return "text-[#4A678F] bg-[#F4F9FC] border-[#99ADC6]";
    if (label === "declining") return "text-[#CB693A] bg-[#CB693A]/10 border-[#CB693A]/20";
    return "text-[#4A678F] bg-white border-[#99ADC6]/60";
  };

  const scoreBarStyle = () => "#CB693A";

  return (
    <div className="overflow-hidden border border-[#99ADC6]/45 bg-white">
      <div className="border-b border-[#99ADC6]/45 bg-[#F4F9FC] px-5 py-4">
        <h3 className="text-lg font-semibold text-[#4A678F]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white text-[#4A678F]/80">
            <tr>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]">Signal</th>
              {showSource ? <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]">Source</th> : null}
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]">
                <span title={headerHelp.score} className="cursor-help">Score</span>
              </th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]">
                <span title={headerHelp.trend} className="cursor-help">Trend</span>
              </th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]">
                <span title={headerHelp.momentum} className="cursor-help">Momentum</span>
              </th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]">
                <span title={headerHelp.highlights} className="cursor-help">Highlights</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#99ADC6]/25 bg-white">
            {rows.map((row) => {
              const momentum = (() => {
                if (row.source === "gsc") return row.metrics.clicks ?? row.metrics.impressions ?? null;
                if (row.source === "ga4") return row.metrics.searches ?? row.metrics.repeatRate ?? null;
                if (row.source === "reddit") return row.metrics.redditVelocity ?? null;
                if (row.source === "facebook") return row.metrics.facebookVelocity ?? null;
                if (row.source === "google-trends") return row.metrics.googleTrendsVelocity ?? null;
                if (row.source === "google-news") return row.metrics.googleNewsVelocity ?? null;
                return null;
              })();

              const scoreWidth = Math.max(Math.min(Math.abs(row.trendScore), 100), 8);

              return (
                <tr key={row.id} className="align-top">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#4A678F]">{row.term}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#99ADC6]">{row.context ?? row.timeWindow}</div>
                  </td>
                  {showSource ? (
                    <td className="px-5 py-4">
                      <SourceBadge source={row.source} label={row.sourceLabel} />
                    </td>
                  ) : null}
                  <td className="px-5 py-4">
                    {scoreMode === "bar" ? (
                      <div className="min-w-[220px]">
                        <div className="relative h-8 border border-[#99ADC6]/25 bg-[#F4F9FC]">
                          <div
                            className="absolute inset-y-0 left-0 border-r border-white/35"
                            style={{
                              width: `${scoreWidth}%`,
                              background: scoreBarStyle()
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-semibold uppercase tracking-[0.05em] text-[#4A678F]">
                            <span>{row.trendLabel}</span>
                            <span>{formatTrendScore(row.trendScore)}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className={`inline-flex border px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] ${toneForValue(row.trendScore)}`}>
                        {formatTrendScore(row.trendScore)}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex border px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] ${toneForLabel(row.trendLabel)}`}>
                      {row.trendLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {momentum === null || momentum === 0 ? (
                      <span className="inline-flex border border-[#99ADC6]/25 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#99ADC6]">
                        N/A
                      </span>
                    ) : (
                      <span
                        className="inline-flex border px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em]"
                        style={momentumTone(momentum)}
                      >
                        {formatPercentDelta(momentum)}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {row.flags.map((flag) => (
                        <span key={flag} className="border border-[#99ADC6]/35 bg-[#F4F9FC] px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-[#4A678F]/75">
                          {titleCaseFromSlug(flag)}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
