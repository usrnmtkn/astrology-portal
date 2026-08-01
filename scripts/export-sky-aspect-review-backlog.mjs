#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createLogger, createServer } from "vite";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).map((entry) => {
  const [key, ...value] = entry.replace(/^--/, "").split("=");
  return [key, value.join("=") || "true"];
}));
const targetAt = String(args.at ?? "");
const outputDir = path.resolve(repoRoot, String(args.output ?? "docs/content-review/sky-aspects/2026-07-31"));

if (!targetAt || Number.isNaN(new Date(targetAt).getTime())) {
  throw new Error("Pass a valid explicit evaluation instant with --at=<ISO timestamp>.");
}

for (const file of [path.join(repoRoot, "apps/web/.env.local"), path.join(repoRoot, ".env.local")]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const slug = (value) => String(value ?? "")
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

function rowKey(row) {
  const facts = row.source_snapshot?.cardFacts ?? {};
  return [facts.a, facts.aspect, facts.b, facts.signA, facts.signB].map(slug).join("|");
}

async function canonicalNoonMatrix() {
  const logger = createLogger("error");
  const originalError = logger.error;
  logger.error = (message, options) => {
    const text = String(message);
    if (text.includes("WebSocket server error") || text.includes("Failed to run dependency scan")) return;
    originalError(message, options);
  };
  const vite = await createServer({
    root: path.join(repoRoot, "apps/web"),
    customLogger: logger,
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { entries: [], noDiscovery: true },
    appType: "custom",
    logLevel: "error"
  });

  try {
    const ephemeris = await vite.ssrLoadModule("/src/services/ephemeris.ts");
    const snapshot = await ephemeris.getAstrodienstSky(
      ephemeris.defaultLocation,
      new Date(targetAt),
      { includeTransitWindows: false }
    );
    const signs = new Map(snapshot.positions.map((position) => [position.planet, position.sign]));

    return {
      profile: "canonical-sky-aspect-v1",
      evaluatedAt: targetAt,
      generatedAt: snapshot.generatedAt,
      location: ephemeris.defaultLocation,
      positions: snapshot.positions.map(({ planet, sign, degree }) => ({ planet, sign, degree })),
      aspects: snapshot.aspects.map(({ from, type, to, orb }) => ({
        from,
        type,
        to,
        orb,
        key: [from, type, to, signs.get(from), signs.get(to)].map(slug).join("|")
      }))
    };
  } finally {
    await vite.close();
  }
}

async function reviewRows() {
  const baseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!baseUrl || !key) throw new Error("Supabase read credentials are not configured.");

  const params = new URLSearchParams({
    surface: "eq.sky",
    block_type: "eq.sky_aspect",
    select: "id,content_key,status,review_state,target_date,headline,summary,body,judge_score,judge_gate,judge_verdict,judge_why,updated_at,source_snapshot",
    order: "updated_at.desc",
    limit: "500"
  });
  const response = await fetch(`${baseUrl}/rest/v1/generated_interpretations?${params}`, {
    headers: { apikey: key, authorization: `Bearer ${key}` }
  });
  if (!response.ok) throw new Error(`Review export query failed: ${response.status} ${await response.text()}`);
  return response.json();
}

function markdownFor(title, rows, matrixKeys, { legacy = false } = {}) {
  return [
    `# ${title}`,
    "",
    `Exported: ${new Date().toISOString()}`,
    `Canonical matrix: canonical-sky-aspect-v1 at ${targetAt}`,
    `Count: ${rows.length}`,
    "",
    ...rows.flatMap((row, index) => {
      const facts = row.source_snapshot?.cardFacts ?? {};
      const key = rowKey(row);
      const matches = matrixKeys.has(key);
      return [
        `## ${index + 1}. ${row.headline || row.content_key}`,
        "",
        `- Content key: \`${row.content_key}\``,
        `- Planet/aspect/sign key: \`${key}\``,
        `- Judge score: ${row.judge_score ?? "not scored"}`,
        `- Judge gate: ${row.judge_gate ?? "not set"}`,
        `- Review state: ${row.review_state ?? "none"}`,
        `- Canonical noon matrix match: ${matches ? "yes" : "no"}`,
        ...(legacy ? ["- Queue: legacy"] : []),
        ...(facts.pairKey ? [`- Pair source key: \`${facts.pairKey}\``] : []),
        "",
        "### Full text",
        "",
        row.body?.trim() || "_No body text stored._",
        ""
      ];
    })
  ].join("\n");
}

const [matrix, rows] = await Promise.all([canonicalNoonMatrix(), reviewRows()]);
const modern = rows.filter((row) => row.status === "DRAFT" && row.review_state === "sky-voice-needs-review");
const legacy = rows.filter((row) => row.status === "DRAFT" && row.review_state === "marie_signoff_required");
const matrixKeys = new Set(matrix.aspects.map((aspect) => aspect.key));
const exactMatches = modern.filter((row) => matrixKeys.has(rowKey(row)));
const carryovers = modern.filter((row) => !matrixKeys.has(rowKey(row)));
const active = [...exactMatches, ...carryovers].slice(0, 13);
const activeIds = new Set(active.map((row) => row.id));
const remaining = modern.filter((row) => !activeIds.has(row.id));

if (modern.length !== 20 || active.length !== 13 || remaining.length !== 7 || legacy.length !== 26) {
  throw new Error(`Expected 13 + 7 + 26 rows; found ${active.length} + ${remaining.length} + ${legacy.length}.`);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, "canonical-noon-matrix.json"), `${JSON.stringify(matrix, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, "01-active-review-queue.md"), `${markdownFor("Active sky-aspect review queue", active, matrixKeys)}\n`);
fs.writeFileSync(path.join(outputDir, "02-remaining-voice-review.md"), `${markdownFor("Remaining sky-aspect voice-review drafts", remaining, matrixKeys)}\n`);
fs.writeFileSync(path.join(outputDir, "03-legacy-owner-signoff.md"), `${markdownFor("Legacy sky rows awaiting owner signoff", legacy, matrixKeys, { legacy: true })}\n`);
fs.writeFileSync(path.join(outputDir, "README.md"), `${[
  "# Sky-aspect editorial backlog",
  "",
  `Canonical evaluation: ${targetAt}`,
  `Exact current-matrix draft matches: ${exactMatches.length}`,
  `Requested active queue: ${active.length}`,
  `Remaining voice-review drafts: ${remaining.length}`,
  `Legacy rows: ${legacy.length}`,
  "",
  exactMatches.length === 13
    ? "All active-queue rows match the canonical noon matrix."
    : `The canonical 5 degree matrix matches ${exactMatches.length} drafts. The active file retains ${13 - exactMatches.length} recently generated wider-orb carryover row so the requested 13-row queue is not lost; each row records whether it matches the canonical matrix.`,
  "",
  "These are read-only database exports for editorial review. Editing these files does not publish content."
].join("\n")}\n`);

console.log(JSON.stringify({
  outputDir,
  matrixAspects: matrix.aspects.length,
  exactMatches: exactMatches.length,
  active: active.length,
  remaining: remaining.length,
  legacy: legacy.length
}, null, 2));
