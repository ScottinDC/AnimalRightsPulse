import path from "node:path";
import { DATA_DIR, extractPhrasesFromTitles, fetchJson, normalizeTerm, parseCsv, runApifyActor, safeReadJson, safeReadText, safeWriteJson } from "./lib.mjs";

const CLUSTER_STOPWORDS = new Set([
  "about",
  "after",
  "against",
  "around",
  "because",
  "campaign",
  "debate",
  "grows",
  "report",
  "reports",
  "still",
  "their",
  "these",
  "those",
  "under",
  "video",
  "videos",
  "watch",
  "with",
  "reddit",
  "redd",
  "redditcom",
  "oldreddit",
  "oldredditcom",
  "com",
  "www",
  "http",
  "https",
  "needed",
  "request",
  "update",
  "post",
  "share",
  "please"
]);

const THEMATIC_TREND_DEFINITIONS = [
  {
    label: "Euthanasia Rescue Alerts",
    keywords: ["euthanasia", "euth", "deadline", "deadlined", "last call", "rescue hold", "shelter", "hours left"],
    priority: 5
  },
  {
    label: "Veterinary Rescue Needs",
    keywords: ["veterinary", "vet", "doctor", "vaccine", "infection", "injuries", "injury", "respiratory", "care"],
    priority: 4
  },
  {
    label: "Cat Rescue & Foster",
    keywords: ["kitten", "kittens", "cat", "cats", "rescuecats", "foster", "adoption", "stray"],
    priority: 3
  },
  {
    label: "Dog Rescue & Adoption",
    keywords: ["dog", "dogs", "puppy", "puppies", "rescuedogs", "adoptable", "adoption"],
    priority: 3
  },
  {
    label: "Wildlife Conservation",
    keywords: ["rewilding", "wolves", "wolf", "lynx", "whales", "whale", "hippos", "habitat", "conservation", "wildlife", "cull"],
    priority: 2
  },
  {
    label: "Rescue Fundraising",
    keywords: ["donation", "donations", "pledge", "funds", "support", "bills", "help needed", "hail mary"],
    priority: 1
  }
];

function linkedDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "reddit.com";
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function classifyRedditDirection(momentumScore, freshnessScore, postCount) {
  if (momentumScore >= 72 && freshnessScore >= 58 && postCount >= 2) {
    return { direction: "accelerating", trendLabel: "breakout" };
  }
  if (momentumScore >= 48) {
    return { direction: "rising", trendLabel: freshnessScore >= 55 ? "new" : "rising" };
  }
  if (momentumScore <= 20 || freshnessScore <= 18) {
    return { direction: "cooling", trendLabel: "declining" };
  }
  return { direction: "steady", trendLabel: "steady" };
}

