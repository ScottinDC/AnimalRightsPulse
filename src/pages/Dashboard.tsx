import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Header } from "../components/Header";
import { SectionShell } from "../components/SectionShell";
import { StoryIdeasPanel } from "../components/StoryIdeasPanel";
import { SummaryCards } from "../components/SummaryCards";
import { TrendChart } from "../components/TrendChart";
import { TrendTable } from "../components/TrendTable";
import { loadDashboardData } from "../lib/data";
import { formatNumber } from "../lib/format";
import type { DashboardData, GoogleNewsTrendRow, GoogleTrendsRow, NormalizedSignalRow, RedditPostRow, SiteScope } from "../lib/types";

function toSeriesPoints(row: GoogleTrendsRow | GoogleNewsTrendRow) {
  return row.series.map((point) => ({
    label: point.timestamp.slice(5),
    value: point.value
  }));
}

function siteLabel(site: SiteScope): string {
  if (site === "site-a") return "CHE";
  if (site === "site-b") return "AWA";
  return "Global";
}

function ga4SiteLabel(site: SiteScope): string {
  if (site === "site-a") return "CHE Site Search";
  if (site === "site-b") return "AWA Site Search";
  return "Global";
}

function topPosts(posts: RedditPostRow[]) {
  return [...posts].sort((a, b) => b.velocityScore - a.velocityScore).slice(0, 5);
}

const MOCK_GSC_ROWS = {
  "site-a": [
    { term: "animal testing cosmetics", page: "/animal-testing-cosmetics", trendLabel: "rising" },
    { term: "state fur bans", page: "/fur-ban-laws", trendLabel: "breakout" },
    { term: "puppy mills map", page: "/puppy-mills-map", trendLabel: "steady" }
  ],
  "site-b": [
    { term: "factory farming protest", page: "/factory-farming-protests", trendLabel: "rising" },
    { term: "wildlife trafficking law", page: "/wildlife-trafficking", trendLabel: "breakout" },
    { term: "marine mammal captivity", page: "/marine-mammals", trendLabel: "steady" }
  ]
} as const;

