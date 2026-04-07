import path from "node:path";
import { classifyTrend, scoreTrend } from "./scoring.mjs";
import {
  DATA_DIR,
  computeTimeWindowLabel,
  detectRisingTerms,
  getRequiredEnv,
  normalizeTerm,
  percentChange,
  positionGainPct,
  safeReadJson,
  safeWriteJson
} from "./lib.mjs";

function mockWindow() {
  return {
    currentStart: "2026-03-31",
    currentEnd: "2026-04-06",
    previousStart: "2026-03-24",
    previousEnd: "2026-03-30"
  };
}

function buildQueryRow(site, row, previous) {
  const metrics = {
    clicks: percentChange(row.clicks, previous.clicks ?? 0),
    impressions: percentChange(row.impressions, previous.impressions ?? 0),
    ctr: percentChange(row.ctr, previous.ctr ?? 0),
    position: positionGainPct(row.position, previous.position ?? row.position),
    sourceCount: 1,
    novelty: previous.query ? 0 : 1
  };
  const trendScore = scoreTrend(metrics);
  const trendLabel = classifyTrend(trendScore, metrics);
  return {
    term: row.query,
    normalizedTerm: normalizeTerm(row.query),
    site,
    page: row.page,
    currentClicks: row.clicks,
    previousClicks: previous.clicks ?? 0,
    currentImpressions: row.impressions,
    previousImpressions: previous.impressions ?? 0,
    currentCtr: row.ctr,
    previousCtr: previous.ctr ?? 0,
    currentPosition: row.position,
    previousPosition: previous.position ?? row.position,
    clickGrowthPct: metrics.clicks,
    impressionGrowthPct: metrics.impressions,
    ctrGrowthPct: metrics.ctr,
    positionGainPct: metrics.position,
    trendScore,
    trendLabel
  };
}

function buildPageRow(site, page, rows) {
  const currentClicks = rows.reduce((sum, row) => sum + row.currentClicks, 0);
  const previousClicks = rows.reduce((sum, row) => sum + row.previousClicks, 0);
  const currentImpressions = rows.reduce((sum, row) => sum + row.currentImpressions, 0);
  const previousImpressions = rows.reduce((sum, row) => sum + row.previousImpressions, 0);
  return {
    page,
    site,
    currentClicks,
    previousClicks,
    currentImpressions,
    previousImpressions,
    clickGrowthPct: percentChange(currentClicks, previousClicks),
    impressionGrowthPct: percentChange(currentImpressions, previousImpressions),
    associatedTerms: rows.map((row) => row.term),
    opportunity: currentClicks > previousClicks ? "Expand supporting coverage" : "Refresh ranking signals"
  };
}

function groupPages(site, queries) {
  const pageMap = new Map();
  for (const query of queries) {
    const list = pageMap.get(query.page) ?? [];
    list.push(query);
    pageMap.set(query.page, list);
  }
  return [...pageMap.entries()].map(([page, rows]) => buildPageRow(site, page, rows));
}

function buildCombined(siteAFIle, siteBFile) {
  return {
    generatedAt: new Date().toISOString(),
    site: "global",
    window: siteAFIle.window,
    queries: [...siteAFIle.queries, ...siteBFile.queries]
      .sort((a, b) => b.trendScore - a.trendScore)
      .slice(0, 25),
    pages: [...siteAFIle.pages, ...siteBFile.pages]
      .sort((a, b) => b.clickGrowthPct - a.clickGrowthPct)
      .slice(0, 20)
  };
}

async function loadMockSource(site) {
  const sourcePath = path.join(DATA_DIR, `${site === "site-a" ? "gsc-site-a" : "gsc-site-b"}.json`);
  return safeReadJson(sourcePath);
}

async function fetchPropertyData(site, propertyUrl) {
  if (
    !process.env.GSC_CLIENT_ID ||
    !process.env.GSC_CLIENT_SECRET ||
    !process.env.GSC_REFRESH_TOKEN
  ) {
    return loadMockSource(site);
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: getRequiredEnv("GSC_CLIENT_ID"),
      client_secret: getRequiredEnv("GSC_CLIENT_SECRET"),
      refresh_token: getRequiredEnv("GSC_REFRESH_TOKEN"),
      grant_type: "refresh_token"
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to refresh GSC token: ${await tokenResponse.text()}`);
  }

  const { access_token: accessToken } = await tokenResponse.json();
  const window = mockWindow();

  async function runQuery(dimensions) {
    const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(propertyUrl)}/searchAnalytics/query`;
    const body = {
      startDate: window.currentStart,
      endDate: window.currentEnd,
      dimensions,
      rowLimit: 250
    };
    const previousBody = {
      startDate: window.previousStart,
      endDate: window.previousEnd,
      dimensions,
      rowLimit: 250
    };

    const [current, previous] = await Promise.all([
      fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body)
      }).then((response) => response.json()),
      fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(previousBody)
      }).then((response) => response.json())
    ]);

    return { current: current.rows ?? [], previous: previous.rows ?? [] };
  }

  const { current: currentQueries, previous: previousQueries } = await runQuery(["query", "page"]);
  const previousIndex = new Map(
    previousQueries.map((row) => [`${row.keys[0]}||${row.keys[1]}`, { query: row.keys[0], page: row.keys[1], clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position }])
  );

  const queries = currentQueries.map((row) => {
    const key = `${row.keys[0]}||${row.keys[1]}`;
    return buildQueryRow(site, {
      query: row.keys[0],
      page: row.keys[1],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position
    }, previousIndex.get(key) ?? {});
  });

  return {
    generatedAt: new Date().toISOString(),
    site,
    window,
    queries: queries.sort((a, b) => b.trendScore - a.trendScore),
    pages: groupPages(site, queries)
  };
}

async function main() {
  const siteAProperty = process.env.GSC_SITE_A;
  const siteBProperty = process.env.GSC_SITE_B;

  const [siteA, siteB] = await Promise.all([
    fetchPropertyData("site-a", siteAProperty),
    fetchPropertyData("site-b", siteBProperty)
  ]);

  const combined = buildCombined(siteA, siteB);
  await safeWriteJson(path.join(DATA_DIR, "gsc-site-a.json"), siteA);
  await safeWriteJson(path.join(DATA_DIR, "gsc-site-b.json"), siteB);
  await safeWriteJson(path.join(DATA_DIR, "gsc-combined.json"), combined);

  console.log(`Wrote GSC files for ${computeTimeWindowLabel(siteA.window)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
