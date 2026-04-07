import path from "node:path";
import { DATA_DIR, fetchJson, normalizeTerm, safeReadJson, safeWriteJson } from "./lib.mjs";

const KEYWORDS = [
  "animal rights",
  "animal cruelty",
  "factory farming",
  "vegan activism",
  "animal testing",
  "fur ban"
];

async function fetchGoogleNewsTrends() {
  if (!process.env.RAPIDAPI_KEY || !process.env.RAPIDAPI_HOST) {
    return safeReadJson(path.join(DATA_DIR, "google-news-trends.json"));
  }

  const keywords = [];
  for (const keyword of KEYWORDS) {
    const response = await fetchJson(`https://${process.env.RAPIDAPI_HOST}/keyword-trends?keyword=${encodeURIComponent(keyword)}`, {
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY,
        "x-rapidapi-host": process.env.RAPIDAPI_HOST
      }
    });

    const series = (response.data ?? response.results ?? []).map((point) => ({
      timestamp: point.date ?? point.timestamp,
      value: Number(point.value ?? point.score ?? 0)
    }));
    const first = series[0]?.value ?? 0;
    const last = series.at(-1)?.value ?? 0;

    keywords.push({
      keyword,
      normalizedTerm: normalizeTerm(keyword),
      series,
      movementPct: first ? ((last - first) / first) * 100 : 100,
      coverageCount: Number(response.coverageCount ?? series.length)
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    keywords
  };
}

async function main() {
  const payload = await fetchGoogleNewsTrends();
  await safeWriteJson(path.join(DATA_DIR, "google-news-trends.json"), payload);
  console.log("Wrote Google News Trends data");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