const MOCK_GSC_SIGNALS: NormalizedSignalRow[] = [
  {
    id: "mock-gsc-che-animal-testing",
    term: "animal testing cosmetics",
    normalizedTerm: "animal testing cosmetics",
    source: "gsc",
    site: "site-a",
    sourceLabel: "GSC CHE",
    trendScore: 28.4,
    trendLabel: "rising",
    crossSourceCount: 1,
    timeWindow: "mock-gsc",
    metrics: { impressions: 82.4, sourceCount: 1, novelty: 1 },
    flags: ["search growth", "page opportunity"],
    context: "/animal-testing-cosmetics"
  },
  {
    id: "mock-gsc-awa-factory-farming",
    term: "factory farming protest",
    normalizedTerm: "factory farming protest",
    source: "gsc",
    site: "site-b",
    sourceLabel: "GSC AWA",
    trendScore: 24.1,
    trendLabel: "breakout",
    crossSourceCount: 1,
    timeWindow: "mock-gsc",
    metrics: { impressions: 74.8, sourceCount: 1, novelty: 1 },
    flags: ["search growth", "editorial gap"],
    context: "/factory-farming-protests"
  },
  {
    id: "mock-gsc-che-fur-bans",
    term: "state fur bans",
    normalizedTerm: "state fur bans",
    source: "gsc",
    site: "site-a",
    sourceLabel: "GSC CHE",
    trendScore: 19.7,
    trendLabel: "steady",
    crossSourceCount: 1,
    timeWindow: "mock-gsc",
    metrics: { impressions: 49.2, sourceCount: 1, novelty: 0 },
    flags: ["page opportunity"],
    context: "/fur-ban-laws"
  }
];

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrendsKeyword, setSelectedTrendsKeyword] = useState(0);
  const [selectedNewsKeyword, setSelectedNewsKeyword] = useState(0);
  const [selectedPeriod, setSelectedPeriod] = useState("last-30-days");

  useEffect(() => {
    loadDashboardData()
      .then((payload) => setData(payload))
      .catch((loadError: Error) => setError(loadError.message));
  }, []);

  const filteredSignals = useMemo(() => {
    if (!data) return [];
    return [...data.signals.signals].sort((a, b) => b.trendScore - a.trendScore);
  }, [data]);

  const topSignals = useMemo(() => filteredSignals.slice(0, 15), [filteredSignals]);

  if (error) return <ErrorState message={error} />;
  if (!data) {
    return <EmptyState title="Loading signal files" body="The dashboard is reading committed JSON from /public/data." />;
  }

  const gscSignals = filteredSignals.filter((signal) => signal.source === "gsc").slice(0, 8);
  const ga4Signals = filteredSignals.filter((signal) => signal.source === "ga4").slice(0, 8);
  const redditSignals = filteredSignals.filter((signal) => signal.source === "reddit").slice(0, 8);
  const facebookSignals = filteredSignals.filter((signal) => signal.source === "facebook").slice(0, 8);
  const googleNewsSignals = filteredSignals.filter((signal) => signal.source === "google-news").slice(0, 8);

  const googleTrendsLead = data.googleTrends.keywords[selectedTrendsKeyword] ?? data.googleTrends.keywords[0];
  const googleNewsLead = data.googleNews.keywords[selectedNewsKeyword] ?? data.googleNews.keywords[0];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-5 sm:px-5 lg:px-7">
      <Header />

      <SectionShell
        id="overview"
        title="Overview"
        subtitle="Rule-based scoring merges committed source files into a single editorial view without any live browser-side API calls."
        headerDivider={false}
        topDivider={false}
        actions={
          <label className="flex items-center gap-3 self-start lg:self-end">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#99ADC6]">Time Period</span>
            <select
              value={selectedPeriod}
              onChange={(event) => setSelectedPeriod(event.target.value)}
              className="border border-[#99ADC6]/35 bg-white px-3 py-2 text-sm text-[#4A678F] outline-none transition focus:border-[#4A678F]"
              aria-label="Select time period"
            >
              <option value="last-7-days">Last 7 Days</option>
              <option value="last-14-days">Last 14 Days</option>
              <option value="last-30-days">Last 30 Days</option>
              <option value="last-90-days">Last 90 Days</option>
            </select>
          </label>
        }
      >
        <SummaryCards cards={data.summary.summaryCards} />
        <div className="mt-6">
          {topSignals.length > 0 ? (
            <TrendTable title="Rising Signals" rows={topSignals} scoreMode="bar" />
          ) : (
            <EmptyState title="No normalized signals yet" body="Signals will appear here after the next successful pipeline run." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="gsc"
        eyebrow="Google Search"
        title="Organic Search Growth"
        subtitle="These rows come from Search Console comparison windows, preserving site scope, page context, and the reality that GSC only returns top rows rather than a complete long tail."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {[data.gscSiteA, data.gscSiteB].map((file) => {
            const fallbackRows = MOCK_GSC_ROWS[file.site as "site-a" | "site-b"] ?? [];
            const visibleRows = file.queries.length > 0 ? file.queries.slice(0, 5) : fallbackRows;

            return (
            <article key={file.site} className="border border-[#99ADC6]/45 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold text-ink">{siteLabel(file.site)}</h3>
              </div>
              <div className="mt-4 space-y-3">
                {visibleRows.map((query) => (
                  <div key={`${file.site}-${query.term}`} className="border border-[#99ADC6]/25 bg-[#F4F9FC] px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-ink">{query.term}</p>
                        <p className="mt-1 text-xs text-moss/70">{query.page ?? "Top matching page not assigned"}</p>
                      </div>
                      <span className="border border-[#99ADC6]/35 bg-white px-3 py-1 text-xs uppercase tracking-[0.05em] text-[#4A678F]">{query.trendLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          )})}
        </div>
        <div className="mt-6">
          <TrendTable title="Combined overlaps and page opportunities" rows={gscSignals.length > 0 ? gscSignals : MOCK_GSC_SIGNALS} scoreMode="bar" />
        </div>
      </SectionShell>

      <SectionShell
        id="ga4"
        eyebrow="Internal Site Search"
        title="Internal Site Queries"
        subtitle="GA4 internal search signals are modeled separately from external search demand so editorial gaps and information architecture issues stay visible."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {[data.ga4SiteA, data.ga4SiteB].map((file) => (
            <article key={file.site} className="border border-[#99ADC6]/45 bg-white p-5">
              <h3 className="text-xl font-semibold text-ink">{ga4SiteLabel(file.site)}</h3>
              <div className="mt-4 space-y-3">
                {file.searches.slice(0, 5).map((row) => (
                  <div key={`${file.site}-${row.term}`} className="border border-[#99ADC6]/25 bg-[#F4F9FC] px-4 py-3">
                    <p className="font-semibold text-ink">{row.term}</p>
                    <p className="mt-1 text-xs text-moss/70">
                      Search growth {row.searchGrowthPct.toFixed(1)}% | repeat demand {row.repeatDemandPct.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6">
          {ga4Signals.length > 0 ? (
            <TrendTable title="Internal Search Signals" rows={ga4Signals} scoreMode="bar" />
          ) : (
            <EmptyState title="No internal site-search trends yet" body="GA4 site-search rows will appear here after the next successful fetch." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="reddit"
        eyebrow="Reddit"
        title="r/AnimalRights Momentum"
        subtitle="The Reddit panel tracks recent posts, repeated title phrases, linked domains, and recurring topics while keeping the social signal distinct from site demand."
      >
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="border border-[#99ADC6]/45 bg-white p-5">
            <h3 className="text-xl font-semibold text-ink">Top Posts</h3>
            <div className="mt-4 space-y-4">
              {topPosts(data.reddit.posts).map((post) => (
                <article key={post.id} className="border border-[#99ADC6]/25 bg-[#F4F9FC] px-4 py-4">
                  <a
                    href={post.url || `https://reddit.com${post.permalink}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-start gap-2 font-semibold text-ink hover:text-[#CB693A]"
                  >
                    <span>{post.title}</span>
                    <span aria-hidden="true" className="mt-[1px] text-xs text-[#CB693A]">↗</span>
                  </a>
                  <p className="mt-2 text-xs text-moss/70">
                    {formatNumber(post.score)} score | {formatNumber(post.numComments)} comments | {post.author}
                  </p>
                </article>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="border border-[#99ADC6]/45 bg-white p-5">
              <h3 className="text-lg font-semibold text-ink">Repeated Phrases</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.reddit.repeatedPhrases.slice(0, 10).map((phrase) => (
                  <span key={phrase.phrase} className="border border-[#CB693A]/20 bg-[#CB693A]/10 px-3 py-2 text-xs uppercase tracking-[0.05em] text-ember">
                    {phrase.phrase} ({phrase.count})
                  </span>
                ))}
              </div>
            </div>
            <div className="border border-[#99ADC6]/45 bg-white p-5">
              <h3 className="text-lg font-semibold text-ink">Top Linked Domains</h3>
              <div className="mt-4 space-y-2">
                {data.reddit.linkedDomains.slice(0, 5).map((domain) => (
                  <div key={domain.domain} className="flex items-center justify-between text-sm text-moss">
                    <span>{domain.domain}</span>
                    <span>{domain.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          {redditSignals.length > 0 ? (
            <TrendTable title="Recurring Topics and Phrases" rows={redditSignals} showSource={false} />
          ) : (
            <EmptyState title="No Reddit trend rows yet" body="Reddit topic rows will appear here after the next successful fetch." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="facebook"
        eyebrow="FB Insights"
        title="Facebook Movement"
        subtitle="FB Insights is modeled as its own source family so social engagement can be compared against search, Reddit, and news movement without collapsing the signals together."
      >
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr_1fr]">
          <div className="border border-[#99ADC6]/45 bg-white p-5">
            <h3 className="text-xl font-semibold text-ink">Trending Keywords</h3>
            <div className="mt-4 space-y-3">
              {data.facebookInsights.keywords.slice(0, 5).map((row) => (
                <div key={row.keyword} className="border border-[#99ADC6]/25 bg-[#F4F9FC] px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-ink">{row.keyword}</p>
                    <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#4A678F]">{row.growthPct.toFixed(1)}%</span>
                  </div>
                  <p className="mt-1 text-xs text-moss/70">{formatNumber(row.engagement)} engagements</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-[#99ADC6]/45 bg-white p-5">
            <h3 className="text-xl font-semibold text-ink">Trending Stories</h3>
            <div className="mt-4 space-y-3">
              {data.facebookInsights.stories.map((story) => (
                <article key={story.id} className="border border-[#99ADC6]/25 bg-[#F4F9FC] px-4 py-3">
                  <a href={story.url} target="_blank" rel="noreferrer" className="inline-flex items-start gap-2 font-semibold text-ink hover:text-[#CB693A]">
                    <span>{story.headline}</span>
                    <span aria-hidden="true" className="mt-[1px] text-xs text-[#CB693A]">↗</span>
                  </a>
                  <p className="mt-2 text-xs text-moss/70">
                    {story.keyword} | {formatNumber(story.engagement)} engagements | {story.growthPct.toFixed(1)}% growth
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="border border-[#99ADC6]/45 bg-white p-5">
            <h3 className="text-xl font-semibold text-ink">Keyword Growth</h3>
            <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[#99ADC6]">
              <span>1</span>
              <span>100</span>
            </div>
            <div className="mt-4 space-y-4">
              {data.facebookInsights.keywords.slice(0, 5).map((row) => (
                <div key={`${row.keyword}-bar`} className="space-y-2">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-ink">{row.keyword}</span>
                    <span className="text-xs font-semibold uppercase tracking-[0.05em] text-[#4A678F]">{Math.min(Math.round(row.growthPct), 100)}</span>
                  </div>
                  <div className="relative h-7 border border-[#99ADC6]/25 bg-[#F4F9FC]">
                    <div
                      className="absolute inset-y-0 left-0"
                      style={{
                        width: `${Math.max(Math.min(row.growthPct, 100), 12)}%`,
                        background: "#4A678F"
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6">
          {facebookSignals.length > 0 ? (
            <TrendTable title="Facebook Signals" rows={facebookSignals} showSource={false} />
          ) : (
            <EmptyState title="No Facebook signals yet" body="FB Insights rows will appear here after the next successful fetch." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="google-trends"
        eyebrow="Google Trends"
        title="Interest Over Time"
        subtitle="Google Trends is fetched through Apify on a schedule, then normalized into a stable time-series shape before the frontend reads any local JSON."
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <TrendChart title={googleTrendsLead.keyword} points={toSeriesPoints(googleTrendsLead)} color="#4A678F" />
          <div className="border border-[#99ADC6]/45 bg-white p-5">
            <h3 className="text-xl font-semibold text-ink">Fast-Rising Watchlist Terms</h3>
            <div className="mt-4 space-y-3">
              {data.googleTrends.keywords.slice(0, 6).map((row, index) => (
                <button
                  key={row.keyword}
                  type="button"
                  onClick={() => setSelectedTrendsKeyword(index)}
                  className={`block w-full border px-4 py-3 text-left ${selectedTrendsKeyword === index ? "border-[#4A678F] bg-white" : "border-[#99ADC6]/25 bg-[#F4F9FC]"}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-ink">{row.keyword}</p>
                    {row.breakout ? <span className="border border-[#CB693A]/20 bg-[#CB693A]/10 px-3 py-1 text-xs uppercase tracking-[0.05em] text-ember">breakout</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-moss/70">Momentum {row.momentumPct.toFixed(1)}% | {row.geo}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell
        id="google-news"
        eyebrow="Google News"
        title="News Momentum"
        subtitle="Google News is fetched through Apify, then normalized into topic-level coverage and trend lines that can be compared against search and Reddit demand."
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <TrendChart title={googleNewsLead.keyword} points={toSeriesPoints(googleNewsLead)} color="#CB693A" />
          <div className="border border-[#99ADC6]/45 bg-white p-5">
            <h3 className="text-xl font-semibold text-ink">Rising Google News Topics</h3>
            <div className="mt-4 space-y-3">
              {data.googleNews.keywords.slice(0, 6).map((row, index) => (
                <div
                  key={row.keyword}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedNewsKeyword(index)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedNewsKeyword(index);
                    }
                  }}
                  className={`block w-full cursor-pointer border px-4 py-3 text-left ${selectedNewsKeyword === index ? "border-[#4A678F] bg-white" : "border-[#99ADC6]/25 bg-[#F4F9FC]"}`}
                >
                  <p className="font-semibold text-ink">{row.keyword}</p>
                  <p className="mt-1 text-xs text-moss/70">Movement {row.movementPct.toFixed(1)}% | coverage {row.coverageCount}</p>
                  {row.sampleStories?.length ? (
                    <a
                      href={row.sampleStories[0].url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="mt-2 inline-flex items-start gap-2 text-xs font-semibold text-[#4A678F] hover:text-[#CB693A]"
                    >
                      <span>{row.sampleStories[0].headline}</span>
                      <span aria-hidden="true" className="mt-[1px] text-[10px] text-[#CB693A]">↗</span>
                    </a>
                  ) : row.sampleHeadlines?.length ? (
                    <p className="mt-2 text-xs text-moss/70">{row.sampleHeadlines[0]}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6">
          {googleNewsSignals.length > 0 ? (
            <TrendTable title="News, Search and Social Overlap" rows={googleNewsSignals} />
          ) : (
            <EmptyState title="No Google News signals" body="Validate the Apify actor output, then normalize it into /public/data/google-news.json." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="story-ideas"
        eyebrow="Ideas and Optimizations"
        title="Action Queue"
        subtitle="These items are rule-based recommendations generated from the normalized signal graph, with no LLM summarization in v1."
      >
        <StoryIdeasPanel ideas={data.summary.storyIdeas} />
      </SectionShell>

      <div className="px-1 text-left text-xs text-[#4A678F]/72">© 2026 Center for a Humane Economy | Animal Wellness Action</div>
    </div>
  );
}