function pickClusterLabel(phrase) {
  return phrase
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildTrendClusters(posts) {
  const candidatePhrases = extractPhrasesFromTitles(posts.map((post) => post.title), 4, 80)
    .filter((entry) => {
      const words = entry.phrase.split(" ");
      const hasRealWord = words.some((word) => !CLUSTER_STOPWORDS.has(word));
      return entry.count > 1 && hasRealWord && words.length >= 2;
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.phrase.split(" ").length - a.phrase.split(" ").length;
    });

  const usedPostIds = new Set();
  const clusters = [];

  for (const entry of candidatePhrases) {
    const matchedPosts = posts
      .filter((post) => normalizeTerm(post.title).includes(entry.phrase))
      .sort((a, b) => b.velocityScore - a.velocityScore);

    if (matchedPosts.length < 2) continue;

    const clusterPosts = matchedPosts.filter((post) => !usedPostIds.has(post.id));
    if (clusterPosts.length < 2) continue;

    clusterPosts.forEach((post) => usedPostIds.add(post.id));

    const totalScore = clusterPosts.reduce((sum, post) => sum + post.score, 0);
    const totalComments = clusterPosts.reduce((sum, post) => sum + post.numComments, 0);
    const avgRank = clusterPosts.reduce((sum, post, index) => sum + Number(post.rank ?? index + 1), 0) / clusterPosts.length;
    const bestRank = Math.min(...clusterPosts.map((post, index) => Number(post.rank ?? index + 1)));
    const freshnessHours = Math.min(
      ...clusterPosts.map((post) => Math.max((Date.now() - Number(new Date(post.createdUtc))) / 3_600_000, 1))
    );
    const freshnessScore = clamp(100 - freshnessHours * 4.5, 8, 100);
    const rawMomentum = totalScore * 0.42 + totalComments * 0.34 + (100 - avgRank * 6) + freshnessScore * 0.4 + clusterPosts.length * 10;
    const momentumScore = clamp(Number((rawMomentum / 4.2).toFixed(1)), 8, 100);
    const { direction, trendLabel } = classifyRedditDirection(momentumScore, freshnessScore, clusterPosts.length);
    const subreddits = new Set(clusterPosts.map((post) => post.subreddit ?? "AnimalRights"));

    clusters.push({
      id: `reddit-trend-${entry.phrase.replace(/\s+/g, "-")}`,
      label: pickClusterLabel(entry.phrase),
      normalizedTerm: normalizeTerm(entry.phrase),
      postCount: clusterPosts.length,
      subredditCount: subreddits.size,
      avgRank: Number(avgRank.toFixed(1)),
      bestRank,
      totalScore,
      totalComments,
      freshnessHours: Number(freshnessHours.toFixed(1)),
      freshnessScore: Number(freshnessScore.toFixed(1)),
      momentumScore,
      direction,
      trendLabel,
      urls: clusterPosts.map((post, index) => ({
        postId: post.id,
        title: post.title,
        url: post.url,
        permalink: post.permalink,
        subreddit: post.subreddit ?? "AnimalRights",
        score: post.score,
        numComments: post.numComments,
        createdUtc: post.createdUtc,
        rank: Number(post.rank ?? index + 1)
      }))
    });
  }

  return clusters.sort((a, b) => b.momentumScore - a.momentumScore).slice(0, 8);
}

function buildClusterFromPosts(label, posts) {
  if (posts.length < 2) return null;

  const sortedPosts = [...posts].sort((a, b) => b.velocityScore - a.velocityScore);
  const totalScore = sortedPosts.reduce((sum, post) => sum + post.score, 0);
  const totalComments = sortedPosts.reduce((sum, post) => sum + post.numComments, 0);
  const avgRank = sortedPosts.reduce((sum, post, index) => sum + Number(post.rank ?? index + 1), 0) / sortedPosts.length;
  const bestRank = Math.min(...sortedPosts.map((post, index) => Number(post.rank ?? index + 1)));
  const freshnessHours = Math.min(
    ...sortedPosts.map((post) => Math.max((Date.now() - Number(new Date(post.createdUtc))) / 3_600_000, 1))
  );
  const freshnessScore = clamp(100 - freshnessHours * 4.5, 8, 100);
  const rawMomentum = totalScore * 0.42 + totalComments * 0.34 + (100 - avgRank * 6) + freshnessScore * 0.4 + sortedPosts.length * 10;
  const momentumScore = clamp(Number((rawMomentum / 4.2).toFixed(1)), 8, 100);
  const { direction, trendLabel } = classifyRedditDirection(momentumScore, freshnessScore, sortedPosts.length);
  const subreddits = new Set(sortedPosts.map((post) => post.subreddit ?? "AnimalRights"));

  return {
    id: `reddit-trend-${normalizeTerm(label).replace(/\s+/g, "-")}`,
    label,
    normalizedTerm: normalizeTerm(label),
    postCount: sortedPosts.length,
    subredditCount: subreddits.size,
    avgRank: Number(avgRank.toFixed(1)),
    bestRank,
    totalScore,
    totalComments,
    freshnessHours: Number(freshnessHours.toFixed(1)),
    freshnessScore: Number(freshnessScore.toFixed(1)),
    momentumScore,
    direction,
    trendLabel,
    urls: sortedPosts.map((post, index) => ({
      postId: post.id,
      title: post.title,
      url: post.url,
      permalink: post.permalink,
      subreddit: post.subreddit ?? "AnimalRights",
      score: post.score,
      numComments: post.numComments,
      createdUtc: post.createdUtc,
      rank: Number(post.rank ?? index + 1)
    }))
  };
}

function bestMatchingTheme(post) {
  const haystack = normalizeTerm(`${post.title} ${post.subreddit ?? ""}`);
  let best = null;

  for (const theme of THEMATIC_TREND_DEFINITIONS) {
    const matches = theme.keywords.filter((keyword) => haystack.includes(normalizeTerm(keyword))).length;
    if (matches === 0) continue;

    const score = matches * 10 + theme.priority;
    if (!best || score > best.score) {
      best = { label: theme.label, score };
    }
  }

  return best?.label ?? null;
}

function buildThematicTrendClusters(posts) {
  const grouped = new Map();

  for (const post of posts) {
    const label = bestMatchingTheme(post);
    if (!label) continue;
    const list = grouped.get(label) ?? [];
    list.push(post);
    grouped.set(label, list);
  }

  return [...grouped.entries()]
    .map(([label, themedPosts]) => buildClusterFromPosts(label, themedPosts))
    .filter(Boolean)
    .sort((a, b) => b.momentumScore - a.momentumScore);
}

function dedupePosts(posts) {
  const deduped = new Map();

  for (const post of posts) {
    const key = post.permalink || post.url || `${normalizeTerm(post.title)}::${post.subreddit}`;
    const existing = deduped.get(key);

    if (!existing) {
      deduped.set(key, post);
      continue;
    }

    const existingCreated = Number(new Date(existing.createdUtc));
    const nextCreated = Number(new Date(post.createdUtc));

    const preferred =
      post.score > existing.score ||
      post.numComments > existing.numComments ||
      nextCreated > existingCreated
        ? {
            ...existing,
            ...post,
            score: Math.max(existing.score, post.score),
            numComments: Math.max(existing.numComments, post.numComments),
            createdUtc: new Date(Math.max(existingCreated, nextCreated)).toISOString(),
            rank: Math.min(existing.rank ?? Infinity, post.rank ?? Infinity)
          }
        : existing;

    deduped.set(key, preferred);
  }

  return [...deduped.values()].sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
}

function readBrowseAiItems(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.records)) return raw.records;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.posts)) return raw.posts;
  return [];
}

