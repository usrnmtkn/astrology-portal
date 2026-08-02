#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { lintCard } = require("../packages/astro-knowledge/scripts/lint-sky-voice.js");

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const verifyOnly = args.includes("--verify-only");
const resourcesArg = args.find((arg) => arg.startsWith("--resources="));
const envArg = args.find((arg) => arg.startsWith("--env="));
const resourcesRoot = resourcesArg?.slice("--resources=".length) ?? "/Users/mprez/Downloads/Resources";
const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/u)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)\s*$/u);
    if (!match || process.env[match[1]]) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadEnvFile(path.join(repoRoot, "apps/web/.env.local"));
loadEnvFile(path.join(repoRoot, ".env.local"));
if (envArg) loadEnvFile(envArg.slice("--env=".length));

function slug(value) {
  return value.toLowerCase().trim().replace(/^the\s+/u, "").replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function source(name) {
  const file = path.join(resourcesRoot, name);
  assert.ok(fs.existsSync(file), `Missing owner resource: ${file}`);
  return { file, name, text: fs.readFileSync(file, "utf8") };
}

function fileNotes(text) {
  const preamble = text.split(/\n---\n/u)[0]?.trim() ?? "";
  const status = text.match(/## Status\s*\n([\s\S]*?)$/u)?.[1]?.trim() ?? "";
  return [preamble, status ? `Status: ${status}` : ""].filter(Boolean).join("\n\n");
}

let reviewSequence = 0;
function row({
  blockType,
  body,
  contentKey,
  eventType,
  file,
  headline,
  lane = "reference",
  mode = "feed",
  priority,
  sourceText,
  status = "DRAFT",
  facts = {},
  metadata = {}
}) {
  reviewSequence += 1;
  return {
    content_key: contentKey,
    surface: "sky",
    mode,
    status,
    lane,
    review_state: status === "DRAFT" ? "owner-review-required" : null,
    event_type: eventType,
    target_date: null,
    block_type: blockType,
    facts,
    knowledge_ids: [],
    source_snapshot: {
      sourceType: "owner-resource-review",
      sourceFile: file,
      sourceHash: hash(sourceText),
      fileReviewNotes: fileNotes(sourceText),
      review_status: status === "DRAFT" ? "needs_review" : "approved",
      reviewPriority: priority,
      reviewSequence,
      ...metadata
    },
    prompt_version: "owner-resource-review-v1",
    provider: "owner-resource-review",
    model: null,
    headline,
    summary: body.split(/\n{2,}/u).map((part) => part.trim()).find(Boolean)?.replace(/^#+\s*/u, "") ?? "",
    body: body.trim(),
    sections: {},
    flags: status === "DRAFT" ? ["OWNER_REVIEW_REQUIRED"] : [],
    reviewed_at: status === "DRAFT" ? null : new Date().toISOString(),
    published_at: status === "LIVE" ? new Date().toISOString() : null,
    reviewer_notes: null,
    error: null
  };
}

function placementRows(name, expected, priority, approved = false) {
  const item = source(name);
  const headings = [...item.text.matchAll(/^# ((?:The Nodes in [A-Za-z]+ and [A-Za-z]+)|(?:[A-Za-z]+ in [A-Za-z]+))\s*$/gmu)];
  const blocks = headings.map((match, index) => {
    const nextHeading = headings[index + 1]?.index ?? item.text.length;
    const divider = item.text.indexOf("\n---\n", match.index + match[0].length);
    const end = divider >= 0 && divider < nextHeading ? divider : nextHeading;
    return item.text.slice(match.index, end).trim();
  });
  const rows = blocks.map((block) => {
    const heading = block.match(/^# (.+)$/mu)?.[1]?.trim();
    assert.ok(heading, `${name} has a unit without a heading.`);
    const nodes = heading.match(/^The Nodes in ([A-Za-z]+) and ([A-Za-z]+)$/u);
    const placement = heading.match(/^([A-Za-z]+) in ([A-Za-z]+)$/u);
    assert.ok(nodes || placement, `Unsupported placement heading: ${heading}`);
    const planet = nodes ? "nodes" : slug(placement[1]);
    const sign = nodes ? `${slug(nodes[1])}-${slug(nodes[2])}` : slug(placement[2]);
    const body = block.replace(/^# .+\n/u, "").trim();
    return row({
      blockType: "fallback_hook",
      body,
      contentKey: `fallback-hook/sky-sign-copy/${planet}/${sign}`,
      eventType: "sky-placement-fallback-unit",
      file: name,
      headline: heading,
      lane: "serving",
      priority,
      sourceText: item.text,
      status: approved ? "LIVE" : "DRAFT",
      facts: { planet, sign },
      metadata: { content_role: "fallback_hook", render_policy: "sky-placement-continuous-v2" }
    });
  });
  assert.equal(rows.length, expected, `${name} expected ${expected} placement units.`);
  return rows;
}

function pairSourceRows() {
  const name = "TLDR-Aspect-PairSources-Chiron-Lilith-Nodes-REVIEW.md";
  const item = source(name);
  const matches = [...item.text.matchAll(/^\*\*([^*]+)\.\*\*\s+(.+)$/gmu)];
  const rows = matches.map((match) => {
    const pair = match[1].split("-").map(slug);
    assert.equal(pair.length, 2, `Unsupported pair heading: ${match[1]}`);
    return row({
      blockType: "fallback_hook",
      body: match[2].trim(),
      contentKey: `source/sky-aspect-pair/${pair.join("-")}`,
      eventType: "sky-aspect-pair-source",
      file: name,
      headline: match[1],
      priority: 2,
      sourceText: item.text,
      facts: { a: pair[0], b: pair[1], pairKey: pair.join("-") },
      metadata: { content_role: "fallback_source", pairKey: pair.join("-") }
    });
  });
  assert.equal(rows.length, 33, "Expected 33 Chiron/Lilith/node pair sources.");
  return rows;
}

const bodyOrder = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "lilith", "nodes"];
function canonicalAspectBody(value) {
  const body = slug(value);
  if (["north-node", "south-node", "true-node", "node", "nodes", "lunar-nodes"].includes(body)) return "nodes";
  if (body === "black-moon-lilith") return "lilith";
  return body;
}
function canonicalAspect(first, firstSign, second, secondSign) {
  const a = canonicalAspectBody(first);
  const b = canonicalAspectBody(second);
  return bodyOrder.indexOf(a) <= bodyOrder.indexOf(b)
    ? { a, signA: slug(firstSign), b, signB: slug(secondSign) }
    : { a: b, signA: slug(secondSign), b: a, signB: slug(firstSign) };
}

function authoredAspectRows() {
  const name = "TLDR-Aspect-Cards-Batch1-REVIEW.md";
  const item = source(name);
  const headings = [...item.text.matchAll(/^## (.+?) \((.+?) in ([A-Za-z]+), (.+?) in ([A-Za-z]+)\)\s*$/gmu)];
  const rows = headings.map((match, index) => {
    const start = match.index + match[0].length;
    const end = headings[index + 1]?.index ?? item.text.indexOf("\n---\n", start);
    const body = item.text.slice(start, end > start ? end : undefined).trim();
    const aspectMatch = match[1].match(/^(.+?) (conjunction|opposition|square|trine|sextile) (.+)$/iu);
    assert.ok(aspectMatch, `Unsupported authored aspect heading: ${match[1]}`);
    const canonical = canonicalAspect(match[2], match[3], match[4], match[5]);
    const aspect = slug(aspectMatch[2]);
    const cardFacts = { ...canonical, aspect };
    const candidate = row({
      blockType: "sky_aspect",
      body,
      contentKey: `sky.aspect.${canonical.a.replaceAll("-", "_")}.${aspect}.${canonical.b.replaceAll("-", "_")}.${canonical.signA}.${canonical.signB}`,
      eventType: "collective-aspect-card",
      file: name,
      headline: match[1],
      lane: "serving",
      priority: 3,
      sourceText: item.text,
      facts: { cardFacts },
      metadata: { contentType: "owner-authored-sky-aspect", cardFacts }
    });
    const lint = lintCard(body, { mode: "collective-aspect-card" });
    candidate.source_snapshot.skyAspectVoiceLint = lint;
    if (lint.score !== 3 || lint.fails !== 0) {
      candidate.judge_score = null;
      candidate.judge_verdict = "lint-failed";
      candidate.judge_gate = "human-review";
      candidate.judge_why = `Deterministic linter: ${lint.findings.map((finding) => finding.reason).join(" ")}`;
      candidate.flags = ["OWNER_REVIEW_REQUIRED", "SKY_VOICE_REVIEW_REQUIRED"];
    }
    return candidate;
  });
  assert.equal(rows.length, 4, "Expected four authored aspect cards.");
  return rows;
}

function wholeFileRow(name, priority, contentKey, options = {}) {
  const item = source(name);
  const title = item.text.match(/^# (.+)$/mu)?.[1]?.trim() ?? name;
  return row({
    blockType: options.blockType ?? "sky_article",
    body: item.text,
    contentKey,
    eventType: options.eventType ?? "sky-article-template",
    file: name,
    headline: title,
    lane: options.lane ?? "reference",
    mode: "article",
    priority,
    sourceText: item.text,
    status: options.status ?? "DRAFT",
    metadata: options.metadata ?? {}
  });
}

function articleRows() {
  const rows = [];
  const fastPlanets = ["Sun", "Mercury", "Venus", "Mars"];
  const signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  for (const planet of fastPlanets) {
    for (const sign of signs) {
      const name = `TLDR-Article-Template-${planet}-${sign}-REVIEW.md`;
      rows.push(wholeFileRow(name, 4, `sky/article-template/${slug(planet)}/${slug(sign)}`));
    }
  }

  const nodesName = "TLDR-Article-Template-Nodes-REVIEW.md";
  const nodes = source(nodesName);
  const editionMarker = "## PART 2 — Current edition fill: Aquarius / Leo (needs_review)";
  const markerIndex = nodes.text.indexOf(editionMarker);
  assert.ok(markerIndex > 0, "Nodes template is missing its current edition marker.");
  rows.push(row({ blockType: "sky_article", body: nodes.text.slice(0, markerIndex), contentKey: "sky/article-template/nodes", eventType: "sky-article-template", file: nodesName, headline: "The Lunar Nodes Change Signs", mode: "article", priority: 4, sourceText: nodes.text }));
  rows.push(row({ blockType: "sky_article", body: nodes.text.slice(markerIndex), contentKey: "sky/article-edition/nodes/aquarius-leo", eventType: "sky-article-edition", file: nodesName, headline: "The Nodes in Aquarius and Leo", lane: "serving", mode: "article", priority: 4, sourceText: nodes.text }));

  rows.push(wholeFileRow("TLDR-Article-Template-SlowMover-Structure-REVIEW.md", 4, "sky/article-template/slow-mover/structure"));
  for (const planet of ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto", "Chiron"]) {
    rows.push(wholeFileRow(`TLDR-Article-Template-${planet}-Ingress-REVIEW.md`, 4, `sky/article-template/${slug(planet)}/ingress`));
  }
  for (const [planet, sign] of [["Jupiter", "Leo"], ["Uranus", "Gemini"], ["Neptune", "Aries"], ["Pluto", "Aquarius"], ["Chiron", "Aries"]]) {
    const metadata = planet === "Chiron"
      ? {
          servingWindows: [
            { start: "2019-02-18T09:08:48.999Z", end: "2026-06-19T21:19:04.999Z" },
            { start: "2026-09-18T01:52:08.999Z", end: "2027-04-14T14:57:19.999Z" }
          ],
          ephemerisCheck: "App Swiss Ephemeris: Taurus preview 2026-06-19 to 2026-09-18; Aries retrograde dip 2026-09-18 to 2027-04-14; Taurus resumes 2027-04-14."
        }
      : {};
    rows.push(wholeFileRow(`TLDR-Article-Edition-${planet}-${sign}-REVIEW.md`, 4, `sky/article-edition/${slug(planet)}/${slug(sign)}`, { eventType: "sky-article-edition", lane: "serving", metadata }));
  }
  assert.equal(rows.length, 62, "Expected 62 article template and edition records.");
  return rows;
}

function specRows() {
  return [
    wholeFileRow("TLDR-Weekly-Forecast-Template-REVIEW.md", 5, "spec/sky-weekly-forecast-template", { blockType: "fallback_template", eventType: "editorial-spec" }),
    wholeFileRow("TLDR-Sky-Fallback-Canonical-Template-OWNER.md", 5, "spec/sky-fallback-canonical-template", { blockType: "fallback_template", eventType: "editorial-spec", status: "LIVE" })
  ];
}

const rows = [
  ...placementRows("TLDR-Sky-SignCopy-Sun-AllSigns-V2-REVIEW.md", 11, 1),
  ...placementRows("TLDR-Sky-SignCopy-Mercury-AllSigns-V2-REVIEW.md", 12, 1),
  ...placementRows("TLDR-Sky-SignCopy-Venus-AllSigns-V2-REVIEW.md", 12, 1),
  ...placementRows("TLDR-Sky-SignCopy-Mars-AllSigns-V2-REVIEW.md", 12, 1),
  ...placementRows("TLDR-Sky-SignCopy-SlowMovers-Current-V2-REVIEW.md", 7, 1),
  ...placementRows("TLDR-Sky-SignCopy-Sun-Leo-V2-REVIEW.md", 1, 1, true),
  ...pairSourceRows(),
  ...authoredAspectRows(),
  ...articleRows(),
  ...specRows()
];

assert.equal(rows.length, 156, "Owner review library should contain 156 records.");
assert.equal(new Set(rows.map((item) => item.content_key)).size, rows.length, "Owner review library contains duplicate content keys.");

function requireEnv(name) {
  const value = process.env[name];
  assert.ok(value, `${name} is required for --apply/--verify-only.`);
  return value;
}

const supabaseUrl = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/u, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

async function request(endpoint, init = {}) {
  assert.ok(supabaseUrl && serviceKey, "Supabase URL and service role key are required.");
  const response = await fetch(`${supabaseUrl}/rest/v1/${endpoint}`, {
    ...init,
    headers: { apikey: serviceKey, authorization: `Bearer ${serviceKey}`, ...(init.headers ?? {}) }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`Supabase request failed (${response.status}): ${JSON.stringify(payload)}`);
  return payload;
}

async function existingRows(contentKey) {
  const params = new URLSearchParams({ content_key: `eq.${contentKey}`, target_date: "is.null", select: "id,status,lane,review_state,reviewer_notes,source_snapshot,headline,summary,body,sections,updated_at", order: "updated_at.desc" });
  return request(`generated_interpretations?${params}`);
}

async function importRows() {
  const report = { inserted: 0, updated: 0, preservedApproved: 0 };
  for (const candidate of rows) {
    const existing = await existingRows(candidate.content_key);
    assert.ok(existing.length <= 1, `Duplicate database rows must be reconciled first: ${candidate.content_key}`);
    const current = existing[0];
    if (current && ["LIVE", "REVIEWED"].includes(current.status) && candidate.status === "DRAFT") {
      report.preservedApproved += 1;
      continue;
    }
    const sameSource = current?.source_snapshot?.sourceHash === candidate.source_snapshot.sourceHash;
    const contentChangedInDashboard = sameSource && (
      current?.headline !== candidate.headline
      || current?.summary !== candidate.summary
      || current?.body !== candidate.body
      || JSON.stringify(current?.sections ?? {}) !== JSON.stringify(candidate.sections ?? {})
    );
    const preserveDashboardEdits = Boolean(current?.reviewer_notes)
      || Array.isArray(current?.source_snapshot?.dashboardEditHistory)
      || contentChangedInDashboard;
    const payload = current
      ? {
          ...candidate,
          ...(preserveDashboardEdits ? { headline: current.headline, summary: current.summary, body: current.body, sections: current.sections } : {}),
          reviewer_notes: current.reviewer_notes,
          source_snapshot: { ...(current.source_snapshot ?? {}), ...candidate.source_snapshot }
        }
      : candidate;
    const endpoint = current ? `generated_interpretations?id=eq.${encodeURIComponent(current.id)}` : "generated_interpretations";
    await request(endpoint, { method: current ? "PATCH" : "POST", headers: { "content-type": "application/json", prefer: "return=minimal" }, body: JSON.stringify(payload) });
    report[current ? "updated" : "inserted"] += 1;
  }
  return report;
}

async function removeSupersededImportKeys() {
  const supersededKeys = [
    "sky.aspect.lilith.opposition.mars.sagittarius.gemini",
    "sky.aspect.chiron.sextile.north_node.taurus.aquarius"
  ];
  let removed = 0;
  for (const contentKey of supersededKeys) {
    const params = new URLSearchParams({ content_key: `eq.${contentKey}`, target_date: "is.null", provider: "eq.owner-resource-review", status: "eq.DRAFT", select: "id", limit: "10" });
    const matches = await request(`generated_interpretations?${params}`);
    for (const match of matches) {
      await request(`generated_interpretations?id=eq.${encodeURIComponent(match.id)}`, { method: "DELETE", headers: { prefer: "return=representation" } });
      removed += 1;
    }
  }
  return removed;
}

async function verifyRows() {
  const params = new URLSearchParams({ surface: "eq.sky", target_date: "is.null", select: "content_key,status,lane,review_state,provider,source_snapshot", order: "updated_at.desc", limit: "5000" });
  const saved = await request(`generated_interpretations?${params}`);
  const savedByKey = new Map();
  for (const item of saved) {
    if (!savedByKey.has(item.content_key)) savedByKey.set(item.content_key, item);
  }
  const missing = rows.filter((item) => !savedByKey.has(item.content_key)).map((item) => item.content_key);
  assert.deepEqual(missing, [], `Imported dashboard records are missing: ${missing.join(", ")}`);
  for (const candidate of rows) {
    const savedRow = savedByKey.get(candidate.content_key);
    if (savedRow.provider === "owner-resource-review") {
      assert.equal(savedRow.source_snapshot?.sourceHash, candidate.source_snapshot.sourceHash, `Source hash drift: ${candidate.content_key}`);
      assert.equal(savedRow.source_snapshot?.reviewPriority, candidate.source_snapshot.reviewPriority, `Review priority drift: ${candidate.content_key}`);
    } else {
      assert.ok(["LIVE", "REVIEWED"].includes(savedRow.status), `Only an approved existing row may outrank a resource draft: ${candidate.content_key}`);
    }
  }
  return { matched: rows.length, draft: rows.filter((item) => item.status === "DRAFT").length, approved: rows.filter((item) => item.status === "LIVE").length };
}

if (!apply && !verifyOnly) {
  console.log(JSON.stringify({
    mode: "dry-run",
    resourcesRoot,
    total: rows.length,
    draft: rows.filter((item) => item.status === "DRAFT").length,
    approved: rows.filter((item) => item.status === "LIVE").length,
    byPriority: Object.fromEntries([1, 2, 3, 4, 5].map((priority) => [priority, rows.filter((item) => item.source_snapshot.reviewPriority === priority).length]))
  }, null, 2));
} else {
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const imported = apply ? await importRows() : null;
  const removedSuperseded = apply ? await removeSupersededImportKeys() : 0;
  const verified = await verifyRows();
  console.log(JSON.stringify({ mode: apply ? "apply" : "verify-only", imported, removedSuperseded, verified }, null, 2));
}
