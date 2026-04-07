import fs from "node:fs/promises";
import path from "node:path";

export const DATA_DIR = path.resolve(process.cwd(), "public/data");

export async function safeReadJson(filePath, fallback = null) {
  try {
    const value = await fs.readFile(filePath, "utf8");
    return JSON.parse(value);
  } catch (error) {
    if (fallback !== null) {
      return fallback;
    }
    throw error;
  }
}

export async function safeWriteJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

export function normalizeTerm(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function percentChange(current, previous) {
  if (!previous && !current) return 0;
  if (!previous) return 100;
  return ((current - previous) / previous) * 100;
}

export function positionGainPct(current, previous) {
  if (!previous || current === previous) return 0;
  return ((previous - current) / previous) * 100;
}

export function detectRisingTerms(currentRows, previousRows, keyField, metricFields) {
  const previousIndex = new Map(previousRows.map((row) => [row[keyField], row]));
  return currentRows.map((row) => {
    const previous = previousIndex.get(row[keyField]) ?? {};
    const deltas = {};
    for (const metric of metricFields) {
      deltas[metric] = percentChange(Number(row[metric] ?? 0), Number(previous[metric] ?? 0));
    }
    return { row, previous, deltas };
  });
}

export function extractPhrasesFromTitles(titles, maxWords = 3) {
  const counts = new Map();
  for (const title of titles) {
    const words = normalizeTerm(title).split(" ").filter((word) => word.length > 3);
    for (let size = 1; size <= maxWords; size += 1) {
      for (let index = 0; index <= words.length - size; index += 1) {
        const phrase = words.slice(index, index + size).join(" ");
        if (phrase.length < 5) continue;
        counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
  }
  return [...counts.entries()]
    .map(([phrase, count]) => ({ phrase, count }))
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

export function matchTermsAcrossSources(signals) {
  const grouped = new Map();
  for (const signal of signals) {
    const key = signal.normalizedTerm;
    const list = grouped.get(key) ?? [];
    list.push(signal);
    grouped.set(key, list);
  }
  return grouped;
}

export function computeTimeWindowLabel(window) {
  return `current:${window.currentStart}:${window.currentEnd}|previous:${window.previousStart}:${window.previousEnd}`;
}

export function getRequiredEnv(name, fallback = "") {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed ${response.status} ${response.statusText}: ${text}`);
  }
  return response.json();
}
