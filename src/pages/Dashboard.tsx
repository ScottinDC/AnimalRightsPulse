import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { FilterBar, type Filters } from "../components/FilterBar";
import { Header } from "../components/Header";
import { SectionShell } from "../components/SectionShell";
import { SourceBadge } from "../components/SourceBadge";
import { StoryIdeasPanel } from "../components/StoryIdeasPanel";
import { SummaryCards } from "../components/SummaryCards";
import { TrendChart } from "../components/TrendChart";
import { TrendTable } from "../components/TrendTable";
import { loadDashboardData } from "../lib/data";
import { formatNumber, titleCaseFromSlug } from "../lib/format";
import type {
  DashboardData,
  GoogleNewsTrendRow,
  GoogleTrendsRow,
  NormalizedSignalRow,
  RedditPostRow,
  SiteScope,
  SourceType
} from "../lib/types";

const DEFAULT_FILTERS: Filters = {
  source: "all",
  site: "all",
  trendLabel: "all",
  dateWindow: "all"
};

function filterSignals(rows: NormalizedSignalRow[], filters: Filters): NormalizedSignalRow[] {
  return rows.filter((row) => {
    if (filters.source !== "all" && row.source !== filters.source) {
      return false;
    }
    if (filters.site !== "all" && row.site !== filters.site) {
      return false;
    }
    if (filters.trendLabel !== "all" && row.trendLabel !== filters.trendLabel) {
      return false;
    }
    if (filters.dateWindow !== "all" && !row.timeWindow.includes(filters.dateWindow)) {
      return false;
    }
    return true;
  });
}

function toSeriesPoints(row: GoogleTrendsRow | GoogleNewsTrendRow) {
  return row.series.map((point) => ({
    label: point.timestamp.slice(5),
    value: point.value
  }));
}

function siteLabel(site: SiteScope): string {
  if (site === "site-a") return "Site A";
  if (site === "site-b") return "Site B";
  return "Global";
}

