import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Header } from "../components/Header";
import { SourceBadge } from "../components/SourceBadge";
import { loadDashboardData } from "../lib/data";
import { formatNumber } from "../lib/format";
import { evaluateStoryTopic, type StoryEvaluatorData } from "../lib/storyEvaluator";
import type {
  DashboardData,
  GoogleNewsTrendRow,
  NormalizedSignalRow,
  RedditPostRow,
  RedditTrendClusterRow,
  SourceType,
  TrendLabel
} from "../lib/types";

interface ConsensusTopic {
  id: string;
  term: string;
  normalizedTerm: string;
  score: number;
  averageSignalScore: number;
  sourceCount: number;
  status: "strong" | "watch" | "early";
  labels: TrendLabel[];
  sources: SourceType[];
  rows: NormalizedSignalRow[];
  flags: string[];
  storyLink?: { headline: string; url: string; source: SourceType };
  evidence: string[];
  displaySignalCount?: number;
  redditCluster?: RedditTrendClusterRow;
}

const EXCLUDED_TOPICS = new Set(["puppy mills", "puppy mills map"]);
const MIN_CONSENSUS_SIGNALS = 3;

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatSourceFamily(source: SourceType): string {
  if (source === "ga4") return "GA4";
  if (source === "gsc") return "GSC";
  if (source === "google-news") return "Google News";
  if (source === "google-trends") return "Google Trends";
  if (source === "facebook") return "Facebook";
  return "Reddit";
}

function comparableTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .map((token) => (token.endsWith("s") && token.length > 4 ? token.slice(0, -1) : token));
}

