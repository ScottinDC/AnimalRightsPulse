import path from "node:path";
import { DATA_DIR, safeReadJson, safeWriteJson } from "./lib.mjs";

function makeStoryIdea(id, category, headline, rationale, relatedTerms, sources, priority) {
  return { id, category, headline, rationale, relatedTerms, sources, priority };
}

async function main() {
  const signalsFile = await safeReadJson(path.join(DATA_DIR, "signals.json"));
  const topSignals = signalsFile.signals.slice(0, 20);
  const cards = [
    {
      id: "top-signal",
      title: "Top Signal",
      metric: topSignals[0]?.term ?? "No data",
      change: `${topSignals[0] ? `${topSignals[0].trendLabel.charAt(0).toUpperCase()}${topSignals[0].trendLabel.slice(1)}` : "Steady"} at ${topSignals[0]?.trendScore?.toFixed?.(1) ?? "0.0"}`,
      narrative: "The highest scoring signal blends momentum, novelty, and cross-source confirmation."
    },
    {
      id: "cross-source",
      title: "Cross-Source Confirmed",
      metric: String(topSignals.filter((signal) => signal.crossSourceCount >= 3).length),
      change: "Signals seen in three or more source families",
      narrative: "These are the safest candidates for immediate editorial action."
    },
    {
      id: "internal-search",
      title: "Internal Demand Gaps",
      metric: String(topSignals.filter((signal) => signal.source === "ga4").length),
      change: "GA4 terms with rising on-site demand",
      narrative: "These terms often point to navigation gaps or missing explainers."
    },
    {
      id: "watch-list",
      title: "Watch List",
      metric: String(topSignals.filter((signal) => signal.trendLabel === "new" || signal.trendLabel === "breakout").length),
      change: "New or breakout topics",
      narrative: "These deserve a faster newsroom review loop than steady demand terms."
    }
  ];

  const storyIdeas = [
    makeStoryIdea(
      "write-now",
      "Write now",
      `Move on ${topSignals[0]?.term ?? "top signal"} before the broader cycle catches up`,
      "High-scoring, cross-source confirmed terms should convert into quick-turn coverage or refreshed explainers.",
      topSignals.slice(0, 3).map((signal) => signal.term),
      topSignals.slice(0, 3).map((signal) => signal.source),
      1
    ),
    makeStoryIdea(
      "monitor",
      "Monitor",
      `Track whether ${topSignals[3]?.term ?? "a rising topic"} graduates from social chatter to search demand`,
      "Signals with strong Reddit, Google News, or Google Trends movement but lighter site demand may be early indicators rather than immediate assignments.",
      topSignals.slice(3, 6).map((signal) => signal.term),
      topSignals.slice(3, 6).map((signal) => signal.source),
      2
    ),
    makeStoryIdea(
      "evergreen",
      "Evergreen update",
      `Refresh foundational coverage around ${topSignals[6]?.term ?? "recurring issue"} `,
      "If a term rises in GSC and internal search at the same time, a clearer evergreen explainer or FAQ often pays off faster than net-new reporting.",
      topSignals.slice(6, 9).map((signal) => signal.term),
      topSignals.slice(6, 9).map((signal) => signal.source),
      2
    ),
    makeStoryIdea(
      "ux",
      "Improve navigation/search UX",
      "Reduce friction where visitors search for topics the site still hides",
      "Repeated internal-search demand with weak organic landing-page alignment usually means the content exists but the path to it is poor.",
      topSignals.filter((signal) => signal.source === "ga4").slice(0, 4).map((signal) => signal.term),
      ["ga4"],
      3
    )
  ];

  await safeWriteJson(path.join(DATA_DIR, "summary.json"), {
    generatedAt: new Date().toISOString(),
    summaryCards: cards,
    storyIdeas
  });

  console.log("Wrote summary.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
