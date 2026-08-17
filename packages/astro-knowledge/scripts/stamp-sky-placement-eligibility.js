#!/usr/bin/env node
//
// Stamp sky placement four-slot rows as render eligible.
//
// The resolver gate (skyPlacementRenderEligible) reads four fields and renders a page
// only when all four are present. This script is the only thing that writes them, so
// the rules live here and in the linter, never in the renderer.
//
// A page is stamped only when ALL of the following hold:
//   1. all four reader slots exist and are non-empty
//   2. lint-placement-voice.js returns zero blocking failures, called WITH planet
//      (ED-031: a checker without its fact context reports a harness error, and a
//      harness error is never treated as a pass)
//   3. the owner has recorded prose approval for that page, against the same bytes
//
// source_hash pins the exact text that was approved. If the copy changes afterwards the
// hash stops matching and --verify fails, so a stamp cannot become a permanent pass for
// copy that drifted after approval.
//
// Usage:
//   node scripts/stamp-sky-placement-eligibility.js --check
//   node scripts/stamp-sky-placement-eligibility.js --apply
//   node scripts/stamp-sky-placement-eligibility.js --verify
//   node scripts/stamp-sky-placement-eligibility.js --unstamp PAGE

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { lintArticle } = require("./lint-placement-voice.js");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const ROWS = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
const APPROVALS = path.join(__dirname, "..", "review", "sky-placement-recovery", "OWNER-PROSE-APPROVALS.json");
const HISTORICAL_BUNDLE = path.join(__dirname, "..", "review", "sky-placement-recovery", "HISTORICAL-FOUR-SLOT-BUNDLE.json");
const SLOTS = ["tagline", "hook", "lived", "turn"];
const STAMP = ["render_eligible", "owner_prose_approved", "deterministic_validation", "source_hash"];
const KEY = /^fallback-hook\/sky-placement-(tagline|hook|lived|turn)\/([\w-]+)\/(\w+)$/u;

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return fallback; }
}

function collect(doc) {
  const rows = new Map();
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const m = KEY.exec(String(node.contentKey ?? ""));
    if (m) rows.set(`${m[2]}/${m[3]}/${m[1]}`, node);
    Object.values(node).forEach(walk);
  };
  walk(doc);
  return rows;
}

function pageHash(slots) {
  return crypto.createHash("sha256").update(SLOTS.map((s) => slots[s]).join("\n\n")).digest("hex");
}

function evaluate(doc) {
  const rows = collect(doc);
  const pages = new Map();
  for (const [key, row] of rows) {
    const [planet, sign, slot] = key.split("/");
    if (!SLOTS.includes(slot)) continue;
    const page = `${planet}/${sign}`;
    if (!pages.has(page)) pages.set(page, { planet, sign, slots: {}, rows: {} });
    pages.get(page).slots[slot] = String(row.body_you ?? "");
    pages.get(page).rows[slot] = row;
  }
  const approvals = readJson(APPROVALS, { approved: {} }).approved ?? {};
  const historicalPages = readJson(HISTORICAL_BUNDLE, { pages: {} }).pages ?? {};
  const report = [];
  for (const [page, info] of pages) {
    const complete = SLOTS.every((s) => info.slots[s] && info.slots[s].trim());
    const hash = complete ? pageHash(info.slots) : null;
    const historical = historicalPages[page] ?? null;
    const historicalHashMatches = Boolean(historical) && historical.source_hash === hash;
    const allowances = new Set(historicalHashMatches ? historical.legacy_allowances ?? [] : []);
    let lint = null;
    let harnessError = false;
    if (complete) {
      lint = lintArticle({
        planet: info.planet,
        sign: info.sign,
        ...info.slots,
        allowLegacyTagline: allowances.has("allowLegacyTagline"),
        allowLegacyUntracedTiming: allowances.has("allowLegacyUntracedTiming"),
        allowLegacyPerformanceFraming: allowances.has("allowLegacyPerformanceFraming")
      }, {
        // ED-029/ED-030 intentionally read this option from lintArticle's context.
        // The allowance applies only while this page's recorded hash matches.
        allowLegacyPunctuation: allowances.has("allowLegacyPunctuation")
      });
      harnessError = lint.findings.some((f) => f.source === "harness");
    }
    // Advisory findings are intentionally non-blocking under the classified style
    // policy. Only blocking failures and harness errors can prevent a stamp.
    const lintPass = Boolean(lint) && lint.fails === 0 && !harnessError;
    const approval = approvals[page] ?? null;
    const approvalMatches = Boolean(approval) && approval.source_hash === hash;
    report.push({
      page, ...info, complete, lintPass, harnessError, historicalHashMatches,
      fails: lint ? lint.fails : null,
      reasons: lint ? [...new Set(lint.findings.filter((f) => f.severity === "fail").map((f) => f.decisionId || f.term))] : [],
      hash, approval, approvalMatches,
      stamped: SLOTS.some((s) => info.rows[s]?.render_eligible === true),
      eligible: complete && lintPass && approvalMatches
    });
  }
  return report;
}

