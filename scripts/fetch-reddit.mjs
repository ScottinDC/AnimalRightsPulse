import path from "node:path";
import { DATA_DIR, extractPhrasesFromTitles, normalizeTerm, safeReadJson, safeWriteJson } from "./lib.mjs";

function linkedDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "reddit.com";
  }
}

async function fetchReddit() {
  if (
    !process.env.REDDIT_CLIENT_ID ||
    !process.env.REDDIT_CLIENT_SECRET ||
    !process.env.REDDIT_USERNAME ||
    !process.env.REDDIT_PASSWORD
  ) {
    return safeReadJson(path.join(DATA_DIR, "reddit.json"));
  }

  const authToken = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString("base64");

  const tokenResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "animal-rights-signal-monitor/0.1"
    },
    body: new URLSearchParams({
      grant_type: "password",
      username: process.env.REDDIT_USERNAME,
      password: process.env.REDDIT_PASSWORD
    })
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed Reddit OAuth request: ${await tokenResponse.text()}`);
  }

  const { access_token: accessToken } = await tokenResponse.json();
  const listingResponse = await fetch("https://oauth.reddit.com/r/AnimalRights/new?limit=50", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "animal-rights-signal-monitor/0.1"
    }
  });

  if (!listingResponse.ok) {
    throw new Error(`Failed Reddit listing request: ${await listingResponse.text()}`);
  }

  const listing = await listingResponse.json();
  const posts = listing.data.children.map((child) => {
    const post = child.data;
    const ageHours = Math.max((Date.now() / 1000 - post.created_utc) / 3600, 1);
    return {
      id: post.id,
      title: post.title,
      score: post.score,
      numComments: post.num_comments,
      createdUtc: new Date(post.created_utc * 1000).toISOString(),
      permalink: post.permalink,
      url: post.url,
      author: post.author,
      flair: post.link_flair_text,
      linkedDomain: linkedDomain(post.url),
      velocityScore: Number(((post.score + post.num_comments * 2) / ageHours).toFixed(2))
    };
  });

  const repeatedPhrases = extractPhrasesFromTitles(posts.map((post) => post.title)).map((entry) => ({
    phrase: entry.phrase,
    normalizedTerm: normalizeTerm(entry.phrase),
    count: entry.count,
    postIds: posts.filter((post) => normalizeTerm(post.title).includes(entry.phrase)).map((post) => post.id),
    velocityScore: posts
      .filter((post) => normalizeTerm(post.title).includes(entry.phrase))
      .reduce((sum, post) => sum + post.velocityScore, 0)
  }));

  const domainCounts = new Map();
  for (const post of posts) {
    domainCounts.set(post.linkedDomain, (domainCounts.get(post.linkedDomain) ?? 0) + 1);
  }

  return {
    generatedAt: new Date().toISOString(),
    subreddit: "AnimalRights",
    posts,
    repeatedPhrases,
    linkedDomains: [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    recurringTopics: repeatedPhrases.slice(0, 10).map((entry) => ({ topic: entry.phrase, count: entry.count }))
  };
}

async function main() {
  const payload = await fetchReddit();
  await safeWriteJson(path.join(DATA_DIR, "reddit.json"), payload);
  console.log("Wrote Reddit data");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
