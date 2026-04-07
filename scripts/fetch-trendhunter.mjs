import path from "node:path";
import { DATA_DIR, fetchJson, normalizeTerm, safeReadJson, safeWriteJson } from "./lib.mjs";

async function fetchTrendHunter() {
  if (!process.env.APIFY_TOKEN) {
    return safeReadJson(path.join(DATA_DIR, "trendhunter.json"));
  }

  const run = await fetchJson("https://api.apify.com/v2/acts/pristine_tomato~trendhunter-ai/runs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token: process.env.APIFY_TOKEN,
      memoryMbytes: 256
    })
  });

  const datasetId = run.defaultDatasetId;
  const items = await fetchJson(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${process.env.APIFY_TOKEN}`);

  const normalizedItems = items.map((item, index) => ({
    id: item.id ?? `trendhunter-${index}`,
    title: item.title ?? item.name ?? "Untitled trend",
    normalizedTerm: normalizeTerm(item.title ?? item.name ?? ""),
    url: item.url ?? "https://www.trendhunter.com/",
    category: item.category ?? item.section,
    summary: item.summary ?? item.description,
    freshnessHours: Number(item.freshnessHours ?? 24),
    recurrenceCount: Number(item.recurrenceCount ?? item.mentions ?? 1),
    region: item.region ?? item.market
  }));

  const clusters = new Map();
  const concepts = new Map();
  for (const item of normalizedItems) {
    if (item.category) {
      clusters.set(item.category, (clusters.get(item.category) ?? 0) + 1);
    }
    const term = item.normalizedTerm.split(" ").slice(0, 2).join(" ");
    if (term) {
      concepts.set(term, (concepts.get(term) ?? 0) + 1);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    items: normalizedItems,
    repeatedConcepts: [...concepts.entries()].map(([concept, count]) => ({ concept, count })).sort((a, b) => b.count - a.count).slice(0, 12),
    topicClusters: [...clusters.entries()].map(([cluster, count]) => ({ cluster, count })).sort((a, b) => b.count - a.count).slice(0, 12)
  };
}

async function main() {
  const payload = await fetchTrendHunter();
  await safeWriteJson(path.join(DATA_DIR, "trendhunter.json"), payload);
  console.log("Wrote TrendHunter data");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
