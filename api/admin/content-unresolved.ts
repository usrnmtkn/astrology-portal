import type { IncomingMessage, ServerResponse } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isContentAdminAuthorized } from "../_lib/admin-auth.js";
import { loadLocalWebEnv } from "../_lib/local-env.js";

loadLocalWebEnv();

const reportPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../packages/astro-knowledge/generated/content-unresolved-queue-v1.json"
);

let cachedReport: unknown = null;

export function unresolvedContentSurface(contentKey: string) {
  if (contentKey.includes("daily-") || contentKey.startsWith("daily-glance-variant/")) return "Daily Glance";
  if (contentKey.includes("synastry") || contentKey.includes("compat") || contentKey.includes("relationship") || contentKey.includes("bond-")) return "Friends / Relationships";
  if (contentKey.includes("natal") || contentKey.includes("placement")) return "Natal / Placements";
  if (contentKey.includes("lunation") || contentKey.includes("eclipse") || contentKey.includes("moon-phase")) return "Lunations";
  if (contentKey.includes("sky-") || contentKey.includes("transit") || contentKey.includes("timing")) return "Sky / Transits";
  return "Other";
}

export function loadContentUnresolvedReport() {
  if (!cachedReport) {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8")) as {
      items: Array<{ contentKey: string }>;
      [key: string]: unknown;
    };
    const items = report.items.map((item) => ({ ...item, surface: unresolvedContentSurface(item.contentKey) }));
    cachedReport = {
      ...report,
      items,
      surfaceCounts: Object.fromEntries([...new Set(items.map((item) => item.surface))].sort()
        .map((surface) => [surface, items.filter((item) => item.surface === surface).length]))
    };
  }
  return cachedReport;
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.setHeader("cache-control", "private, no-store");
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Use GET." });
    return;
  }
  if (!await isContentAdminAuthorized(req)) {
    sendJson(res, 401, { error: "Unauthorized." });
    return;
  }

  try {
    sendJson(res, 200, { ok: true, report: loadContentUnresolvedReport() });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to load unresolved content."
    });
  }
}
