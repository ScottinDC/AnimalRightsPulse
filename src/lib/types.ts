export type SiteScope = "site-a" | "site-b" | "global";
export type SourceType =
  | "gsc"
  | "ga4"
  | "reddit"
  | "facebook"
  | "google-trends"
  | "google-news";
export type TrendLabel = "new" | "breakout" | "rising" | "steady" | "declining";

export interface DateWindow {
  currentStart: string;
  currentEnd: string;
  previousStart: string;
  previousEnd: string;
}

export interface DeltaMetrics {
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
  searches?: number;
  repeatRate?: number;
  redditVelocity?: number;
  facebookVelocity?: number;
  googleTrendsVelocity?: number;
  googleNewsVelocity?: number;
  sourceCount?: number;
  novelty?: number;
}

export interface GscQueryTrendRow {
  term: string;
  normalizedTerm: string;
  site: SiteScope;
  page?: string;
  currentClicks: number;
  previousClicks: number;
  currentImpressions: number;
  previousImpressions: number;
  currentCtr: number;
  previousCtr: number;
  currentPosition: number;
  previousPosition: number;
  clickGrowthPct: number;
  impressionGrowthPct: number;
  ctrGrowthPct: number;
  positionGainPct: number;
  trendScore: number;
  trendLabel: TrendLabel;
}

export interface GscPageTrendRow {
  page: string;
  site: SiteScope;
  currentClicks: number;
  previousClicks: number;
  currentImpressions: number;
  previousImpressions: number;
  clickGrowthPct: number;
  impressionGrowthPct: number;
  associatedTerms: string[];
  opportunity: string;
}

export interface Ga4InternalSearchRow {
  term: string;
  normalizedTerm: string;
  site: SiteScope;
  currentSearches: number;
  previousSearches: number;
  currentRepeatUsers: number;
  previousRepeatUsers: number;
  searchGrowthPct: number;
  repeatDemandPct: number;
  trendScore: number;
  trendLabel: TrendLabel;
}

export interface RedditPostRow {
  id: string;
  title: string;
  score: number;
  numComments: number;
  createdUtc: string;
  permalink: string;
  url: string;
  author: string;
  flair?: string;
  subreddit?: string;
  rank?: number;
  linkedDomain: string;
  velocityScore: number;
}

export interface RedditPhraseRow {
  phrase: string;
  normalizedTerm: string;
  count: number;
  postIds: string[];
  velocityScore: number;
}

export type RedditTrendDirection = "accelerating" | "rising" | "steady" | "cooling";

export interface RedditTrendClusterLink {
  postId: string;
  title: string;
  url: string;
  permalink: string;
  subreddit?: string;
  score: number;
  numComments: number;
  createdUtc: string;
  rank?: number;
}

export interface RedditTrendClusterRow {
  id: string;
  label: string;
  normalizedTerm: string;
  postCount: number;
  subredditCount: number;
  avgRank: number;
  bestRank: number;
  totalScore: number;
  totalComments: number;
  freshnessHours: number;
  freshnessScore: number;
  momentumScore: number;
  direction: RedditTrendDirection;
  trendLabel: TrendLabel;
  urls: RedditTrendClusterLink[];
}

export interface GoogleTrendsSeriesPoint {
  timestamp: string;
  value: number;
}

export interface GoogleTrendsRow {
  keyword: string;
  normalizedTerm: string;
  geo: string;
  timeWindow: string;
  series: GoogleTrendsSeriesPoint[];
  momentumPct: number;
  breakout: boolean;
}

export interface GoogleNewsTrendRow {
  keyword: string;
  normalizedTerm: string;
  series: GoogleTrendsSeriesPoint[];
  movementPct: number;
  coverageCount: number;
  sampleHeadlines?: string[];
  sampleStories?: Array<{ headline: string; url: string }>;
}

export interface FacebookKeywordRow {
  keyword: string;
  normalizedTerm: string;
  engagement: number;
  growthPct: number;
  trendScore: number;
  trendLabel: TrendLabel;
}

export interface FacebookStoryRow {
  id: string;
  headline: string;
  url: string;
  keyword: string;
  engagement: number;
  growthPct: number;
  trendLabel: TrendLabel;
}

export interface FacebookInsightsDataFile {
  generatedAt: string;
  keywords: FacebookKeywordRow[];
  stories: FacebookStoryRow[];
}

export interface NormalizedSignalRow {
  id: string;
  term: string;
  normalizedTerm: string;
  source: SourceType;
  site?: SiteScope;
  sourceLabel: string;
  trendScore: number;
  trendLabel: TrendLabel;
  crossSourceCount: number;
  timeWindow: string;
  metrics: DeltaMetrics;
  flags: string[];
  context?: string;
  url?: string;
}

export interface SummaryCard {
  id: string;
  title: string;
  metric: string;
  change: string;
  narrative: string;
}

export interface StoryIdea {
  id: string;
  category: "Write now" | "Monitor" | "Evergreen update" | "Refresh old page" | "Improve navigation/search UX" | "Watch for mainstream breakout";
  headline: string;
  rationale: string;
  relatedTerms: string[];
  sources: SourceType[];
  priority: number;
}

export interface GscDataFile {
  generatedAt: string;
  site: SiteScope;
  window: DateWindow;
  queries: GscQueryTrendRow[];
  pages: GscPageTrendRow[];
}

export interface Ga4DataFile {
  generatedAt: string;
  site: SiteScope;
  window: DateWindow;
  searches: Ga4InternalSearchRow[];
}

export interface RedditDataFile {
  generatedAt: string;
  subreddit: string;
  posts: RedditPostRow[];
  repeatedPhrases: RedditPhraseRow[];
  trendClusters?: RedditTrendClusterRow[];
  linkedDomains: Array<{ domain: string; count: number }>;
  recurringTopics: Array<{ topic: string; count: number }>;
}

export interface GoogleTrendsDataFile {
  generatedAt: string;
  keywords: GoogleTrendsRow[];
}

export interface GoogleNewsDataFile {
  generatedAt: string;
  keywords: GoogleNewsTrendRow[];
  recurringTopics?: Array<{ topic: string; count: number }>;
}

export interface SignalsDataFile {
  generatedAt: string;
  signals: NormalizedSignalRow[];
}

export interface SummaryDataFile {
  generatedAt: string;
  summaryCards: SummaryCard[];
  storyIdeas: StoryIdea[];
}

export interface DashboardData {
  gscSiteA: GscDataFile;
  gscSiteB: GscDataFile;
  gscCombined: GscDataFile;
  ga4SiteA: Ga4DataFile;
  ga4SiteB: Ga4DataFile;
  ga4Combined: Ga4DataFile;
  reddit: RedditDataFile;
  facebookInsights: FacebookInsightsDataFile;
  googleTrends: GoogleTrendsDataFile;
  googleNews: GoogleNewsDataFile;
  signals: SignalsDataFile;
  summary: SummaryDataFile;
}
