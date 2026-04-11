import { formatPercentDelta, formatTrendScore } from "../lib/format";
import type { NormalizedSignalRow } from "../lib/types";
import { SourceBadge } from "./SourceBadge";

interface TrendTableProps {
  title: string;
  rows: NormalizedSignalRow[];
}

export function TrendTable({ title, rows }: TrendTableProps) {
  const maxScore = Math.max(...rows.map((r) => r.trendScore), 1);

  const barColor = (score: number) => {
    const pct = score / maxScore;
    if (pct >= 0.7) return "#4A678F";
    if (pct >= 0.4) return "#6883A0";
    return "#99ADC6";
  };

  const toneForValue = (value: number) => {
    if (value > 0) return "border-[#99ADC6] text-[#4A678F] bg-[#F4F9FC]";
    if (value < 0) return "border-[#CB693A]/20 text-[#CB693A] bg-[#CB693A]/10";
    return "text-[#4A678F] bg-white";
  };

  const toneForLabel = (label: string) => {
    if (label === "breakout" || label === "new" || label === "rising") return "text-[#4A678F] bg-[#F4F9FC] border-[#99ADC6]";
    if (label === "declining") return "text-[#CB693A] bg-[#CB693A]/10 border-[#CB693A]/20";
    return "text-[#4A678F] bg-white border-[#99ADC6]/60";
  };

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
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]">Source</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] min-w-[180px]">Score</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]">Trend</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]">Momentum</th>
              <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.14em]">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#99ADC6]/25 bg-white">
            {rows.map((row) => {
              const momentum =
                row.metrics.impressions ??
                row.metrics.searches ??
                row.metrics.redditVelocity ??
                row.metrics.googleTrendsVelocity ??
                row.metrics.googleNewsVelocity ??
                0;

              const barPct = Math.max((row.trendScore / maxScore) * 100, 2);
              const color = barColor(row.trendScore);

              return (
                <tr key={row.id} className="align-top">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-[#4A678F]">{row.term}</div>
                    <div className="mt-1 text-[11px] uppercase tracking-[0.08em] text-[#99ADC6]">{row.context ?? row.timeWindow}</div>
                  </td>
                  <td className="px-5 py-4">
                    <SourceBadge source={row.source} label={row.sourceLabel} />
                  </td>
                  <td className="px-5 py-4 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 h-[22px] bg-[#F4F9FC] overflow-hidden" style={{ border: "1px solid rgba(153,173,198,0.3)" }}>
                        <div
                          className="absolute left-0 top-0 h-full"
                          style={{ width: `${barPct}%`, backgroundColor: color }}
                        />
                        <span className="absolute inset-0 flex items-center px-2 text-[11px] font-semibold text-white">
                          {formatTrendScore(row.trendScore)}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex border px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] ${toneForLabel(row.trendLabel)}`}>
                      {row.trendLabel}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex border px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] ${toneForValue(momentum)}`}>
                      {formatPercentDelta(momentum)}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {row.flags.map((flag) => (
                        <span key={flag} className="border border-[#99ADC6]/35 bg-[#F4F9FC] px-3 py-1 text-[11px] uppercase tracking-[0.08em] text-[#4A678F]/75">
                          {flag}
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