function normalizeHeader(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function pickField(row, candidates, fallback = "") {
  const entries = Object.entries(row ?? {});
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const exact = entries.find(([key]) => normalizeHeader(key) === normalizedCandidate);
    if (exact && String(exact[1] ?? "").trim()) return exact[1];
  }

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeHeader(candidate);
    const fuzzy = entries.find(([key]) => normalizeHeader(key).includes(normalizedCandidate));
    if (fuzzy && String(fuzzy[1] ?? "").trim()) return fuzzy[1];
  }

  return fallback;
}

function cleanSubreddit(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "AnimalRights";
  return raw.replace(/^\/?r\//i, "");
}

function parseRelativeTime(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return Date.now();

  const absolute = Number(new Date(raw));
  if (Number.isFinite(absolute) && absolute > 0) return absolute;

  const match = raw.match(/(\d+)\s+(minute|minutes|hour|hours|day|days|week|weeks|month|months)\s+ago/);
  if (!match) return Date.now();

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    minute: 60_000,
    minutes: 60_000,
    hour: 3_600_000,
    hours: 3_600_000,
    day: 86_400_000,
    days: 86_400_000,
    week: 604_800_000,
    weeks: 604_800_000,
    month: 2_592_000_000,
    months: 2_592_000_000
  };

  return Date.now() - amount * (multipliers[unit] ?? 0);
}

