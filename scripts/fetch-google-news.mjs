import path from "node:path";
import { DATA_DIR, normalizeTerm, runApifyActor, safeReadJson, safeWriteJson } from "./lib.mjs";

const KEYWORDS = [
  "animal rights",
  "animal cruelty",
  "factory farming",
  "vegan activism",
  "animal testing",
  "fur ban",
  "puppy mills",
  "foie gras ban"
];

function bucketByKeyword(items) {
  const grouped = new Map();
  for (const item of items) {
    const keyword = item.query ?? item.keyword ?? item.searchTerm ?? "unknown";
    const list = grouped.get(keyword) ?? [];
    list.push(item);
    grouped.set(keyword, list);
  }
  return grouped;
}

async function fetchGoogleNews() {
  if (!process.env.APIFY_TOKEN) {
    return safeReadJson(path.join(DATA_DIR, "google-news.json"));
  }

  const items = await runApifyActor(
    "lhotanova~google-news-scraper",
    {
      queries: KEYWORDS,
      language: "en-US",
      maxItems: 100
    },
    process.env.APIFY_TOKEN
  );

  const keywords = [...bucketByKeyword(items).entries()].map(([keyword, rows]) => {
    const sorted = rows
      .map((row) => ({
        title: row.title ?? row.headline ?? "Untitled",
        publishedAt: row.publishedAt ?? row.date ?? row.time ?? new Date().toISOString()
      }))
      .sort((a, b) => String(a.publishedAt).localeCompare(String(b.publishedAt)));

    const series = sorted.map((row, index) => ({
      timestamp: String(row.publishedAt).slice(0, 10) || `point-${index}`,
      value: index + 1
    }));

    return {
      keyword,
      normalizedTerm: normalizeTerm(keyword),
      series,
      movementPct: series.length > 1 ? ((series.at(-1).value - series[0].value) / series[0].value) * 100 : series.length ? 100 : 0,
      coverageCount: rows.length,
      sampleHeadlines: sorted.slice(-3).map((row) => row.title)
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    keywords,
    recurringTopics: keywords.map((row) => ({ topic: row.keyword, count: row.coverageCount }))
  };
}

async function main() {
  const payload = await fetchGoogleNews();
  await safeWriteJson(path.join(DATA_DIR, "google-news.json"), payload);
  console.log("Wrote Google News data");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
