#!/usr/bin/env node
// Deterministic batch runner for Ascendant synastry card drafts.
// Replaces agent-orchestrated draft generation: builds packets, issues the
// authorized Sol/Terra calls directly, runs deterministic checks, and writes
// the review-packet artifact set in the ascendant-batch-1 layout.
//
// Usage:
//   node scripts/run-ascendant-batch-drafts.mjs --batch <config.json> [--dry-run] [--only <target>]
//
// The config pins the authorization: targets, models, call budget, output dir.
// --dry-run performs everything except the billed API calls (writes model
// inputs and packet artifacts, so the whole run is inspectable unbilled).
//
// Credential: OPENAI_API_KEY from the environment. Never logged, never written.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const { buildAspectWritingPacket, loadEntry } = require(
  path.join(repoRoot, "packages/astro-knowledge/scripts/build-aspect-writing-packet.js")
);

// ---------- args ----------
const args = process.argv.slice(2);
function argVal(flag) {
  const i = args.indexOf(flag);
  return i === -1 ? null : args[i + 1];
}
const DRY = args.includes("--dry-run");
const ONLY = argVal("--only");
const configPath = argVal("--batch");
if (!configPath) {
  console.error("Required: --batch <config.json>");
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(path.resolve(configPath), "utf8"));
const OUT_ROOT = path.join(repoRoot, config.outputDir);
const API_KEY = process.env.OPENAI_API_KEY;
if (!DRY && !API_KEY) {
  console.error("OPENAI_API_KEY missing from environment. Aborting before any call.");
  process.exit(1);
}

// ---------- helpers ----------
const writeArtifact = (dir, name, content) => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, name),
    typeof content === "string" ? content : `${JSON.stringify(content, null, 2)}\n`
  );
};
const sentences = (t) => (t || "").trim().split(/(?<=[.!?])\s+/u).filter(Boolean);
const sha256 = (obj) => crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");

