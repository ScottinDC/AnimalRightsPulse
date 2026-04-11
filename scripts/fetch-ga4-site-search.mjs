import path from "node:path";
import { classifyTrend, scoreTrend } from "./scoring.mjs";
import {
  DATA_DIR,
  normalizeTerm,
  percentChange,
  safeReadJson,
  safeWriteJson
} from "./lib.mjs";

function buildRollingWindow() {
  return {
    currentStart: "2026-03-31",
    currentEnd: "2026-04-06",
    previousStart: "2026-03-24",
    previousEnd: "2026-03-30"
  };
}

async function loadMock(site) {
  return safeReadJson(path.join(DATA_DIR, `${site === "site-a" ? "ga4-site-a-search" : "ga4-site-b-search"}.json`));
}

async function fetchGa4SiteSearch(site, propertyId) {
  if (!process.env.GA4_CLIENT_EMAIL || !process.env.GA4_PRIVATE_KEY || !propertyId) {
    return loadMock(site);
  }

  const window = buildRollingWindow();
  const serviceAccount = {
    client_email: process.env.GA4_CLIENT_EMAIL,
    private_key: process.env.GA4_PRIVATE_KEY.replace(/\\n/g, "\n")
  };

  const jwtHeader = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const jwtPayload = Buffer.from(
    JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now
    })
  ).toString("base64url");

  const signer = await import("node:crypto");
  const signature = signer
    .createSign("RSA-SHA256")
    .update(`${jwtHeader}.${jwtPayload}`)
    .sign(serviceAccount.private_key, "base64url");

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${jwtHeader}.${jwtPayload}.${signature}`
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to authenticate GA4 request: ${await tokenResponse.text()}`);
  }

  const { access_token: accessToken } = await tokenResponse.json();

  async function runReport(startDate, endDate) {
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: "searchTerm" }],
        metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
        limit: 100
      })
    });

    if (!response.ok) {
      throw new Error(`GA4 runReport failed: ${await response.text()}`);
    }

    const payload = await response.json();
    payload.rows = (payload.rows ?? []).filter((row) => row.dimensionValues?.[0]?.value && row.dimensionValues[0].value !== "(not set)");
    return payload;
  }

  const [current, previous] = await Promise.all([
    runReport(window.currentStart, window.currentEnd),
    runReport(window.previousStart, window.previousEnd)
  ]);

  const previousIndex = new Map(
    (previous.rows ?? []).map((row) => [
      row.dimensionValues[0].value,
      {
        searches: Number(row.metricValues[0].value),
        repeatUsers: Number(row.metricValues[1].value)
      }
    ])
  );

  const searches = (current.rows ?? []).map((row) => {
    const term = row.dimensionValues[0].value;
    const currentSearches = Number(row.metricValues[0].value);
    const currentRepeatUsers = Number(row.metricValues[1].value);
    const previousRow = previousIndex.get(term) ?? { searches: 0, repeatUsers: 0 };
    const metrics = {
      searches: percentChange(currentSearches, previousRow.searches),
      repeatRate: percentChange(currentRepeatUsers, previousRow.repeatUsers),
      sourceCount: 1,
      novelty: previousRow.searches ? 0 : 1
    };
    const trendScore = scoreTrend(metrics);
    return {
      term,
      normalizedTerm: normalizeTerm(term),
      site,
      currentSearches,
      previousSearches: previousRow.searches,
      currentRepeatUsers,
      previousRepeatUsers: previousRow.repeatUsers,
      searchGrowthPct: metrics.searches,
      repeatDemandPct: metrics.repeatRate,
      trendScore,
      trendLabel: classifyTrend(trendScore, metrics)
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    site,
    window,
    searches: searches.sort((a, b) => b.trendScore - a.trendScore)
  };
}

async function main() {
  const [siteA, siteB] = await Promise.all([
    fetchGa4SiteSearch("site-a", process.env.GA4_PROPERTY_ID_SITE_A),
    fetchGa4SiteSearch("site-b", process.env.GA4_PROPERTY_ID_SITE_B)
  ]);

  const combined = {
    generatedAt: new Date().toISOString(),
    site: "global",
    window: siteA.window,
    searches: [...siteA.searches, ...siteB.searches].sort((a, b) => b.trendScore - a.trendScore)
  };

  await safeWriteJson(path.join(DATA_DIR, "ga4-site-a-search.json"), siteA);
  await safeWriteJson(path.join(DATA_DIR, "ga4-site-b-search.json"), siteB);
  await safeWriteJson(path.join(DATA_DIR, "ga4-combined-search.json"), combined);
  console.log("Wrote GA4 site-search files");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
