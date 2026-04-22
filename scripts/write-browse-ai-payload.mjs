import path from "node:path";
import { DATA_DIR, safeWriteJson } from "./lib.mjs";

const OUTPUT_FILE = path.join(DATA_DIR, "browse-ai-reddit.json");

function parsePayload() {
  const raw = process.env.BROWSE_AI_PAYLOAD ?? "";
  if (!raw.trim()) {
    return null;
  }

  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed?.browse_ai_payload)) {
    return parsed.browse_ai_payload;
  }
  if (parsed?.browse_ai_payload && typeof parsed.browse_ai_payload === "object") {
    return parsed.browse_ai_payload;
  }
  if (typeof parsed?.browse_ai_payload === "string") {
    return JSON.parse(parsed.browse_ai_payload);
  }
  return parsed;
}

async function main() {
  const payload = parsePayload();
  if (!payload) {
    console.log("No Browse.ai payload provided");
    return;
  }

  await safeWriteJson(OUTPUT_FILE, payload);
  console.log(`Wrote Browse.ai payload to ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