function titleCase(s) {
  return s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

// ---------- prompt construction (batch-1 templates, verbatim structure) ----------
function solPrompt(t, entry, packet) {
  const planet = titleCase(t.planet);
  const lines = packet.warmthHarvest.ownerFoundationLines;
  const foundationBlock =
    packet.warmthHarvest.harvest_mode === "matched"
      ? `PACKET PROMPT BLOCK (SUPPLIED WITHOUT REVISION)
OWNER FOUNDATION LINES:
${lines.map((l, i) => `[${i + 1}] (${l.sourceArticleId}) ${l.suppliedLine}`).join("\n")}

Adapt one of these into the card where it lands naturally, keeping its meaning and register. Verbatim is preferred when it fits. Use at most one.
Use one warmth sentence after the shadow or cost is named. It must be the final sentence or the sentence before it. Do not add a second conclusion.`
      : `PACKET PROMPT BLOCK (SUPPLIED WITHOUT REVISION)
No owner foundation line qualified for this core (harvest_mode: none_found). Keep the register plain. Do not invent a permission, reassurance, benediction, or warmth line. Absence of warmth is acceptable; imitation warmth is not. Return warmthSource as null and labels as an empty array.`;

  return `SYSTEM / DEVELOPER INSTRUCTIONS
You are the Sol writing lane producing one TLDR Astro synastry-card candidate for owner review. Write literal, ordinary, recognizable behavior. Explain what happens between the two people plainly. Metaphors, slogans, and compressed imagery may not replace meaning. Return only the requested JSON.
The candidate is not approved, canonical, promotable, render-eligible, or serving content.

TARGET: ${planet} -> Ascendant, ${t.aspectLabel}
DIRECTION: {{holder1}} is always the ${planet} holder. {{holder2}} is always the Ascendant holder. The ${planet} holder acts on how the Ascendant holder presents themselves and enters situations.

GOVERNED MEANING BOUNDARY
plainTranslation: ${entry.plainTranslation}
summaryDeep: ${entry.summaryDeep}
Approved human-moment semantic input: ${entry.humanMoment}
Treat these as meaning evidence, not sentences to paraphrase in sequence. Stay inside them. Do not add outside astrology doctrine or new scenarios.
Do not claim luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, or required confidence.

${foundationBlock}

SURFACE AND ROW CONTRACT
Write one card in two resolver-safe reader variants that carry the same meaning:
- body_you: the reader is {{holder1}}, so refer to the ${planet} holder as 'you' and keep the Ascendant holder as {{holder2}}.
- body_they: the reader is {{holder2}}, so keep the ${planet} holder as {{holder1}} and refer to the Ascendant holder as 'you'.
Use ordinary sentences a tired reader can understand immediately. Make the direction and response loop unmistakable. Give recognizable behavior and its cost. Use two to four sentences per field. Stop when the interaction is clear.
Do not use an em dash or en dash. Do not give advice. Do not add a stock closer, slogan, definition, abstract recap, second conclusion, guaranteed outcome, invented scene, corporate phrasing, or formal explanation of astrology.
Do not copy the governed meaning notes as ready-made target prose. Do not use any legacy card as a writing model; no legacy wording is present in this request.

WARMTH RECORD
If you use a supplied foundation line, record its exact provenance. Use no more than one. If none fits naturally, return warmthSource as null and labels as an empty array; Terra will score that editorial choice for owner review.
When warmthSource is used, it must identify one supplied owner foundation line exactly. usedForm.body_you and usedForm.body_they must be the exact sentences appearing in their respective bodies. Set labels to ["owner-corpus-derived"].

OUTPUT
Return strict JSON with exactly: body_you, body_they, warmthSource, labels. Do not include commentary.`;
}

function terraPrompt(t, entry, packet, draft, checks) {
  const planet = titleCase(t.planet);
  return `You are the Terra editorial judge for one TLDR Astro synastry aspect candidate. This score supports owner review only and can never approve or promote copy. Return only strict JSON.

TARGET: ${planet} -> Ascendant, ${t.aspectLabel}
DIRECTION: {{holder1}} is the ${planet} holder and acts on {{holder2}}'s Ascendant presentation and entry into situations.
GOVERNED SOURCE BOUNDARY:
plainTranslation: ${entry.plainTranslation}
summaryDeep: ${entry.summaryDeep}
APPROVED HUMAN-MOMENT INPUT: ${entry.humanMoment}
Do not import outside astrology doctrine. Do not reward a draft for merely paraphrasing these supplied sentences.
EXCLUSIONS: luck or improved odds, guaranteed events or outcomes, third-party arrivals, literal size, food, bills, portions, scorekeeping, required confidence, invented scenes, or advice.

SUPPLIED OWNER FOUNDATION LINES
${JSON.stringify(packet.warmthHarvest.ownerFoundationLines.map(({ sourceArticleId, originalLine, suppliedLine }) => ({ sourceArticleId, originalLine, suppliedLine })), null, 2)}
HARVEST MODE: ${packet.warmthHarvest.harvest_mode}

DRAFT (DO NOT REWRITE)
${JSON.stringify(draft, null, 2)}

DETERMINISTIC CHECKS
${JSON.stringify(checks, null, 2)}

JUDGE RULES
Score 1-3. 3 requires: fixed direction held in both variants, a recognizable behavior-and-cost loop inside the governed boundary, parallel meaning across variants, no excluded claims, no stock closer or second conclusion, and (when foundation lines were supplied) any turn toward the reader traced to a supplied line. Under none_found, no turn toward the reader is required and its absence is not penalized; invented imitation warmth scores 2 or below. Verbatim or near-verbatim use of a supplied owner line is never copying.
Return strict JSON: {"score": <1|2|3>, "verdict": "<in-voice|borderline|out-of-voice>", "reasoning": "<3-6 sentences citing the specific sentences that decide the score>"}`;
}

// ---------- deterministic checks ----------
function runChecks(t, packet, draft) {
  const checks = { target: t.id, passed: true };
  const fail = (k, detail) => {
    checks[k] = { passed: false, ...detail };
    checks.passed = false;
  };
  const pass = (k, detail) => (checks[k] = { passed: true, ...(detail || {}) });

  if (!draft || typeof draft !== "object") return { target: t.id, passed: false, parse: false };
  const keys = Object.keys(draft).sort().join(",");
  keys === "body_they,body_you,labels,warmthSource"
    ? pass("exactOutputShape")
    : fail("exactOutputShape", { keys });

  for (const f of ["body_you", "body_they"]) {
    const n = sentences(draft[f]).length;
    n >= 2 && n <= 4 ? pass(`sentenceCount_${f}`, { n }) : fail(`sentenceCount_${f}`, { n });
    /[—–]/.test(draft[f] || "") ? fail(`noDashes_${f}`) : pass(`noDashes_${f}`);
    /[‘’“”]/.test(draft[f] || "")
      ? fail(`asciiPunctuation_${f}`)
      : pass(`asciiPunctuation_${f}`);
  }
  // direction: body_you must not contain {{holder1}}, body_they must not contain {{holder2}}
  (draft.body_you || "").includes("{{holder1}}")
    ? fail("rowDirection_body_you")
    : pass("rowDirection_body_you");
  (draft.body_they || "").includes("{{holder2}}")
    ? fail("rowDirection_body_they")
    : pass("rowDirection_body_they");

  const banned = /\b(luck|lucky|jackpot|guarantee|guaranteed|invitation|invitations|bill|bills|portion|portions|scorecard|keeping score)\b/i;
  for (const f of ["body_you", "body_they"]) {
    banned.test(draft[f] || "") ? fail(`exclusions_${f}`) : pass(`exclusions_${f}`);
  }

  const mode = packet.warmthHarvest.harvest_mode;
  if (mode === "none_found") {
    draft.warmthSource === null && Array.isArray(draft.labels) && draft.labels.length === 0
      ? pass("warmthRecord", { mode })
      : fail("warmthRecord", { mode, note: "none_found requires null warmthSource and empty labels" });
  } else if (draft.warmthSource) {
    const supplied = packet.warmthHarvest.ownerFoundationLines.map((l) => l.sourceArticleId);
    const okSource = supplied.includes(draft.warmthSource.sourceArticleId);
    const okUse =
      (draft.body_you || "").includes(draft.warmthSource?.usedForm?.body_you || " ") &&
      (draft.body_they || "").includes(draft.warmthSource?.usedForm?.body_they || " ");
    okSource && okUse && draft.labels?.includes("owner-corpus-derived")
      ? pass("warmthRecord", { mode, sourceArticleId: draft.warmthSource.sourceArticleId })
      : fail("warmthRecord", { mode, okSource, okUse });
  } else {
    pass("warmthRecord", { mode, note: "matched packet, writer chose no warmth line; Terra scores the choice" });
  }
  return checks;
}

// ---------- API ----------
async function callModel({ model, reasoningEffort, input, maxOutputTokens }) {
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_KEY}` },
    body: JSON.stringify({
      model,
      reasoning: { effort: reasoningEffort },
      max_output_tokens: maxOutputTokens,
      input,
    }),
  });
  const body = await res.json();
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    err.body = { status: res.status, error: body?.error?.type || body?.error?.code || "unknown" };
    throw err;
  }
  const text =
    body.output_text ??
    (body.output || [])
      .flatMap((o) => o.content || [])
      .filter((c) => c.type === "output_text")
      .map((c) => c.text)
      .join("");
  return { responseId: body.id, status: body.status, usage: body.usage, model: body.model, text };
}

const redactedCall = (kind, target, r, requested) => ({
  kind,
  target,
  responseId: r.responseId,
  status: r.status,
  billingStatus: "billed",
  credentialMaterialRecorded: false,
  requestedModel: requested.model,
  actualModel: r.model,
  requestedReasoningEffort: requested.reasoningEffort,
  actualReasoningEffort: requested.reasoningEffort,
  usage: r.usage,
});

// ---------- main ----------
const log = {
  schemaVersion: 1,
  authorization: config.authorization,
  expected: config.expectedCalls,
  calls: [],
};
let stopped = false;

for (const t of config.targets) {
  if (ONLY && t.id !== ONLY) continue;
  if (stopped) break;

  const dir = path.join(OUT_ROOT, `${t.planet}-ascendant`, t.aspectLabel);
  const entry = loadEntry({ entryFile: path.join(repoRoot, t.entryFile) });
  const packet = buildAspectWritingPacket({ surface: "synastry-aspect", format: "full-card", entry });

  // guard: packet must match the pinned mode
  if (!packet.generationAllowed || packet.warmthHarvest.harvest_mode !== t.expectedMode) {
    console.error(
      `STOP ${t.id}: packet mode ${packet.warmthHarvest.harvest_mode} (allowed=${packet.generationAllowed}) != pinned ${t.expectedMode}`
    );
    stopped = true;
    break;
  }
  writeArtifact(dir, "writing-packet.json", packet);
  const sol = solPrompt(t, entry, packet);
  writeArtifact(dir, "sol-model-input.md", sol);

  if (DRY) {
    console.log(`[dry-run] ${t.id}: packet ${packet.warmthHarvest.harvest_mode}, sol input ready`);
    continue;
  }

  // Sol call
  let solRes;
  try {
    solRes = await callModel({
      model: config.models.writer.model,
      reasoningEffort: config.models.writer.reasoningEffort,
      input: sol,
      maxOutputTokens: config.models.writer.maxOutputTokens,
    });
  } catch (e) {
    log.calls.push({ kind: "writer", target: t.id, status: "failed", billingStatus: "unbilled", error: e.body || String(e.message) });
    console.error(`STOP ${t.id}: Sol call failed (${e.message}). Batch stops for direction.`);
    stopped = true;
    break;
  }
  log.calls.push(redactedCall("writer", t.id, solRes, config.models.writer));
  writeArtifact(dir, "writer-provider-response.json", {
    responseId: solRes.responseId,
    status: solRes.status,
    model: solRes.model,
    usage: solRes.usage,
    output_text: solRes.text,
  });
  if (solRes.status !== "completed") {
    console.error(`STOP ${t.id}: Sol response status ${solRes.status}. Incomplete attempt preserved; batch stops for direction.`);
    stopped = true;
    break;
  }

  let draft;
  try {
    draft = JSON.parse(solRes.text.replace(/^```json\s*|```\s*$/g, ""));
  } catch {
    console.error(`STOP ${t.id}: Sol output is not valid JSON. Batch stops for direction.`);
    stopped = true;
    break;
  }
  writeArtifact(dir, "draft.json", draft);

  const checks = runChecks(t, packet, draft);
  writeArtifact(dir, "deterministic-checks.json", checks);
  if (!checks.passed) {
    console.error(`STOP ${t.id}: deterministic checks failed. Batch stops for direction.`);
    stopped = true;
    break;
  }

  // Terra call
  const terra = terraPrompt(t, entry, packet, draft, checks);
  writeArtifact(dir, "terra-model-input.md", terra);
  let terraRes;
  try {
    terraRes = await callModel({
      model: config.models.judge.model,
      reasoningEffort: config.models.judge.reasoningEffort,
      input: terra,
      maxOutputTokens: config.models.judge.maxOutputTokens,
    });
  } catch (e) {
    log.calls.push({ kind: "judge", target: t.id, status: "failed", billingStatus: "unbilled", error: e.body || String(e.message) });
    console.error(`STOP ${t.id}: Terra call failed (${e.message}). Batch stops for direction.`);
    stopped = true;
    break;
  }
  log.calls.push(redactedCall("judge", t.id, terraRes, config.models.judge));
  writeArtifact(dir, "judge-provider-response.json", {
    responseId: terraRes.responseId,
    status: terraRes.status,
    model: terraRes.model,
    usage: terraRes.usage,
    output_text: terraRes.text,
  });
  let verdict;
  try {
    verdict = JSON.parse(terraRes.text.replace(/^```json\s*|```\s*$/g, ""));
  } catch {
    verdict = { score: null, verdict: "unparseable", raw: terraRes.text };
  }
  writeArtifact(dir, "terra-verdict.json", verdict);
  writeArtifact(dir, "candidate-record.json", {
    target: t.id,
    status: "needs_review",
    payloadSha256: sha256(draft),
    harvest_mode: packet.warmthHarvest.harvest_mode,
    terraScore: verdict.score,
    approvalEffect: "none",
    note: "Candidate for owner exact-wording review. Not approved, promoted, or serving.",
  });
  console.log(`${t.id}: draft ok, checks pass, Terra ${verdict.score}/3`);
}

writeArtifact(OUT_ROOT, "billed-call-log.json", log);
const billed = log.calls.filter((c) => c.billingStatus === "billed").length;
console.log(`${DRY ? "[dry-run] " : ""}done. billed calls recorded: ${billed}${stopped ? " (STOPPED EARLY)" : ""}`);
if (stopped) process.exit(2);
