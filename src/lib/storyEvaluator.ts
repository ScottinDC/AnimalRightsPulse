import type {
  FacebookInsightsDataFile,
  Ga4DataFile,
  GoogleNewsDataFile,
  GoogleTrendsDataFile,
  GscDataFile
} from "./types";

export interface StoryEvaluatorData {
  gscFiles: GscDataFile[];
  ga4Files: Ga4DataFile[];
  googleNews: GoogleNewsDataFile;
  facebookInsights: FacebookInsightsDataFile;
  googleTrends: GoogleTrendsDataFile;
}

export interface SourceEvaluation {
  source: "gsc" | "ga4" | "google-news" | "facebook" | "google-trends";
  label: string;
  score: number;
  matched: boolean;
  evidence: string;
}

export interface StoryEvaluationResult {
  query: string;
  score: number;
  worthPosting: boolean;
  posture: "ahead of it" | "behind" | "stagnant" | "worth posting now";
  rationale: string;
  sources: SourceEvaluation[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeTerm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toTokens(value: string): string[] {
  return normalizeTerm(value)
    .split(" ")
    .filter((token) => token.length > 1);
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getMatchStrength(query: string, candidate: string): number {
  const normalizedQuery = normalizeTerm(query);
  const normalizedCandidate = normalizeTerm(candidate);

  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedQuery === normalizedCandidate) return 1;
  if (normalizedCandidate.includes(normalizedQuery) || normalizedQuery.includes(normalizedCandidate)) return 0.92;

  const queryTokens = toTokens(normalizedQuery);
  const candidateTokens = new Set(toTokens(normalizedCandidate));

  if (queryTokens.length === 0) return 0;

  const overlap = queryTokens.filter((token) => candidateTokens.has(token)).length;
  if (overlap === 0) return 0;

  return overlap / queryTokens.length;
}

function gscSourceScore(clickGrowthPct: number, impressionGrowthPct: number, ctrGrowthPct: number, positionGainPct: number): number {
  return clamp(clickGrowthPct * 0.04 + impressionGrowthPct * 0.03 + ctrGrowthPct * 0.015 + positionGainPct * 0.01, 0, 10);
}

function ga4SourceScore(searchGrowthPct: number, repeatDemandPct: number): number {
  return clamp(searchGrowthPct * 0.045 + repeatDemandPct * 0.025, 0, 10);
}

function googleNewsSourceScore(movementPct: number, coverageCount: number): number {
  return clamp(movementPct * 0.045 + coverageCount * 0.18, 0, 10);
}

function facebookSourceScore(growthPct: number, engagement: number): number {
  return clamp(growthPct * 0.055 + Math.log10(Math.max(engagement, 1)) * 1.25, 0, 10);
}

function googleTrendsSourceScore(momentumPct: number, breakout: boolean): number {
  return clamp(momentumPct * 0.055 + (breakout ? 2 : 0), 0, 10);
}

function evaluateGsc(query: string, files: GscDataFile[]): SourceEvaluation {
  let bestMatch: SourceEvaluation | null = null;
  let bestComposite = 0;

  for (const file of files) {
    for (const row of file.queries) {
      const matchStrength = getMatchStrength(query, row.term);
      if (matchStrength <= 0) continue;

      const score = gscSourceScore(row.clickGrowthPct, row.impressionGrowthPct, row.ctrGrowthPct, row.positionGainPct);
      const composite = matchStrength * score;

      if (composite > bestComposite) {
        bestComposite = composite;
        bestMatch = {
          source: "gsc",
          label: "GSC",
          score: Number(composite.toFixed(1)),
          matched: true,
          evidence: `${row.term}: +${row.impressionGrowthPct.toFixed(0)}% impressions, +${row.clickGrowthPct.toFixed(0)}% clicks`
        };
      }
    }
  }

  return (
    bestMatch ?? {
      source: "gsc",
      label: "GSC",
      score: 0,
      matched: false,
      evidence: "No matching organic search lift"
    }
  );
}

function evaluateGa4(query: string, files: Ga4DataFile[]): SourceEvaluation {
  let bestMatch: SourceEvaluation | null = null;
  let bestComposite = 0;

  for (const file of files) {
    for (const row of file.searches) {
      const matchStrength = getMatchStrength(query, row.term);
      if (matchStrength <= 0) continue;

      const score = ga4SourceScore(row.searchGrowthPct, row.repeatDemandPct);
      const composite = matchStrength * score;

      if (composite > bestComposite) {
        bestComposite = composite;
        bestMatch = {
          source: "ga4",
          label: "GA4",
          score: Number(composite.toFixed(1)),
          matched: true,
          evidence: `${row.term}: +${row.searchGrowthPct.toFixed(0)}% internal search growth, +${row.repeatDemandPct.toFixed(0)}% repeat demand`
        };
      }
    }
  }

  return (
    bestMatch ?? {
      source: "ga4",
      label: "GA4",
      score: 0,
      matched: false,
      evidence: "No matching internal site-search demand"
    }
  );
}

function evaluateGoogleNews(query: string, file: GoogleNewsDataFile): SourceEvaluation {
  let bestMatch: SourceEvaluation | null = null;
  let bestComposite = 0;

  for (const row of file.keywords) {
    const matchStrength = getMatchStrength(query, row.keyword);
    if (matchStrength <= 0) continue;

    const score = googleNewsSourceScore(row.movementPct, row.coverageCount);
    const composite = matchStrength * score;

    if (composite > bestComposite) {
      bestComposite = composite;
      bestMatch = {
        source: "google-news",
        label: "Google News",
        score: Number(composite.toFixed(1)),
        matched: true,
        evidence: `${row.keyword}: +${row.movementPct.toFixed(0)}% movement across ${row.coverageCount} coverage units`
      };
    }
  }

  return (
    bestMatch ?? {
      source: "google-news",
      label: "Google News",
      score: 0,
      matched: false,
      evidence: "No matching news-cycle acceleration"
    }
  );
}

function evaluateFacebook(query: string, file: FacebookInsightsDataFile): SourceEvaluation {
  let bestMatch: SourceEvaluation | null = null;
  let bestComposite = 0;

  for (const row of file.keywords) {
    const matchStrength = getMatchStrength(query, row.keyword);
    if (matchStrength <= 0) continue;

    const score = facebookSourceScore(row.growthPct, row.engagement);
    const composite = matchStrength * score;

    if (composite > bestComposite) {
      bestComposite = composite;
      bestMatch = {
        source: "facebook",
        label: "FB Insights",
        score: Number(composite.toFixed(1)),
        matched: true,
        evidence: `${row.keyword}: +${row.growthPct.toFixed(0)}% growth with ${Math.round(row.engagement)} engagements`
      };
    }
  }

  return (
    bestMatch ?? {
      source: "facebook",
      label: "FB Insights",
      score: 0,
      matched: false,
      evidence: "No matching Facebook engagement spike"
    }
  );
}

function evaluateGoogleTrends(query: string, file: GoogleTrendsDataFile): SourceEvaluation {
  let bestMatch: SourceEvaluation | null = null;
  let bestComposite = 0;

  for (const row of file.keywords) {
    const matchStrength = getMatchStrength(query, row.keyword);
    if (matchStrength <= 0) continue;

    const score = googleTrendsSourceScore(row.momentumPct, row.breakout);
    const composite = matchStrength * score;

    if (composite > bestComposite) {
      bestComposite = composite;
      bestMatch = {
        source: "google-trends",
        label: "Google Trends",
        score: Number(composite.toFixed(1)),
        matched: true,
        evidence: `${row.keyword}: +${row.momentumPct.toFixed(0)}% momentum${row.breakout ? " and breakout status" : ""}`
      };
    }
  }

  return (
    bestMatch ?? {
      source: "google-trends",
      label: "Google Trends",
      score: 0,
      matched: false,
      evidence: "No matching search-interest breakout"
    }
  );
}

export function evaluateStoryTopic(query: string, data: StoryEvaluatorData): StoryEvaluationResult {
  const trimmedQuery = query.trim();
  const sources = [
    evaluateGsc(trimmedQuery, data.gscFiles),
    evaluateGa4(trimmedQuery, data.ga4Files),
    evaluateGoogleNews(trimmedQuery, data.googleNews),
    evaluateFacebook(trimmedQuery, data.facebookInsights),
    evaluateGoogleTrends(trimmedQuery, data.googleTrends)
  ];

  const weights = {
    gsc: 0.24,
    ga4: 0.24,
    "google-news": 0.2,
    facebook: 0.16,
    "google-trends": 0.16
  } as const;

  const weightedScore = sources.reduce((sum, source) => sum + source.score * weights[source.source], 0);
  const score = clamp(Math.round(weightedScore), 1, 10);
  const ownedScore = (sources[0].score + sources[1].score) / 2;
  const externalScore = (sources[2].score + sources[3].score + sources[4].score) / 3;
  const matchedCount = sources.filter((source) => source.matched).length;

  let posture: StoryEvaluationResult["posture"] = "worth posting now";
  if (score <= 3 || matchedCount <= 1) {
    posture = "stagnant";
  } else if (externalScore >= 5.5 && ownedScore < 4.5) {
    posture = "ahead of it";
  } else if ((ownedScore >= 5.5 && externalScore >= 5) || ownedScore >= 6.5) {
    posture = "behind";
  }

  const worthPosting = posture !== "stagnant" && (score >= 6 || matchedCount >= 3);
  const strongestSources = sources
    .filter((source) => source.matched)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((source) => source.label)
    .join(" and ");

  let secondSentence = "";
  if (posture === "ahead of it") {
    secondSentence = "We are ahead of it because outside attention is building faster than owned-site demand, which usually means there is still room to publish before search and on-site intent fully crest.";
  } else if (posture === "behind") {
    secondSentence = "We are behind because search and on-site demand are already active enough that waiting longer would mean responding to a wave that is already here.";
  } else if (posture === "stagnant") {
    secondSentence = "The story looks stagnant because the blended signal set is too thin across search, site demand, news, social, and trend velocity to justify a push yet.";
  } else {
    secondSentence = "The signal mix is balanced enough to post now, with owned demand and external momentum showing up in the same window instead of fighting each other.";
  }

  const firstSentence =
    matchedCount > 0
      ? `${titleCase(trimmedQuery)} scores ${score}/10 and ${worthPosting ? "is worth posting" : "is not worth posting yet"}, led by ${strongestSources || "the available signals"}.`
      : `${titleCase(trimmedQuery)} scores ${score}/10 and is not worth posting yet because none of the tracked sources are showing a meaningful match.`;

  return {
    query: trimmedQuery,
    score,
    worthPosting,
    posture,
    rationale: `${firstSentence} ${secondSentence}`,
    sources
  };
}
