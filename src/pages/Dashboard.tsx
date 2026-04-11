import { useEffect, useMemo, useState } from "react";
import leopardImg from "../assets/leopard.jpg";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { Header } from "../components/Header";
import { SectionShell } from "../components/SectionShell";
import { StoryIdeasPanel } from "../components/StoryIdeasPanel";
import { SummaryCards } from "../components/SummaryCards";
import { TrendChart } from "../components/TrendChart";
import { TrendTable } from "../components/TrendTable";
import { loadDashboardData } from "../lib/data";
import { formatNumber, titleCaseFromSlug } from "../lib/format";
import type { DashboardData, GoogleNewsTrendRow, GoogleTrendsRow, RedditPostRow, SiteScope } from "../lib/types";

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

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData()
      .then((payload) => setData(payload))
      .catch((loadError: Error) => setError(loadError.message));
  }, []);

  const filteredSignals = useMemo(() => {
    if (!data) return [];
    return data.signals.signals;
  }, [data]);

  const topSignals = useMemo(() => filteredSignals.slice(0, 15), [filteredSignals]);

  if (error) return <ErrorState message={error} />;
  if (!data) {
    return <EmptyState title="Loading signal files" body="The dashboard is reading committed JSON from /public/data." />;
  }

  const gscSignals = filteredSignals.filter((signal) => signal.source === "gsc").slice(0, 8);
  const ga4Signals = filteredSignals.filter((signal) => signal.source === "ga4").slice(0, 8);
  const redditSignals = filteredSignals.filter((signal) => signal.source === "reddit").slice(0, 8);
  const googleNewsSignals = filteredSignals.filter((signal) => signal.source === "google-news").slice(0, 8);

  const googleTrendsLead = data.googleTrends.keywords[0];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6 lg:px-8">
      <Header />

      <SectionShell
        id="overview"
        eyebrow="Overview"
        title="Rising Signals"
        subtitle="Rule-based scoring merges committed source files into a single editorial view without any live browser-side API calls."
      >
        <SummaryCards cards={data.summary.summaryCards} />
        <div className="mt-6">
          {topSignals.length > 0 ? (
            <TrendTable title="Top 15 Rising Signals" rows={topSignals} />
          ) : (
            <EmptyState title="No normalized signals yet" body="Signals will appear here after the next successful pipeline run." />
          )}
        </div>
      </SectionShell>

      {/* Leopard transition image between Overview and GSC */}
      <div className="relative h-56 overflow-hidden pointer-events-none select-none">
        <img
          src={leopardImg}
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 30%",
            opacity: 1,
          }}
        />
      </div>

      <SectionShell
        id="gsc"
        eyebrow="Google Search Console"
        title="Organic Search Growth"
        subtitle="These rows come from Search Console comparison windows, preserving site scope, page context, and the reality that GSC only returns top rows rather than a complete long tail."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {[data.gscSiteA, data.gscSiteB].map((file) => (
            <article key={file.site} className="border border-[#99ADC6]/45 bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-xl font-semibold text-ink">{siteLabel(file.site)}</h3>
                <span className="border border-[#99ADC6]/35 bg-[#F4F9FC] px-3 py-1 text-xs text-moss">{file.window.currentStart} to {file.window.currentEnd}</span>
              </div>
              <div className="mt-4 space-y-3">
                {file.queries.slice(0, 5).map((query) => (
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
          ))}
        </div>
        <div className="mt-6">
          {gscSignals.length > 0 ? (
            <TrendTable title="Combined GSC" rows={gscSignals} />
          ) : (
            <EmptyState title="No Search Console trends yet" body="Search Console rows will appear here after the next successful fetch." />
          )}
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
            <TrendTable title="Internal Overlaps" rows={ga4Signals} />
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
            <h3 className="text-xl font-semibold text-ink">Trending Posts</h3>
            <div className="mt-4 space-y-4">
              {topPosts(data.reddit.posts).map((post) => (
                <article key={post.id} className="border border-[#99ADC6]/25 bg-[#F4F9FC] px-4 py-4">
                  <a href={post.url || `https://reddit.com${post.permalink}`} target="_blank" rel="noreferrer" className="font-semibold text-ink">
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
            <TrendTable title="Recurring Topics and Phrases" rows={redditSignals} hideSource />
          ) : (
            <EmptyState title="No Reddit trend rows yet" body="Reddit topic rows will appear here after the next successful fetch." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="google-trends"
        eyebrow="Google Trends"
        title="Interest Over Time"
        subtitle="Google Trends is fetched through Apify on a schedule, then normalized into a stable time-series shape before the frontend reads any local JSON."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {data.googleTrends.keywords.slice(0, 3).map((row, i) => (
            <TrendChart
              key={row.keyword}
              title={row.keyword}
              points={toSeriesPoints(row)}
              color={i === 0 ? "#4A678F" : i === 1 ? "#CB693A" : "#99ADC6"}
            />
          ))}
        </div>
      </SectionShell>

      <SectionShell
        id="google-news"
        eyebrow="Google News"
        title="News Momentum"
        subtitle="Google News is fetched through Apify, then normalized into topic-level coverage and trend lines that can be compared against search and Reddit demand."
      >
        <div className="space-y-3 mb-6">
          {[
            { headline: "New report renews scrutiny of animal testing standards in cosmetics industry", source: "Reuters", date: "Apr 9, 2026", tag: "animal testing" },
            { headline: "More cities consider fur ban proposals as retailers face renewed anti-fur pressure", source: "AP News", date: "Apr 8, 2026", tag: "fur ban" },
            { headline: "Lawmakers revisit federal cosmetics animal testing rules amid campaign group pressure", source: "The Hill", date: "Apr 7, 2026", tag: "animal testing" },
          ].map((story) => (
            <div key={story.headline} className="border border-[#99ADC6]/25 bg-[#F4F9FC] px-4 py-3 flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-[#4A678F] text-sm">{story.headline}</p>
                <p className="mt-1 text-[11px] text-[#99ADC6] uppercase tracking-[0.08em]">{story.source} · {story.date}</p>
              </div>
              <span className="shrink-0 border border-[#CB693A]/20 bg-[#CB693A]/10 px-2 py-1 text-[10px] uppercase tracking-[0.08em] text-[#CB693A]">{story.tag}</span>
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {data.googleNews.keywords.slice(0, 2).map((row, i) => (
            <TrendChart
              key={row.keyword}
              title={row.keyword}
              points={toSeriesPoints(row)}
              color={i === 0 ? "#CB693A" : "#4A678F"}
            />
          ))}
        </div>
        <div className="mt-6">
          {googleNewsSignals.length > 0 ? (
            <TrendTable title="News Overlap with Search and Social Momentum" rows={googleNewsSignals} hideSource />
          ) : (
            <EmptyState title="No Google News signals" body="Validate the Apify actor output, then normalize it into /public/data/google-news.json." />
          )}
        </div>
      </SectionShell>

      <SectionShell
        id="story-ideas"
        eyebrow="Story Ideas"
        title="Action Queue"
        subtitle="These items are rule-based recommendations generated from the normalized signal graph, with no LLM summarization in v1."
      >
        <StoryIdeasPanel ideas={data.summary.storyIdeas} />
      </SectionShell>
    </div>
  );
}