function termsAreRelated(left: string, right: string): boolean {
  const a = left.trim().toLowerCase();
  const b = right.trim().toLowerCase();
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const aTokens = comparableTokens(a);
  const bTokens = comparableTokens(b);
  if (!aTokens.length || !bTokens.length) return false;

  const overlap = aTokens.filter((token) => bTokens.includes(token));
  const shorter = Math.min(aTokens.length, bTokens.length);
  return overlap.length >= 2 && overlap.length / shorter >= 0.66;
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function toneForStatus(status: ConsensusTopic["status"]): string {
  if (status === "strong") return "border-[#CB693A]/20 bg-[#CB693A]/10 text-[#9A4D26]";
  if (status === "watch") return "border-[#D9B24C]/35 bg-[#FFF5D6] text-[#8A6A12]";
  return "border-[#99ADC6]/40 bg-white text-[#4A678F]/78";
}

function labelForStatus(status: ConsensusTopic["status"]): string {
  if (status === "strong") return "Act now";
  if (status === "watch") return "Watch closely";
  return "Early signal";
}

function summarizeEvidence(rows: NormalizedSignalRow[]): string[] {
  return rows.slice(0, 3).map((row) => {
    if (row.source === "ga4") {
      return `${row.sourceLabel} search demand is up ${(row.metrics.searches ?? 0).toFixed(0)}%.`;
    }
    if (row.source === "gsc") {
      return `${row.sourceLabel} search visibility is up ${Math.max(row.metrics.clicks ?? 0, row.metrics.impressions ?? 0).toFixed(0)}%.`;
    }
    if (row.source === "reddit") {
      return `Reddit is ${row.trendLabel} across one-week subreddit conversation, with ${(row.metrics.redditVelocity ?? 0).toFixed(0)} momentum.`;
    }
    if (row.source === "facebook") {
      return `Facebook engagement movement is up ${(row.metrics.facebookVelocity ?? 0).toFixed(0)}%.`;
    }
    if (row.source === "google-trends") {
      return `Google Trends momentum is up ${(row.metrics.googleTrendsVelocity ?? 0).toFixed(0)}%.`;
    }
    return `Google News coverage momentum is up ${(row.metrics.googleNewsVelocity ?? 0).toFixed(0)}%.`;
  });
}

function pickTopicTerm(rows: NormalizedSignalRow[]): string {
  const preferred = rows.find((row) => row.source === "reddit")
    ?? rows.find((row) => row.source === "google-news")
    ?? [...rows].sort((a, b) => a.term.length - b.term.length)[0];
  return titleCase(preferred?.term ?? rows[0]?.normalizedTerm ?? "");
}

function bestMatchingRedditCluster(
  normalizedTerm: string,
  clusters: RedditTrendClusterRow[] | undefined
): RedditTrendClusterRow | undefined {
  return clusters?.find((cluster) => termsAreRelated(cluster.normalizedTerm, normalizedTerm));
}

function formatTrendDirection(direction: RedditTrendClusterRow["direction"]): string {
  if (direction === "accelerating") return "Accelerating";
  if (direction === "cooling") return "Cooling";
  if (direction === "steady") return "Steady";
  return "Rising";
}

function trimHeadline(value: string, maxLength = 88): string {
  const cleaned = value.replace(/\s*\([^)]*\)\s*$/g, "").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trimEnd()}...`;
}

function cleanTrendHeadline(value: string): string {
  return value
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/[^\p{L}\p{N}\s,.'’:%/-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatFreshnessWindow(hours: number): string {
  if (hours <= 1) return "the last hour";
  if (hours < 24) return `the last ${Math.round(hours)} hours`;
  const days = Math.max(1, Math.round(hours / 24));
  return `the last ${days} day${days === 1 ? "" : "s"}`;
}

function summarizeEmergingSignal(cluster: RedditTrendClusterRow): string {
  const headline = trimHeadline(cleanTrendHeadline(cluster.urls?.[0]?.title ?? cluster.label), 96);
  const momentumPhrase =
    cluster.direction === "accelerating"
      ? "is breaking out"
      : cluster.direction === "rising"
        ? "is gaining traction"
        : cluster.direction === "cooling"
          ? "is losing momentum"
          : "is holding steady";

  return `${headline} ${momentumPhrase}, with fresh engagement building over ${formatFreshnessWindow(cluster.freshnessHours)}.`;
}

function buildRedditFallbackTopics(data: DashboardData): ConsensusTopic[] {
  return (data.reddit.trendClusters ?? [])
    .filter((cluster) => !EXCLUDED_TOPICS.has(cluster.normalizedTerm))
    .sort((a, b) => b.momentumScore - a.momentumScore)
    .slice(0, 8)
    .map((cluster) => {
      const score = Math.min(100, Math.round(cluster.momentumScore));
      const status: ConsensusTopic["status"] =
        cluster.direction === "accelerating" || cluster.direction === "rising" ? "strong" : "watch";

      return {
        id: `${cluster.id}-fallback`,
        term: cluster.label,
        normalizedTerm: cluster.normalizedTerm,
        score,
        averageSignalScore: cluster.momentumScore,
        sourceCount: 1,
        status,
        labels: [cluster.trendLabel],
        sources: ["reddit"],
        rows: [],
        flags: ["community-topic", `reddit-${cluster.direction}`],
        evidence: [
          `${cluster.postCount} posts across ${cluster.subredditCount} subreddits are clustering around this theme.`,
          `${formatNumber(cluster.totalScore)} total score and ${formatNumber(cluster.totalComments)} comments are keeping it active.`,
          `The freshest matching post landed within ${cluster.freshnessHours} hours.`
        ],
        storyLink: cluster.urls?.[0]
          ? {
              headline: cluster.urls[0].title,
              url: cluster.urls[0].url || `https://reddit.com${cluster.urls[0].permalink}`,
              source: "reddit"
            }
          : undefined,
        displaySignalCount: cluster.postCount,
        redditCluster: cluster
      };
    });
}

function bestStoryLink(
  normalizedTerm: string,
  newsKeywords: GoogleNewsTrendRow[],
  redditPosts: RedditPostRow[]
): ConsensusTopic["storyLink"] | undefined {
  const matchingNews = newsKeywords.find((row) => row.normalizedTerm === normalizedTerm && row.sampleStories?.length);
  if (matchingNews?.sampleStories?.[0]) {
    return {
      headline: matchingNews.sampleStories[0].headline,
      url: matchingNews.sampleStories[0].url,
      source: "google-news"
    };
  }

  const redditMatch = redditPosts.find((post) => post.title.toLowerCase().includes(normalizedTerm));
  if (redditMatch) {
    return {
      headline: redditMatch.title,
      url: redditMatch.url || `https://reddit.com${redditMatch.permalink}`,
      source: "reddit"
    };
  }

  return undefined;
}