function normalizeAirtableRecord(record, index) {
  const fields = record?.fields ?? {};
  const createdAt = parseRelativeTime(
    pickField(fields, ["Date (GMT)", "Date GMT", "Created", "Created At", "Submission T"])
  );
  const permalink = pickField(fields, ["Comments URL", "Permalink", "Comments Url"], "");
  const postUrl = pickField(fields, ["Post URL", "Post URL-2", "URL", "Link"], "");
  const url = postUrl || permalink;
  const commentText = pickField(fields, ["Comments Count", "Comments C", "Comments"], "0");
  const scoreText = pickField(fields, ["Score", "Score-2", "Points"], "0");
  const rankText = pickField(fields, ["Rank", "Rank-2", "Position"], String(index + 1));

  const post = {
    id: record?.id ?? `airtable-reddit-${index}`,
    title: pickField(fields, ["Title", "Title-2"], "Untitled Reddit post"),
    score: Number.parseInt(String(scoreText).replace(/[^0-9-]/g, ""), 10) || 0,
    numComments: Number.parseInt(String(commentText).replace(/[^0-9-]/g, ""), 10) || 0,
    createdUtc: new Date(createdAt).toISOString(),
    permalink,
    url,
    author: pickField(fields, ["Author", "Author-2"], "unknown"),
    flair: pickField(fields, ["Flair", "Tag"], ""),
    subreddit: cleanSubreddit(pickField(fields, ["Subreddit", "Subreddit-2"], "AnimalRights")),
    rank: Number.parseInt(String(rankText).replace(/[^0-9-]/g, ""), 10) || index + 1,
    linkedDomain: linkedDomain(url),
    velocityScore: 0
  };

  const ageHours = Math.max((Date.now() - Number(new Date(post.createdUtc))) / 3_600_000, 1);
  return {
    ...post,
    velocityScore: Number(((post.score + post.numComments * 2.4 + Math.max(0, 40 - post.rank) * 1.5) / ageHours).toFixed(2))
  };
}

