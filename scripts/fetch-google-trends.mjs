import path from "node:path";
import { DATA_DIR, normalizeTerm, runApifyActor, safeReadJson, safeWriteJson } from "./lib.mjs";

const DEFAULT_KEYWORDS = [
  "animal rights",
  "animal cruelty",
  "factory farming",
  "vegan activism",
  "animal testing",
  "fur ban",
  "puppy mills",
  "foie gras ban",
  "marine mammal captivity",
  "wildlife trafficking",
  "slaughterhouse conditions",
  "humane farming",
  "animal welfare law",
  "speciesism",
  "anti-fur legislation"
];

function normalizeSeries(input = []) {
  return input.map((point, index) => ({
    timestamp: point.date ?? point.formattedDate ?? point.formattedTime ?? point.time ?? `point-${index}`,
    value: Number(point.value ?? point.interest ?? point.score ?? 0)
  }));
}

async function fetchGoogleTrends() {
  if (!process.env.APIFY_TOKEN) {
    return safeReadJson(path.join(DATA_DIR, "google-trends.json"));
  }

  let items;
  try {
    items = await runApifyActor(
      "apify~google-trends-scraper",
      {
        searchTerms: DEFAULT_KEYWORDS,
        geo: "US",
        timeframe: "today 1-m",
        maxItems: DEFAULT_KEYWORDS.length
      },
      process.env.APIFY_TOKEN
    );
  } catch (error) {
    console.warn(`Falling back to mock Google Trends data: ${error.message}`);
    return safeReadJson(path.join(DATA_DIR, "google-trends.json"));
  }

  const keywords = items.map((item) => {
    const keyword = item.searchTerm ?? item.keyword ?? item.term ?? "unknown";
    const series = normalizeSeries(item.timelineData ?? item.interestOverTime ?? item.timeline ?? []);
    const first = series[0]?.value ?? 0;
    const last = series.at(-1)?.value ?? 0;
    return {
      keyword,
      normalizedTerm: normalizeTerm(keyword),
      geo: item.geo ?? "US",
      timeWindow: item.timeframe ?? "today 1-m",
      series,
      momentumPct: first ? ((last - first) / first) * 100 : last > 0 ? 100 : 0,
      breakout: Boolean(item.breakout) || (first > 0 && last >= first * 1.5)
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    keywords
  };
}

async function main() {
  const payload = await fetchGoogleTrends();
  await safeWriteJson(path.join(DATA_DIR, "google-trends.json"), payload);
  console.log("Wrote Google Trends data");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
