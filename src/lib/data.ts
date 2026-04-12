import type {
  DashboardData,
  FacebookInsightsDataFile,
  GoogleNewsDataFile,
  GoogleTrendsDataFile,
  Ga4DataFile,
  GscDataFile,
  RedditDataFile,
  SignalsDataFile,
  SummaryDataFile
} from "./types";

async function safeReadJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function loadDashboardData(): Promise<DashboardData> {
  const base = import.meta.env.BASE_URL;
  const [
    gscSiteA,
    gscSiteB,
    gscCombined,
    ga4SiteA,
    ga4SiteB,
    ga4Combined,
    reddit,
    facebookInsights,
    googleTrends,
    googleNews,
    signals,
    summary
  ] = await Promise.all([
    safeReadJson<GscDataFile>(`${base}data/gsc-site-a.json`),
    safeReadJson<GscDataFile>(`${base}data/gsc-site-b.json`),
    safeReadJson<GscDataFile>(`${base}data/gsc-combined.json`),
    safeReadJson<Ga4DataFile>(`${base}data/ga4-site-a-search.json`),
    safeReadJson<Ga4DataFile>(`${base}data/ga4-site-b-search.json`),
    safeReadJson<Ga4DataFile>(`${base}data/ga4-combined-search.json`),
    safeReadJson<RedditDataFile>(`${base}data/reddit.json`),
    safeReadJson<FacebookInsightsDataFile>(`${base}data/facebook-insights.json`),
    safeReadJson<GoogleTrendsDataFile>(`${base}data/google-trends.json`),
    safeReadJson<GoogleNewsDataFile>(`${base}data/google-news.json`),
    safeReadJson<SignalsDataFile>(`${base}data/signals.json`),
    safeReadJson<SummaryDataFile>(`${base}data/summary.json`)
  ]);

  return {
    gscSiteA,
    gscSiteB,
    gscCombined,
    ga4SiteA,
    ga4SiteB,
    ga4Combined,
    reddit,
    facebookInsights,
    googleTrends,
    googleNews,
    signals,
    summary
  };
}
