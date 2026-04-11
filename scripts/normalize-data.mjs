import path from "node:path";
import { classifyTrend, scoreTrend } from "./scoring.mjs";
import {
  DATA_DIR,
  computeTimeWindowLabel,
  matchTermsAcrossSources,
  normalizeTerm,
  safeReadJson,
  safeWriteJson
} from "./lib.mjs";

function buildSignalId(source, site, normalizedTerm) {
  return `${source}:${site ?? "global"}:${normalizedTerm}`;
}

function distinctSources(rows) {
  return new Set(rows.map((row) => row.source)).size;
}

async function main() {
  const [
    gscSiteA,
    gscSiteB,
    ga4SiteA,
    ga4SiteB,
    reddit,
    googleTrends,
    googleNews
  ] = await Promise.all([
    safeReadJson(path.join(DATA_DIR, "gsc-site-a.json")),
    safeReadJson(path.join(DATA_DIR, "gsc-site-b.json")),
    safeReadJson(path.join(DATA_DIR, "ga4-site-a-search.json")),
    safeReadJson(path.join(DATA_DIR, "ga4-site-b-search.json")),
    safeReadJson(path.join(DATA_DIR, "reddit.json")),
    safeReadJson(path.join(DATA_DIR, "google-trends.json")),
    safeReadJson(path.join(DATA_DIR, "google-news.json"))
  ]);

  const signals = [];
  const gscWindow = computeTimeWindowLabel(gscSiteA.window);
  const ga4Window = computeTimeWindowLabel(ga4SiteA.window);

  for (const file of [gscSiteA, gscSiteB]) {
    for (const row of file.queries) {
      signals.push({
        id: buildSignalId("gsc", file.site, row.normalizedTerm),
        term: row.term,
        normalizedTerm: row.normalizedTerm,
        source: "gsc",
        site: file.site,
        sourceLabel: `GSC ${file.site.toUpperCase()}`,
        trendScore: row.trendScore,
        trendLabel: row.trendLabel,
        crossSourceCount: 1,
        timeWindow: gscWindow,
        metrics: {
          clicks: row.clickGrowthPct,
          impressions: row.impressionGrowthPct,
          ctr: row.ctrGrowthPct,
          position: row.positionGainPct,
          novelty: row.previousClicks === 0 ? 1 : 0
        },
        flags: [row.trendLabel, row.page ? "page-linked" : "query-only"],
        context: row.page,
        url: row.page
      });
    }
  }

  for (const file of [ga4SiteA, ga4SiteB]) {
    for (const row of file.searches) {
      signals.push({
        id: buildSignalId("ga4", file.site, row.normalizedTerm),
        term: row.term,
        normalizedTerm: row.normalizedTerm,
        source: "ga4",
        site: file.site,
        sourceLabel: file.site === "site-a" ? "GA4 CHE" : "GA4 AWA",
        trendScore: row.trendScore,
        trendLabel: row.trendLabel,
        crossSourceCount: 1,
        timeWindow: ga4Window,
        metrics: {
          searches: row.searchGrowthPct,
          repeatRate: row.repeatDemandPct,
          novelty: row.previousSearches === 0 ? 1 : 0
        },
        flags: [row.trendLabel, "internal-demand"],
        context: "Internal site search"
      });
    }
  }

  for (const phrase of reddit.repeatedPhrases) {
    const metrics = {
      redditVelocity: phrase.velocityScore,
      sourceCount: 1,
      novelty: phrase.count > 2 ? 1 : 0
    };
    const trendScore = scoreTrend(metrics);
    signals.push({
      id: buildSignalId("reddit", "global", phrase.normalizedTerm),
      term: phrase.phrase,
      normalizedTerm: phrase.normalizedTerm,
      source: "reddit",
      site: "global",
      sourceLabel: "Reddit",
      trendScore,
      trendLabel: classifyTrend(trendScore, metrics),
      crossSourceCount: 1,
      timeWindow: "reddit:24h",
      metrics,
      flags: ["community-topic"],
      context: `${phrase.count} repeated title matches`
    });
  }

  for (const row of googleTrends.keywords) {
    const metrics = {
      googleTrendsVelocity: row.momentumPct,
      sourceCount: 1,
      novelty: row.breakout ? 1 : 0
    };
    const trendScore = scoreTrend(metrics);
    signals.push({
      id: buildSignalId("google-trends", "global", row.normalizedTerm),
      term: row.keyword,
      normalizedTerm: row.normalizedTerm,
      source: "google-trends",
      site: "global",
      sourceLabel: "Google Trends",
      trendScore,
      trendLabel: classifyTrend(trendScore, metrics),
      crossSourceCount: 1,
      timeWindow: row.timeWindow,
      metrics,
      flags: row.breakout ? ["breakout"] : ["watchlist"],
      context: row.geo
    });
  }

  for (const row of googleNews.keywords) {
    const metrics = {
      googleNewsVelocity: row.movementPct,
      sourceCount: 1,
      novelty: row.movementPct > 30 ? 1 : 0
    };
    const trendScore = scoreTrend(metrics);
    signals.push({
      id: buildSignalId("google-news", "global", row.normalizedTerm),
      term: row.keyword,
      normalizedTerm: row.normalizedTerm,
      source: "google-news",
      site: "global",
      sourceLabel: "Google News",
      trendScore,
      trendLabel: classifyTrend(trendScore, metrics),
      crossSourceCount: 1,
      timeWindow: "google-news:recent",
      metrics,
      flags: ["news-momentum"],
      context: `${row.coverageCount} coverage units`
    });
  }

  const grouped = matchTermsAcrossSources(signals);
  const enriched = signals.map((signal) => {
    const related = grouped.get(signal.normalizedTerm) ?? [signal];
    const sourceCount = distinctSources(related);
    const score = scoreTrend({ ...signal.metrics, sourceCount });
    const flags = [...signal.flags];
    if (sourceCount >= 3) flags.push("cross-source confirmed");
    if (signal.source === "ga4" && sourceCount === 1) flags.push("site-gap opportunity");
    return {
      ...signal,
      trendScore: score,
      trendLabel: classifyTrend(score, { ...signal.metrics, sourceCount }),
      crossSourceCount: sourceCount,
      metrics: { ...signal.metrics, sourceCount }
    };
  });

  enriched.sort((a, b) => b.trendScore - a.trendScore);

  await safeWriteJson(path.join(DATA_DIR, "signals.json"), {
    generatedAt: new Date().toISOString(),
    signals: enriched
  });

  console.log(`Wrote ${enriched.length} normalized signals`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
