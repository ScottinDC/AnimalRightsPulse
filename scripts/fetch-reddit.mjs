import path from "node:path";
import { DATA_DIR, extractPhrasesFromTitles, normalizeTerm, runApifyActor, safeReadJson, safeWriteJson } from "./lib.mjs";

function linkedDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "reddit.com";
  }
}

async function fetchReddit() {
  if (!process.env.APIFY_TOKEN) {
    return safeReadJson(path.join(DATA_DIR, "reddit.json"));
  }

  const items = await runApifyActor(
    "spry_wholemeal~reddit-scraper",
    {
      subredditUrls: ["https://www.reddit.com/r/AnimalRights/"],
      sort: "new",
      maxItems: 50
    },
    process.env.APIFY_TOKEN
  );

  const posts = items.map((post, index) => {
    const createdRaw = post.createdAt ?? post.created_utc ?? post.timestamp ?? Date.now();
    const createdAt = typeof createdRaw === "number" && createdRaw < 10_000_000_000 ? createdRaw * 1000 : Number(new Date(createdRaw));
    const ageHours = Math.max((Date.now() - createdAt) / 3_600_000, 1);
    const score = Number(post.score ?? post.upvotes ?? 0);
    const numComments = Number(post.numComments ?? post.num_comments ?? 0);
    const url = post.url ?? post.outboundUrl ?? post.permalink ?? "";

    return {
      id: post.id ?? `reddit-${index}`,
      title: post.title ?? "Untitled Reddit post",
      score,
      numComments,
      createdUtc: new Date(createdAt).toISOString(),
      permalink: post.permalink ?? "",
      url,
      author: post.author ?? "unknown",
      flair: post.flair ?? post.link_flair_text,
      linkedDomain: linkedDomain(url),
      velocityScore: Number(((score + numComments * 2) / ageHours).toFixed(2))
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