function main() {
  const argv = process.argv.slice(2);
  const mode = argv.find((a) => a.startsWith("--")) ?? "--check";
  const doc = readJson(ROWS, null);
  if (!doc) { console.error(`cannot read ${ROWS}`); process.exit(1); }
  const report = evaluate(doc);

  if (mode === "--check" || mode === "--verify") {
    const drifted = report.filter((r) => r.approval && !r.approvalMatches);
    console.log(`pages evaluated        : ${report.length}`);
    console.log(`historical hash matches: ${report.filter((r) => r.historicalHashMatches).length}`);
    console.log(`lint pass              : ${report.filter((r) => r.lintPass).length}`);
    console.log(`owner approved         : ${report.filter((r) => r.approval).length}`);
    console.log(`ELIGIBLE TO STAMP      : ${report.filter((r) => r.eligible).length}`);
    console.log(`lint clean, unapproved : ${report.filter((r) => r.lintPass && !r.approvalMatches).length}`);
    if (drifted.length) {
      console.log(`\nHASH MISMATCH, the recorded approval no longer covers the current text:`);
      for (const r of drifted) console.log(`  ${r.page}`);
    }
    if (mode === "--verify") {
      const bad = report.filter((r) => r.stamped && !r.eligible);
      console.log(`\nstamped pages          : ${report.filter((r) => r.stamped).length}`);
      console.log(`stamped but not eligible: ${bad.length}`);
      for (const r of bad) console.log(`  ${r.page}  ${r.reasons.join(",") || "approval or hash mismatch"}`);
      process.exit(bad.length ? 1 : 0);
    }
    return;
  }

  if (mode === "--unstamp") {
    const target = argv[argv.indexOf("--unstamp") + 1];
    let n = 0;
    for (const r of report) {
      if (target && r.page !== target) continue;
      for (const s of SLOTS) {
        const row = r.rows[s];
        if (!row) continue;
        for (const f of STAMP) delete row[f];
        n += 1;
      }
    }
    fs.writeFileSync(ROWS, `${JSON.stringify(doc, null, 1)}\n`);
    console.log(`unstamped ${n} rows`);
    return;
  }

  if (mode === "--apply") {
    const eligible = report.filter((r) => r.eligible);
    for (const r of eligible) {
      for (const s of SLOTS) {
        const row = r.rows[s];
        row.render_eligible = true;
        row.owner_prose_approved = true;
        row.deterministic_validation = "pass";
        row.source_hash = r.hash;
      }
    }
    fs.writeFileSync(ROWS, `${JSON.stringify(doc, null, 1)}\n`);
    console.log(`stamped ${eligible.length} pages (${eligible.length * SLOTS.length} rows)`);
    if (!eligible.length) console.log("nothing eligible: no page has both a clean lint and a matching owner approval");
    return;
  }

  console.error("usage: --check | --apply | --verify | --unstamp PAGE");
  process.exit(1);
}

if (require.main === module) main();
module.exports = { evaluate, collect, pageHash };