function buildConsensusTopics(data: DashboardData): ConsensusTopic[] {
  const grouped = new Map<string, NormalizedSignalRow[]>();

  data.signals.signals.forEach((row) => {
    const matchingKey = [...grouped.keys()].find((key) => termsAreRelated(key, row.normalizedTerm));
    const groupKey = matchingKey ?? row.normalizedTerm;
    const existing = grouped.get(groupKey) ?? [];
    existing.push(row);
    grouped.set(groupKey, existing);
  });

  const topics = [...grouped.entries()]
    .filter(([normalizedTerm]) => !EXCLUDED_TOPICS.has(normalizedTerm))
    .map(([normalizedTerm, rows]) => {
      const sortedRows = [...rows].sort((a, b) => b.trendScore - a.trendScore);
      const averageSignalScore = sortedRows.reduce((sum, row) => sum + row.trendScore, 0) / sortedRows.length;
      const sourceCount = new Set(sortedRows.map((row) => row.source)).size;
      const labels = [...new Set(sortedRows.map((row) => row.trendLabel))];
      const flags = [...new Set(sortedRows.flatMap((row) => row.flags))].slice(0, 5);
      const breakoutCount = sortedRows.filter((row) => row.trendLabel === "breakout" || row.trendLabel === "new").length;
      const score = Math.min(100, Math.round(averageSignalScore * 1.55 + sourceCount * 12 + breakoutCount * 8));
      const status: ConsensusTopic["status"] =
        score >= 62 || (sourceCount >= 3 && averageSignalScore >= 18) ? "strong" : score >= 38 || sourceCount >= 2 ? "watch" : "early";

      const redditCluster = bestMatchingRedditCluster(normalizedTerm, data.reddit.trendClusters);
      return {
        id: normalizedTerm,
        term: pickTopicTerm(sortedRows),
        normalizedTerm,
        score,
        averageSignalScore,
        sourceCount,
        status,
        labels,
        sources: [...new Set(sortedRows.map((row) => row.source))],
        rows: sortedRows,
        flags,
        evidence: summarizeEvidence(sortedRows),
        storyLink: bestStoryLink(normalizedTerm, data.googleNews.keywords, data.reddit.posts),
        redditCluster
      };
    })
    .filter((topic) => topic.sourceCount >= MIN_CONSENSUS_SIGNALS)
    .sort((a, b) => b.score - a.score);

  if (topics.length > 0) return topics;

  const redditFallbacks = buildRedditFallbackTopics(data);
  return redditFallbacks;
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="border border-[#99ADC6]/40 bg-white px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#99ADC6]">{label}</p>
      <p className="mt-2 text-[1.6rem] font-semibold leading-tight text-[#111111]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#4A678F]/76">{note}</p>
    </article>
  );
}

