import path from "node:path";
import { DATA_DIR, fetchJson, normalizeTerm, safeReadJson, safeWriteJson } from "./lib.mjs";

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

async function pollJob(jobId, apiKey) {
  const maxAttempts = 8;
  let delay = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await fetchJson(`https://api.hasdata.com/scrape/google-trends/jobs/${jobId}`, {
      headers: { "x-api-key": apiKey }
    });

    if (status.status === "completed") {
      return status;
    }

    if (status.status === "failed") {
      throw new Error(`HasData job ${jobId} failed`);
    }

    await new Promise((resolve) => setTimeout(resolve, delay));
    delay *= 1.5;
  }

  throw new Error(`HasData job ${jobId} did not complete after ${maxAttempts} attempts`);
}

async function fetchHasData() {
  if (!process.env.HASDATA_API_KEY) {
    return safeReadJson(path.join(DATA_DIR, "google-trends.json"));
  }

  const createJob = await fetchJson("https://api.hasdata.com/scrape/google-trends/explore", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.HASDATA_API_KEY
    },
    body: JSON.stringify({
      keywords: DEFAULT_KEYWORDS,
      geo: "US",
      date: "today 1-m"
    })
  });

  const result = await pollJob(createJob.jobId, process.env.HASDATA_API_KEY);
  const keywords = (result.data ?? []).map((row) => {
    const series = (row.timelineData ?? []).map((point) => ({
      timestamp: point.formattedTime ?? point.time,
      value: Array.isArray(point.value) ? Number(point.value[0]) : Number(point.value)
    }));
    const first = series[0]?.value ?? 0;
    const last = series.at(-1)?.value ?? 0;
    return {
      keyword: row.keyword,
      normalizedTerm: normalizeTerm(row.keyword),
      geo: row.geo ?? "US",
      timeWindow: row.date ?? "today 1-m",
      series,
      momentumPct: first ? ((last - first) / first) * 100 : 100,
      breakout: last >= 75 && last > first * 1.5
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    keywords
  };
}

async function main() {
  const payload = await fetchHasData();
  await safeWriteJson(path.join(DATA_DIR, "google-trends.json"), payload);
  console.log("Wrote Google Trends data");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
