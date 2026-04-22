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

export async function safeReadText(filePath, fallback = null) {
  try {
    return await fs.readFile(filePath, "utf8");
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

export function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  function pushCell() {
    row.push(current);
    current = "";
  }

  function pushRow() {
    if (row.length > 1 || row[0] !== "") {
      rows.push(row);
    }
    row = [];
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      pushCell();
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      pushCell();
      pushRow();
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    pushCell();
    pushRow();
  }

  if (rows.length === 0) return [];
  const [header, ...body] = rows;

  return body.map((cells) => {
    const record = {};
    header.forEach((name, columnIndex) => {
      record[String(name ?? "").trim()] = String(cells[columnIndex] ?? "").trim();
    });
    return record;
  });
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

export function extractPhrasesFromTitles(titles, maxWords = 3, maxResults = 20) {
  const counts = new Map();
  for (const title of titles) {
    const words = normalizeTerm(title).split(" ").filter((word) => word.length > 2);
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
    .slice(0, maxResults);
}

function comparableTokens(value) {
  return normalizeTerm(value)
    .split(" ")
    .filter((token) => token.length > 2)
    .map((token) => (token.endsWith("s") && token.length > 4 ? token.slice(0, -1) : token));
}

function termsAreRelated(left, right) {
  const a = normalizeTerm(left);
  const b = normalizeTerm(right);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  const aTokens = comparableTokens(a);
  const bTokens = comparableTokens(b);
  if (!aTokens.length || !bTokens.length) return false;

  const overlap = aTokens.filter((token) => bTokens.includes(token));
  const shorterLength = Math.min(aTokens.length, bTokens.length);
  return overlap.length >= 2 && overlap.length / shorterLength >= 0.66;
}

export function matchTermsAcrossSources(signals) {
  const grouped = new Map();
  for (const signal of signals) {
    const existingKey = [...grouped.keys()].find((key) => termsAreRelated(key, signal.normalizedTerm));
    const key = existingKey ?? signal.normalizedTerm;
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

export async function runApifyActor(actorId, input, token) {
  const result = await fetchJson(`https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return Array.isArray(result) ? result : [];
}