async function readBrowseAiCsv(filePath) {
  const text = await safeReadText(filePath, "");
  const rows = parseCsv(text);

  return rows.map((row, index) => {
    const createdAt = parseRelativeTime(
      pickField(row, ["createdUtc", "Submission T", "Submission Time", "Created At", "Posted At"])
    );
    const permalink = pickField(row, ["Permalink", "Permalink-2", "Reddit Permalink"], "");
    const postUrl = pickField(row, ["Post URL-2", "Post URL", "URL", "Link"], "");
    const url = postUrl || permalink;
    const commentText = pickField(row, ["Comments C", "Comments Count", "Comments", "Comment Count"], "0");
    const scoreText = pickField(row, ["Score-2", "Score", "Points"], "0");
    const rankText = pickField(row, ["Rank-2", "Rank", "Position"], String(index + 1));
    const subreddit = pickField(row, ["Subreddit-2", "Subreddit"], "AnimalRights").replace(/^\/r\//i, "");
    const title = pickField(row, ["Title-2", "Title"], "Untitled Reddit post");

    return {
      id: `browse-ai-csv-reddit-${index}`,
      title,
      score: Number.parseInt(String(scoreText).replace(/[^0-9-]/g, ""), 10) || 0,
      numComments: Number.parseInt(String(commentText).replace(/[^0-9-]/g, ""), 10) || 0,
      createdUtc: new Date(createdAt).toISOString(),
      permalink,
      url,
      author: pickField(row, ["Author-2", "Author"], "unknown"),
      flair: pickField(row, ["Flair", "Tag"], ""),
      subreddit: cleanSubreddit(subreddit),
      rank: Number.parseInt(String(rankText).replace(/[^0-9-]/g, ""), 10) || index + 1,
      linkedDomain: linkedDomain(url),
      velocityScore: 0
    };
  }).map((post) => {
    const ageHours = Math.max((Date.now() - Number(new Date(post.createdUtc))) / 3_600_000, 1);
    return {
      ...post,
      velocityScore: Number(((post.score + post.numComments * 2.4 + Math.max(0, 40 - post.rank) * 1.5) / ageHours).toFixed(2))
    };
  });
}

async function readAirtableRows() {
  const token = process.env.AIRTABLE_TOKEN;
  if (!token) throw new Error("Missing AIRTABLE_TOKEN");

  const baseId = process.env.AIRTABLE_BASE_ID ?? "appD9YYiChwRdsplC";
  const tableId = process.env.AIRTABLE_TABLE_ID ?? "tbl7Z4U0UzJJzUxbB";
  const pageSize = Number(process.env.AIRTABLE_PAGE_SIZE ?? 100);
  const fields = [
    "Date (GMT)",
    "Rank",
    "Score",
    "Title",
    "Domain",
    "Author",
    "Subreddit",
    "Comments Count",
    "Post URL",
    "Comments URL"
  ];

  const records = [];
  let offset = "";

  while (true) {
    const url = new URL(`https://api.airtable.com/v0/${baseId}/${tableId}`);
    url.searchParams.set("pageSize", String(pageSize));
    url.searchParams.set("sort[0][field]", "Rank");
    url.searchParams.set("sort[0][direction]", "asc");
    for (const field of fields) {
      url.searchParams.append("fields[]", field);
    }
    if (offset) url.searchParams.set("offset", offset);

    const payload = await fetchJson(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    records.push(...(payload.records ?? []));
    if (!payload.offset) break;
    offset = payload.offset;
  }

  return dedupePosts(records.map((record, index) => normalizeAirtableRecord(record, index)));
}

async function fetchReddit() {
  if (process.env.AIRTABLE_TOKEN) {
    const posts = await readAirtableRows();
    const thematicClusters = buildThematicTrendClusters(posts);
    const trendClusters = thematicClusters.length > 0 ? thematicClusters : buildTrendClusters(posts);
    const repeatedPhrases = trendClusters.map((cluster) => ({
      phrase: cluster.label.toLowerCase(),
      normalizedTerm: cluster.normalizedTerm,
      count: cluster.postCount,
      postIds: cluster.urls.map((row) => row.postId),
      velocityScore: cluster.momentumScore
    }));

    const domainCounts = new Map();
    for (const post of posts) {
      domainCounts.set(post.linkedDomain, (domainCounts.get(post.linkedDomain) ?? 0) + 1);
    }

    return {
      generatedAt: new Date().toISOString(),
      subreddit: "AnimalRightsMeta",
      posts,
      repeatedPhrases,
      trendClusters,
      linkedDomains: [...domainCounts.entries()]
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recurringTopics: trendClusters.map((entry) => ({ topic: entry.label, count: entry.postCount }))
    };
  }

  if (process.env.BROWSE_AI_CSV_FILE) {
    const posts = await readBrowseAiCsv(path.resolve(process.cwd(), process.env.BROWSE_AI_CSV_FILE));
    const thematicClusters = buildThematicTrendClusters(posts);
    const trendClusters = thematicClusters.length > 0 ? thematicClusters : buildTrendClusters(posts);
    const repeatedPhrases = trendClusters.map((cluster) => ({
      phrase: cluster.label.toLowerCase(),
      normalizedTerm: cluster.normalizedTerm,
      count: cluster.postCount,
      postIds: cluster.urls.map((row) => row.postId),
      velocityScore: cluster.momentumScore
    }));

    const domainCounts = new Map();
    for (const post of posts) {
      domainCounts.set(post.linkedDomain, (domainCounts.get(post.linkedDomain) ?? 0) + 1);
    }

    return {
      generatedAt: new Date().toISOString(),
      subreddit: "AnimalRightsMeta",
      posts,
      repeatedPhrases,
      trendClusters,
      linkedDomains: [...domainCounts.entries()]
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recurringTopics: trendClusters.map((entry) => ({ topic: entry.label, count: entry.postCount }))
    };
  }

  if (process.env.BROWSE_AI_REDDIT_FILE) {
    const raw = await safeReadJson(path.resolve(process.cwd(), process.env.BROWSE_AI_REDDIT_FILE), []);
    const items = readBrowseAiItems(raw);
    const posts = items.map((post, index) => {
      const createdRaw =
        post.createdUtc ??
        post.created_at ??
        post.createdAt ??
        post.postedAt ??
        post.ageTimestamp ??
        Date.now();
      const createdAt =
        typeof createdRaw === "number" && createdRaw < 10_000_000_000 ? createdRaw * 1000 : Number(new Date(createdRaw));
      const ageHours = Math.max((Date.now() - createdAt) / 3_600_000, 1);
      const score = Number(post.score ?? post.upvotes ?? post.points ?? 0);
      const numComments = Number(post.numComments ?? post.comments ?? post.commentCount ?? 0);
      const rank = Number(post.rank ?? post.ranking ?? post.position ?? index + 1);
      const url = post.url ?? post.storyUrl ?? post.link ?? post.permalink ?? "";

      return {
        id: post.id ?? `browse-ai-reddit-${index}`,
        title: post.title ?? post.headline ?? "Untitled Reddit post",
        score,
        numComments,
        createdUtc: new Date(createdAt).toISOString(),
        permalink: post.permalink ?? "",
        url,
        author: post.author ?? "unknown",
        flair: post.flair ?? post.link_flair_text,
        subreddit: post.subreddit ?? post.community ?? "AnimalRights",
        rank,
        linkedDomain: linkedDomain(url),
        velocityScore: Number(((score + numComments * 2.4 + Math.max(0, 40 - rank) * 1.5) / ageHours).toFixed(2))
      };
    });

    const trendClusters = buildTrendClusters(posts);
    const repeatedPhrases = trendClusters.map((cluster) => ({
      phrase: cluster.label.toLowerCase(),
      normalizedTerm: cluster.normalizedTerm,
      count: cluster.postCount,
      postIds: cluster.urls.map((row) => row.postId),
      velocityScore: cluster.momentumScore
    }));

    const domainCounts = new Map();
    for (const post of posts) {
      domainCounts.set(post.linkedDomain, (domainCounts.get(post.linkedDomain) ?? 0) + 1);
    }

    return {
      generatedAt: new Date().toISOString(),
      subreddit: "AnimalRightsMeta",
      posts,
      repeatedPhrases,
      trendClusters,
      linkedDomains: [...domainCounts.entries()]
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      recurringTopics: trendClusters.map((entry) => ({ topic: entry.label, count: entry.postCount }))
    };
  }

  if (!process.env.APIFY_TOKEN) {
    return safeReadJson(path.join(DATA_DIR, "reddit.json"));
  }

  let items;
  try {
    items = await runApifyActor(
      "spry_wholemeal~reddit-scraper",
      {
        subredditUrls: ["https://www.reddit.com/r/AnimalRights/"],
        sort: "new",
        maxItems: 50
      },
      process.env.APIFY_TOKEN
    );
  } catch (error) {
    console.warn(`Falling back to mock Reddit data: ${error.message}`);
    return safeReadJson(path.join(DATA_DIR, "reddit.json"));
  }

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
      subreddit: post.subreddit ?? "AnimalRights",
      rank: Number(post.rank ?? post.position ?? index + 1),
      linkedDomain: linkedDomain(url),
      velocityScore: Number(((score + numComments * 2) / ageHours).toFixed(2))
    };
  });

  const trendClusters = buildTrendClusters(posts);
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
    trendClusters,
    linkedDomains: [...domainCounts.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    recurringTopics: (trendClusters.length > 0 ? trendClusters : repeatedPhrases.slice(0, 10)).map((entry) => ({
      topic: entry.label ?? entry.phrase,
      count: entry.postCount ?? entry.count
    }))
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