function StoryTimingCard({ evaluatorData }: { evaluatorData: StoryEvaluatorData }) {
  const [query, setQuery] = useState("Miami Cockfighting Ring");
  const [submittedQuery, setSubmittedQuery] = useState("Miami Cockfighting Ring");

  const evaluation = useMemo(() => {
    const trimmed = submittedQuery.trim();
    if (!trimmed) return null;
    return evaluateStoryTopic(trimmed, evaluatorData);
  }, [evaluatorData, submittedQuery]);

  return (
    <div>
      <div className="mt-4 space-y-4">
        <form
          className="px-0"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedQuery(query);
          }}
        >
          <div className="mt-3 flex flex-col gap-3">
            <input
              id="story-timing-input"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Miami Cockfighting Ring"
              className="min-w-0 w-full border border-[#99ADC6]/40 bg-white px-4 py-4 text-base text-[#111111] outline-none transition focus:border-[#4A678F]"
            />
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center border border-[#4A678F] bg-[#4A678F] px-4 py-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#395372]"
            >
              Check
            </button>
          </div>
        </form>

        {evaluation ? (
          <div className="px-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${evaluation.worthPosting ? "border-[#99ADC6] bg-[#F4F9FC] text-[#4A678F]" : "border-[#CB693A]/25 bg-[#CB693A]/10 text-[#9A4D26]"}`}>
                {evaluation.worthPosting ? "Good time to publish" : "Not a good time to publish"}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[#4A678F]/78">
              {evaluation.worthPosting
                ? `${evaluation.query} has enough signal support to publish now.`
                : `${evaluation.query} does not have enough signal support to publish yet.`}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);
  const [activeTopTab, setActiveTopTab] = useState<"consensus" | "story">("consensus");

  useEffect(() => {
    loadDashboardData()
      .then((payload) => setData(payload))
      .catch((loadError: Error) => setError(loadError.message));
  }, []);

  const consensusTopics = useMemo(() => (data ? buildConsensusTopics(data) : []), [data]);

  if (error) return <ErrorState message={error} />;
  if (!data) {
    return <EmptyState title="Loading signal files" body="The dashboard is reading committed JSON from /public/data." />;
  }

  const leadTopic = consensusTopics[0];
  const actNowCount = consensusTopics.filter((topic) => topic.status === "strong").length;
  const watchCloselyCount = consensusTopics.filter((topic) => topic.status === "watch").length;
  const watchTopics = consensusTopics.slice(0, 8);
  const topRedditTrend = [...(data.reddit.trendClusters ?? [])].sort((a, b) => b.momentumScore - a.momentumScore)[0];
  const evaluatorData: StoryEvaluatorData = {
    gscFiles: [data.gscSiteA, data.gscSiteB, data.gscCombined],
    ga4Files: [data.ga4SiteA, data.ga4SiteB, data.ga4Combined],
    googleNews: data.googleNews,
    facebookInsights: data.facebookInsights,
    googleTrends: data.googleTrends
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <Header />

        <section className="border border-[#99ADC6]/40 bg-white">
          <div className="flex border-b border-[#99ADC6]/30 px-5 pt-5 sm:px-6">
            <button
              type="button"
              onClick={() => setActiveTopTab("consensus")}
              className={`border border-[#99ADC6]/30 px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                activeTopTab === "consensus" ? "border-b-[#F7FAFC] bg-[#F7FAFC] text-[#111111]" : "bg-white text-[#99ADC6]"
              }`}
            >
              Consensus View
            </button>
            <button
              type="button"
              onClick={() => setActiveTopTab("story")}
              className={`-ml-px border border-[#99ADC6]/30 px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] transition ${
                activeTopTab === "story" ? "border-b-[#F7FAFC] bg-[#F7FAFC] text-[#111111]" : "bg-white text-[#99ADC6]"
              }`}
            >
              Story View
            </button>
          </div>

          <div className="px-5 py-5 sm:px-6">
            {activeTopTab === "consensus" ? (
              <>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-3xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#99ADC6]">Consensus View</p>
                    <h2 className="mt-2 text-[1.7rem] font-semibold leading-tight text-[#111111]">Rising Across Signals</h2>
                    <p className="mt-2 text-sm leading-6 text-[#4A678F]/78">
                      Consensus View surfaces topics confirmed across multiple platforms, with each item calling out exactly how many signal families are lining up behind it.
                    </p>
                  </div>
                  <div className="self-start lg:self-start">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4A678F]/66">Updated {formatUpdatedAt(data.signals.generatedAt)}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <MetricCard
                    label="Lead Topic"
                    value={leadTopic ? leadTopic.term : "No trend yet"}
                    note={
                      leadTopic
                        ? `Across ${leadTopic.sourceCount} Signal Families: ${leadTopic.sources.map(formatSourceFamily).join(", ")}.`
                        : "Waiting on enough aligned signals to form a real consensus."
                    }
                  />
                  <MetricCard label="Act Now" value={formatNumber(actNowCount)} note="Topics with enough momentum to justify immediate attention." />
                  <MetricCard
                    label="Watch Closely"
                    value={formatNumber(watchCloselyCount)}
                    note="Topics gaining traction across signals that merit monitoring before they move into immediate action."
                  />
                </div>

                {topRedditTrend ? (
                  <div className="mt-4 border border-[#99ADC6]/28 bg-[#F7FAFC] px-4 py-4 sm:px-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#99ADC6]">Emerging Signal</p>
                    <p className="mt-2 text-sm leading-6 text-[#4A678F]/82">
                      {summarizeEmergingSignal(topRedditTrend)}
                    </p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="max-w-3xl">
                <h2 className="text-[1.7rem] font-semibold leading-tight text-[#111111]">Story Timing</h2>
                <p className="mt-2 text-sm leading-6 text-[#4A678F]/78">
                  Check a story or campaign idea against current signals mix to see if now is the right time to publish.
                </p>
                <div className="mt-6 max-w-2xl">
                  <StoryTimingCard evaluatorData={evaluatorData} />
                </div>
              </div>
            )}
          </div>
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="border border-[#99ADC6]/40 bg-white">
            <div className="border-b border-[#99ADC6]/30 px-5 py-4 sm:px-6">
              <h3 className="text-xl font-semibold text-[#111111]">Trending Topics</h3>
              <p className="mt-1 text-sm leading-6 text-[#4A678F]/76">
                Each topic is confirmed by at least three signal families.
              </p>
            </div>

            <div className="divide-y divide-[#99ADC6]/22">
              {watchTopics.length > 0 ? watchTopics.map((topic) => {
                const isOpen = openTopicId === topic.id;

                return (
                <article key={topic.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenTopicId(isOpen ? null : topic.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setOpenTopicId(isOpen ? null : topic.id);
                      }
                    }}
                    className="relative block w-full px-5 pb-2 pt-4 text-left sm:px-6"
                  >
                    <div className="relative flex flex-col gap-3 pb-2">
                      <div className="min-w-0 pr-[14rem]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${toneForStatus(topic.status)}`}>
                              {labelForStatus(topic.status)}
                            </span>
                          </div>
                          <h4 className="mt-3 text-xl font-semibold leading-tight text-[#111111]">{topic.term}</h4>
                          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4A678F]/78">
                            {topic.evidence[0]} Across {topic.sourceCount} Signal Families: {topic.sources.map(formatSourceFamily).join(", ")}.
                          </p>
                      </div>

                      <div className="absolute right-5 top-4 sm:right-6">
                        <div className="grid shrink-0 grid-cols-3 gap-3 text-left lg:text-right">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#99ADC6]">Score</p>
                            <p className="mt-2 text-2xl font-semibold text-[#111111]">{topic.score}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#99ADC6]">Sources</p>
                            <p className="mt-2 text-2xl font-semibold text-[#111111]">{topic.sourceCount}</p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#99ADC6]">Signals</p>
                            <p className="mt-2 text-2xl font-semibold text-[#111111]">{topic.displaySignalCount ?? topic.rows.length}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {topic.sources.map((source) => (
                          <SourceBadge key={`${topic.id}-${source}`} source={source} />
                        ))}
                      </div>

                    </div>

                      <span
                        aria-hidden="true"
                        className={`absolute bottom-0 right-0 inline-flex h-8 w-8 shrink-0 items-center justify-center border border-[#99ADC6]/30 bg-[#F4F9FC] text-lg font-semibold leading-none text-[#4A678F] transition ${isOpen ? "rotate-180" : ""}`}
                      >
                        ⌃
                      </span>
                    </div>

                  {isOpen ? (
                  <div className="border-t border-[#99ADC6]/22 bg-[#F7FAFC] px-5 py-4 sm:px-6">
                    <div>
                      <p className="mb-3 px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#99ADC6]">Signals</p>

                      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <div className="h-full border border-[#99ADC6]/28 bg-white px-4 py-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#99ADC6]">Details</p>
                          {topic.rows.length > 0 ? (
                            <div className="mt-3 space-y-3">
                              {topic.rows.map((row) => (
                                <div key={row.id} className="border border-[#99ADC6]/28 bg-[#F7FAFC] px-4 py-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <SourceBadge source={row.source} label={row.sourceLabel} />
                                    <span className="inline-flex border border-[#99ADC6]/28 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4A678F]">
                                      {row.trendLabel}
                                    </span>
                                    <span className="text-xs text-[#4A678F]/62">Raw score {row.trendScore.toFixed(1)}</span>
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-[#4A678F]/78">{row.context ?? row.timeWindow}</p>
                                </div>
                              ))}
                              {topic.redditCluster ? (
                                <div className="border border-[#99ADC6]/28 bg-[#F7FAFC] px-4 py-3">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <SourceBadge source="reddit" />
                                    <span className="inline-flex border border-[#99ADC6]/28 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#4A678F]">
                                      {topic.redditCluster.direction}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm leading-6 text-[#4A678F]/78">
                                    Best rank #{topic.redditCluster.bestRank}, {topic.redditCluster.totalScore} combined score, {topic.redditCluster.totalComments} comments, {topic.redditCluster.postCount} grouped URLs inside the last week.
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <ul className="mt-3 space-y-2 text-sm leading-6 text-[#4A678F]/78">
                              {topic.evidence.map((item) => (
                                <li key={`${topic.id}-${item}`}>{item}</li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="flex h-full flex-col gap-4">
                          <div className="h-full border border-[#99ADC6]/28 bg-white px-4 py-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#99ADC6]">Stories</p>
                            <div className="mt-3 space-y-2 text-sm">
                              {topic.redditCluster?.urls?.length ? (
                                topic.redditCluster.urls.slice(0, 3).map((story) => (
                                  <a
                                    key={story.postId}
                                    href={story.url || `https://reddit.com${story.permalink}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="block font-semibold text-[#4A678F] hover:text-[#CB693A]"
                                  >
                                    {story.url || `https://reddit.com${story.permalink}`}
                                  </a>
                                ))
                              ) : topic.rows.length === 0 ? (
                                <>
                                  <a href="https://example.com/seattle-factory-farming-protest" target="_blank" rel="noreferrer" className="block font-semibold text-[#4A678F] hover:text-[#CB693A]">
                                    https://example.com/seattle-factory-farming-protest
                                  </a>
                                  <a href="https://example.com/animal-testing-campaign-update" target="_blank" rel="noreferrer" className="block font-semibold text-[#4A678F] hover:text-[#CB693A]">
                                    https://example.com/animal-testing-campaign-update
                                  </a>
                                  <a href="https://example.com/fur-ban-legislation-watch" target="_blank" rel="noreferrer" className="block font-semibold text-[#4A678F] hover:text-[#CB693A]">
                                    https://example.com/fur-ban-legislation-watch
                                  </a>
                                </>
                              ) : null}
                            </div>
                          </div>

                          {topic.storyLink ? (
                            <div className="border border-[#99ADC6]/28 bg-white px-4 py-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#99ADC6]">Story Link</p>
                              <a
                                href={topic.storyLink.url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 inline-flex items-start gap-2 text-sm font-semibold leading-6 text-[#4A678F] hover:text-[#CB693A]"
                              >
                                <span>{topic.storyLink.headline}</span>
                                <span aria-hidden="true" className="mt-[2px] text-xs">↗</span>
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                  ) : null}
                </article>
              )}) : (
                <div className="px-5 py-8 sm:px-6">
                  <EmptyState
                    title="No consensus topics yet"
                    body={`This view now requires at least ${MIN_CONSENSUS_SIGNALS} distinct signal families to agree before a topic appears.`}
                  />
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="border border-[#99ADC6]/40 bg-white">
              <div className="px-5 py-5">
                <p className="px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#99ADC6]">Editorial Queue</p>
                <div className="mt-4 space-y-4">
                  {data.summary.storyIdeas.slice(0, 3).map((idea) => (
                    <article key={idea.id} className="border border-[#99ADC6]/28 bg-[#F7FAFC] px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#99ADC6]">{idea.category}</p>
                      <h4 className="mt-2 text-base font-semibold leading-tight text-[#111111]">{idea.headline}</h4>
                      <p className="mt-2 text-sm leading-6 text-[#4A678F]/76">{idea.rationale}</p>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="border border-[#99ADC6]/40 bg-white px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#99ADC6]">Method</p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-[#4A678F]/78">
                <p>Topics are merged by normalized phrase across search, site demand, community, social, and news inputs.</p>
                <p>The consensus score rewards source agreement and strong movement, so the top of the list reflects confidence, not just noise.</p>
              </div>
            </section>
          </aside>
        </div>

        <div className="px-1 text-left text-xs text-[#4A678F]/66">© 2026 Center for a Humane Economy | Animal Wellness Action</div>
      </div>
    </div>
  );
}