function topPosts(posts: RedditPostRow[]) {
  return [...posts].sort((a, b) => b.velocityScore - a.velocityScore).slice(0, 5);
}

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData()
      .then((payload) => setData(payload))
      .catch((loadError: Error) => setError(loadError.message));
  }, []);

  const filteredSignals = useMemo(() => {
    if (!data) return [];
    return filterSignals(data.signals.signals, filters);
  }, [data, filters]);

  const topSignals = useMemo(() => filteredSignals.slice(0, 15), [filteredSignals]);

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return <EmptyState title="Loading signal files" body="The dashboard is reading committed JSON from /public/data." />;
  }

  const gscOpportunitySignals = filteredSignals.filter((signal) => signal.source === "gsc").slice(0, 8);
  const ga4Signals = filteredSignals.filter((signal) => signal.source === "ga4").slice(0, 8);
  const redditSignals = filteredSignals.filter((signal) => signal.source === "reddit").slice(0, 8);
  const trendHunterSignals = filteredSignals.filter((signal) => signal.source === "trendhunter").slice(0, 8);
  const googleNewsSignals = filteredSignals.filter((signal) => signal.source === "google-news").slice(0, 8);

  const googleTrendsLead = data.googleTrends.keywords[0];
  const googleNewsLead = data.googleNews.keywords[0];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Header />

      <FilterBar filters={filters} onChange={setFilters} />

      <SectionShell
        id="overview"
        eyebrow="Overview"
        title="Top rising signals"
        subtitle="Rule-based scoring merges committed source files into a single editorial signal view without making any browser-side API calls."
      >
        <SummaryCards cards={data.summary.summaryCards} />
        <div className="mt-6">
          {topSignals.length > 0 ? (
            <TrendTable title="Top 15 rising signals across all sources" rows={topSignals} />
          ) : (
            <EmptyState title="No signals match these filters" body="Try widening the site or source filters to bring more rows back into view." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="gsc"
        eyebrow="Google Search Demand"
        title="Organic search demand before people land on your sites"
        subtitle="These rows come from Search Console comparison windows, preserving site scope, page context, and the reality that GSC only returns top rows rather than a complete long tail."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {[data.gscSiteA, data.gscSiteB].map((file) => (
            <article key={file.site} className="rounded-[1.75rem] border border-moss/10 bg-sand/40 p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-display text-2xl text-ink">{siteLabel(file.site)}</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs text-moss">{file.window.currentStart} to {file.window.currentEnd}</span>
              </div>
              <div className="mt-4 space-y-3">
                {file.queries.slice(0, 5).map((query) => (
                  <div key={`${file.site}-${query.term}`} className="rounded-2xl bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-ink">{query.term}</p>
                        <p className="mt-1 text-xs text-moss/70">{query.page ?? "Top matching page not assigned"}</p>
                      </div>
                      <span className="rounded-full bg-leaf/10 px-3 py-1 text-xs text-leaf">{query.trendLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
        <div className="mt-6">
          {gscOpportunitySignals.length > 0 ? (
            <TrendTable title="Combined GSC overlaps and page opportunities" rows={gscOpportunitySignals} />
          ) : (
            <EmptyState title="No GSC rows available" body="Run the Search Console fetch script or keep using the mock files for layout work." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="ga4"
        eyebrow="Internal Site Search"
        title="Questions audiences type into each site’s own search box"
        subtitle="GA4 internal search signals are modeled separately from external search demand so editorial gaps and information architecture issues stay visible."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {[data.ga4SiteA, data.ga4SiteB].map((file) => (
            <article key={file.site} className="rounded-[1.75rem] border border-moss/10 bg-white p-5">
              <h3 className="font-display text-2xl text-ink">{siteLabel(file.site)}</h3>
              <div className="mt-4 space-y-3">
                {file.searches.slice(0, 5).map((row) => (
                  <div key={`${file.site}-${row.term}`} className="rounded-2xl bg-sand px-4 py-3">
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
            <TrendTable title="Combined internal-search overlaps" rows={ga4Signals} />
          ) : (
            <EmptyState title="No GA4 internal search rows" body="Wire GA4 site-search instrumentation first, then re-run the pipeline." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="reddit"
        eyebrow="Reddit"
        title="Editorial and community momentum from r/AnimalRights"
        subtitle="The Reddit panel tracks recent posts, repeated title phrases, linked domains, and recurring topics while keeping the raw social signal separate from search data."
      >
        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[1.75rem] border border-moss/10 bg-white p-5">
            <h3 className="font-display text-2xl text-ink">Top posts in the last window</h3>
            <div className="mt-4 space-y-4">
              {topPosts(data.reddit.posts).map((post) => (
                <article key={post.id} className="rounded-2xl bg-sand px-4 py-4">
                  <a href={`https://reddit.com${post.permalink}`} target="_blank" rel="noreferrer" className="font-semibold text-ink">
                    {post.title}
                  </a>
                  <p className="mt-2 text-xs text-moss/70">
                    {formatNumber(post.score)} score | {formatNumber(post.numComments)} comments | {post.author}
                  </p>
                </article>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-[1.75rem] border border-moss/10 bg-white p-5">
              <h3 className="font-display text-xl text-ink">Repeated phrases</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.reddit.repeatedPhrases.slice(0, 10).map((phrase) => (
                  <span key={phrase.phrase} className="rounded-full bg-ember/10 px-3 py-2 text-xs text-ember">
                    {phrase.phrase} ({phrase.count})
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-[1.75rem] border border-moss/10 bg-white p-5">
              <h3 className="font-display text-xl text-ink">Top linked domains</h3>
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
            <TrendTable title="Recurring Reddit topics and phrases" rows={redditSignals} />
          ) : (
            <EmptyState title="No Reddit topic rows" body="The mock dataset will populate this until Reddit credentials are available." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="google-trends"
        eyebrow="Google Trends"
        title="Interest-over-time for a seeded animal-rights watchlist"
        subtitle="HasData runs asynchronously, so the fetch script is designed around job creation, polling, and normalization before the frontend ever reads the results."
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <TrendChart
            title={googleTrendsLead.keyword}
            points={toSeriesPoints(googleTrendsLead)}
            color="#234338"
          />
          <div className="rounded-[1.75rem] border border-moss/10 bg-white p-5">
            <h3 className="font-display text-2xl text-ink">Fast-rising watchlist terms</h3>
            <div className="mt-4 space-y-3">
              {data.googleTrends.keywords.slice(0, 6).map((row) => (
                <div key={row.keyword} className="rounded-2xl bg-sand px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-semibold text-ink">{row.keyword}</p>
                    {row.breakout ? <span className="rounded-full bg-ember/15 px-3 py-1 text-xs text-ember">breakout</span> : null}
                  </div>
                  <p className="mt-1 text-xs text-moss/70">Momentum {row.momentumPct.toFixed(1)}% | {row.geo}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionShell>

      <SectionShell
        id="trendhunter"
        eyebrow="TrendHunter"
        title="Emerging story ideas and innovation themes"
        subtitle="TrendHunter stays isolated behind its own fetch-and-normalize script so actor response changes do not leak complexity into the UI."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.75rem] border border-moss/10 bg-white p-5">
            <h3 className="font-display text-2xl text-ink">Recent story items</h3>
            <div className="mt-4 space-y-3">
              {data.trendhunter.items.slice(0, 5).map((item) => (
                <article key={item.id} className="rounded-2xl bg-sand px-4 py-3">
                  <a href={item.url} target="_blank" rel="noreferrer" className="font-semibold text-ink">
                    {item.title}
                  </a>
                  <p className="mt-1 text-xs text-moss/70">
                    {item.category ?? "Uncategorized"} | freshness {item.freshnessHours}h | recurrence {item.recurrenceCount}
                  </p>
                </article>
              ))}
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-moss/10 bg-white p-5">
            <h3 className="font-display text-2xl text-ink">Clusters and repeated concepts</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.trendhunter.topicClusters.map((cluster) => (
                <span key={cluster.cluster} className="rounded-full bg-purple-100 px-3 py-2 text-xs text-purple-900">
                  {cluster.cluster} ({cluster.count})
                </span>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.trendhunter.repeatedConcepts.map((concept) => (
                <span key={concept.concept} className="rounded-full bg-sky/50 px-3 py-2 text-xs text-ink">
                  {concept.concept} ({concept.count})
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6">
          {trendHunterSignals.length > 0 ? (
            <TrendTable title="TrendHunter story signals" rows={trendHunterSignals} />
          ) : (
            <EmptyState title="No TrendHunter signals" body="The UI will populate once the Apify actor response is normalized into trend rows." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="google-news"
        eyebrow="Google News Trends"
        title="News momentum and mainstream breakout monitoring"
        subtitle="RapidAPI keyword time series are normalized into the same signal model while keeping their news-source identity intact."
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <TrendChart
            title={googleNewsLead.keyword}
            points={toSeriesPoints(googleNewsLead)}
            color="#c45d37"
          />
          <div className="rounded-[1.75rem] border border-moss/10 bg-white p-5">
            <h3 className="font-display text-2xl text-ink">Rising news topics</h3>
            <div className="mt-4 space-y-3">
              {data.googleNews.keywords.slice(0, 6).map((row) => (
                <div key={row.keyword} className="rounded-2xl bg-sand px-4 py-3">
                  <p className="font-semibold text-ink">{row.keyword}</p>
                  <p className="mt-1 text-xs text-moss/70">Movement {row.movementPct.toFixed(1)}% | coverage {row.coverageCount}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6">
          {googleNewsSignals.length > 0 ? (
            <TrendTable title="News overlap with search and social momentum" rows={googleNewsSignals} />
          ) : (
            <EmptyState title="No Google News signals" body="Validate the RapidAPI response shape, then normalize it into /public/data/google-news-trends.json." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="story-ideas"
        eyebrow="Story Ideas"
        title="Action queue for the editorial team"
        subtitle="These items are rule-based recommendations generated from the normalized signal graph, with no LLM summarization in v1."
        actions={
          <div className="flex flex-wrap gap-2">
            {["new", "breakout", "rising", "declining"].map((label) => (
              <span key={label} className="rounded-full bg-sand px-3 py-1 text-xs text-moss">
                {titleCaseFromSlug(label)}
              </span>
            ))}
          </div>
        }
      >
        <StoryIdeasPanel ideas={data.summary.storyIdeas} />
      </SectionShell>

      <footer className="rounded-[2rem] border border-moss/10 bg-white/75 p-5 text-sm text-moss/80">
        <p className="font-semibold text-ink">Source coverage</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["gsc", "ga4", "reddit", "google-trends", "trendhunter", "google-news"] as SourceType[]).map((source) => (
            <SourceBadge key={source} source={source} />
          ))}
        </div>
        <p className="mt-4 leading-6">
          The dashboard is deterministic by design: it renders from committed JSON files and remains useful even before credentials are configured.
        </p>
      </footer>
    </div>
  );
}
