import { formatPercentDelta, formatTrendScore } from "../lib/format";
import type { NormalizedSignalRow } from "../lib/types";
import { SourceBadge } from "./SourceBadge";

interface TrendTableProps {
  title: string;
  rows: NormalizedSignalRow[];
}

export function TrendTable({ title, rows }: TrendTableProps) {
  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-moss/10">
      <div className="border-b border-moss/10 bg-sand/70 px-5 py-4">
        <h3 className="font-display text-xl text-ink">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/70 text-moss">
            <tr>
              <th className="px-5 py-3 font-medium">Signal</th>
              <th className="px-5 py-3 font-medium">Source</th>
              <th className="px-5 py-3 font-medium">Score</th>
              <th className="px-5 py-3 font-medium">Trend</th>
              <th className="px-5 py-3 font-medium">Momentum</th>
              <th className="px-5 py-3 font-medium">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-moss/10 bg-white">
            {rows.map((row) => {
              const momentum =
                row.metrics.impressions ??
                row.metrics.searches ??
                row.metrics.redditVelocity ??
                row.metrics.googleTrendsVelocity ??
                row.metrics.googleNewsVelocity ??
                0;

              return (
                <tr key={row.id}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-ink">{row.term}</div>
                    <div className="mt-1 text-xs text-moss/70">{row.context ?? row.timeWindow}</div>
                  </td>
                  <td className="px-5 py-4">
                    <SourceBadge source={row.source} label={row.sourceLabel} />
                  </td>
                  <td className="px-5 py-4 font-semibold text-ink">{formatTrendScore(row.trendScore)}</td>
                  <td className="px-5 py-4 capitalize text-moss">{row.trendLabel}</td>
                  <td className="px-5 py-4 text-moss">{formatPercentDelta(momentum)}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {row.flags.map((flag) => (
                        <span key={flag} className="rounded-full bg-moss/8 px-3 py-1 text-xs text-moss">
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
