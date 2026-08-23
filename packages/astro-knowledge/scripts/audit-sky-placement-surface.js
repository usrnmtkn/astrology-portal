#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { lintArticle } = require("./lint-placement-voice.js");
const { buildReadinessReport } = require("./audit-sky-placement-fallback-readiness.js");

const repoRoot = path.resolve(__dirname, "..", "..", "..");
const reviewRoot = path.join(repoRoot, "packages", "astro-knowledge", "review", "sky-placement-deep-audit-2026-08-15");
const recoveryRoot = path.join(repoRoot, "packages", "astro-knowledge", "review", "sky-placement-recovery");
const fallbackRoot = path.join(repoRoot, "apps", "web", "src", "content", "fallbackArchitectureV3");
const signs = ["aries", "taurus", "gemini", "cancer", "leo", "virgo", "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"];
const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"];
const recoveryPlanets = ["jupiter", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node"];
const fourSlots = ["tagline", "hook", "lived", "turn"];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function countBy(items, keyOf) {
  const result = {};
  for (const item of items) {
    const key = keyOf(item);
    result[key] = (result[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function syntheticFacts(planet, sign) {
  return {
    planet,
    sign,
    entryDate: "April 4, 2030",
    exitDate: "May 5, 2030",
    priorSign: sign === "aries" ? "pisces" : signs[signs.indexOf(sign) - 1],
    priorSignEntryDate: "February 2, 2029",
    priorSignExitDate: "March 3, 2029",
    previousResidencyEntryDate: "June 6, 2000",
    previousResidencyExitDate: "July 7, 2000",
    events: []
  };
}

function pageState(rendered) {
  if (rendered.templateKey === "sky-placement-continuous-v2") return "owner_approved_continuous";
  if (rendered.templateKey === "sky-placement-moon-entry-v1") return "owner_approved_moon_entry";
  if (rendered.templateKey === "sky-placement-frame-v3") return "canonical_fallback_frame";
  return `other:${rendered.templateKey}`;
}

async function main() {
  const resolverUrl = pathToFileURL(path.join(fallbackRoot, "resolver", "renderTransitSynastry.mjs")).href;
  const { renderSkyPlacement } = await import(resolverUrl);
  const fallbackSource = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json");
  const ownerReader = readJson("apps/web/src/content/fallbackArchitectureV3/bundled-sky-placement-owner-approved-reader-v1.json");
  const phrasebook = readJson("apps/web/src/content/fallbackArchitectureV3/source-rows/sky-aspect-phrasebook-v1.json");
  const cycleFacts = readJson("packages/astro-knowledge/data/modifiers/planet-cycle-facts.json");
  const hooks = new Map(fallbackSource.hookRows.map((row) => [row.contentKey, row]));

  const pages = [];
  for (const planet of planets) {
    for (const sign of signs) {
      try {
        const rendered = renderSkyPlacement(syntheticFacts(planet, sign));
        pages.push({
          page: `${planet}/${sign}`,
          planet,
          sign,
          state: pageState(rendered),
          templateKey: rendered.templateKey,
          contentKey: rendered.contentKey ?? null,
          paragraphCount: String(rendered.body || "").split(/\n\n+/u).filter(Boolean).length,
          unresolvedPlaceholder: /\{\{/u.test(rendered.body || ""),
          rendersTryThis: /\bTry this\b/iu.test(rendered.body || ""),
          bodySha256: sha256(rendered.body || "")
        });
      } catch (error) {
        pages.push({
          page: `${planet}/${sign}`,
          planet,
          sign,
          state: "source_gap",
          templateKey: null,
          contentKey: null,
          paragraphCount: 0,
          unresolvedPlaceholder: false,
          rendersTryThis: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  const recoveryCandidates = [];
  for (const planet of recoveryPlanets) {
    for (const sign of signs) {
      const article = {};
      for (const slot of fourSlots) {
        const key = `fallback-hook/sky-placement-${slot}/${planet}/${sign}`;
        const row = hooks.get(key);
        if (!row) throw new Error(`Missing recovery source row ${key}`);
        article[slot] = row.body_you || "";
      }
      const lint = lintArticle(article, {
        planet,
        sign,
        factContext: cycleFacts.planets[planet] || {}
      });
      recoveryCandidates.push({
        page: `${planet}/${sign}`,
        runtimeState: pages.find((entry) => entry.page === `${planet}/${sign}`).state,
        auditValid: lint.auditValid,
        score: lint.score,
        fails: lint.fails,
        warnings: lint.warns,
        failures: lint.findings.filter((finding) => finding.severity === "fail").map((finding) => ({
          rule: finding.decisionId || finding.term,
          slot: finding.slot || null,
          match: finding.match,
          reason: finding.reason
        })),
        advisories: lint.findings.filter((finding) => finding.severity === "warn").map((finding) => ({
          rule: finding.decisionId || finding.term,
          slot: finding.slot || null,
          match: finding.match,
          reason: finding.reason
        })),
        notes: lint.notes
      });
    }
  }

  const readerRows = ownerReader.rows || [];
  const continuousRows = readerRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-sign-copy/"));
  const deadTryThisRows = continuousRows.filter((row) => Object.hasOwn(row, "try_this"));
  const exactPlacementAspectRows = fallbackSource.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-placement-aspect/"));
  const reviewedAspectRows = phrasebook.hookRows.filter((row) => row.contentKey.startsWith("fallback-hook/sky-aspect-"));
  const readiness = buildReadinessReport();
  const stateCounts = countBy(pages, (page) => page.state);
  const failingRecovery = recoveryCandidates.filter((entry) => entry.fails > 0);
  const recoveryFailures = recoveryCandidates.flatMap((entry) => entry.failures.map((failure) => ({ page: entry.page, ...failure })));
  const thinPages = pages.filter((page) => page.state === "legacy_thin_standalone");
  const sourceGaps = pages.filter((page) => page.state === "source_gap");
  const protectedPages = pages.filter((page) => [
    "owner_approved_continuous",
    "owner_approved_moon_entry",
    "owner_locked_lilith_v5"
  ].includes(page.state));

  const report = {
    schema: "sky-placement-deep-audit-v1",
    generatedAt: new Date().toISOString(),
    scope: {
      pages: pages.length,
      bodies: planets,
      signs,
      billedCalls: 0,
      proseChanges: 0
    },
    servingInventory: {
      counts: stateCounts,
      protectedPageCount: protectedPages.length,
      incompletePageCount: thinPages.length + sourceGaps.length,
      pages
    },
    sourceIntegrity: {
      ownerReaderRows: readerRows.length,
      continuousRows: continuousRows.length,
      ownerReaderBundleSha256: sha256(`${JSON.stringify(ownerReader)}\n`),
      continuousBodySha256: sha256(continuousRows.map((row) => `${row.contentKey}\n${row.body_you || ""}`).join("\n\n")),
      renderedTryThisCount: pages.filter((page) => page.rendersTryThis).length,
      continuousRowsWithRetiredTryThisMetadata: deadTryThisRows.map((row) => row.contentKey),
      unresolvedRenderedPlaceholders: pages.filter((page) => page.unresolvedPlaceholder).map((page) => page.page)
    },
    recoveryAudit: {
      candidateCount: recoveryCandidates.length,
      blankCandidateCount: recoveryCandidates.filter((entry) => entry.runtimeState === "source_gap").length,
      alreadyServingCandidateCount: recoveryCandidates.filter((entry) => entry.runtimeState !== "source_gap").length,
      auditValidCount: recoveryCandidates.filter((entry) => entry.auditValid).length,
      hardFailPageCount: failingRecovery.length,
      zeroHardFailPageCount: recoveryCandidates.length - failingRecovery.length,
      failuresByRule: countBy(recoveryFailures, (failure) => failure.rule),
      candidates: recoveryCandidates
    },
    aspectContract: {
      approvedPlacementSpecificRows: exactPlacementAspectRows.length,
      reviewedSkyAspectRows: reviewedAspectRows.length,
      reviewedSkyAspectRowsByFamily: countBy(reviewedAspectRows, (row) => row.contentKey.split("/")[1]),
      unsupportedInterpretation: "omit from placement prose; App retains engine-factual Aspect details",
      genericPairEffectFallbackAllowed: false
    },
    readiness
  };

  const queue = [
    ...thinPages.map((page) => ({
      page: page.page,
      priority: "P1",
      state: "reader_visible_thin",
      action: "Complete and obtain exact owner approval; do not expand the one-paragraph legacy hook mechanically."
    })),
    ...sourceGaps.map((page) => ({
      page: page.page,
      priority: "P1",
      state: "fail_closed_missing_article",
      action: "Author through the governed pipeline, cold-read, and obtain exact owner approval before stamping or serving."
    }))
  ];

  const readme = `# Sky Placement fallback deep audit\n\n`+
    `Generated 2026-08-15. This audit made no prose changes and used no billed calls.\n\n`+
    `## Reader state\n\n`+
    `| state | pages | disposition |\n|---|---:|---|\n`+
    `| Owner-approved continuous article | ${stateCounts.owner_approved_continuous || 0} | Keep byte-protected |\n`+
    `| Owner-approved Moon entry | ${stateCounts.owner_approved_moon_entry || 0} | Keep byte-protected |\n`+
    `| Owner-locked Lilith V5 | ${stateCounts.owner_locked_lilith_v5 || 0} | Keep byte-protected |\n`+
    `| Legacy thin standalone | ${stateCounts.legacy_thin_standalone || 0} | Complete through owner review |\n`+
    `| SOURCE_GAP | ${stateCounts.source_gap || 0} | Correctly hidden until approved article exists |\n\n`+
    `**Complete today:** ${protectedPages.length} of ${pages.length} pages have governed full copy. `+
    `**Editorial completion queue:** ${thinPages.length + sourceGaps.length} pages (${thinPages.length} visible-but-thin, ${sourceGaps.length} fail closed).\n\n`+
    `## What the audit fixed\n\n`+
    `- The readiness audit now loads the actual owner-approved reader bundle; it no longer reports one continuous article when ${continuousRows.length} exist.\n`+
    `- Sky Placement direct address is governed by ED-028 and is not failed by the retired Current-Sky rule.\n`+
    `- Generic “people” is advisory on this surface, not a deterministic failure.\n`+
    `- Placement-aspect interpretation now fails closed independently: an aspect without approved prose does not restore generic pair-effect copy. Engine-factual aspect details remain available to the page.\n`+
    `- Future four-slot recovery is gated on deterministic validation plus exact owner approval; stored legacy rows do not become reader copy by existence alone.\n\n`+
    `## Deterministic recovery audit\n\n`+
    `${recoveryCandidates.length} historical four-slot candidates were audited with explicit planet/sign and reviewed cycle facts. `+
    `${failingRecovery.length} fail current policy; none were rewritten or promoted. Main failure counts: `+
    `${Object.entries(countBy(recoveryFailures, (failure) => failure.rule)).map(([rule, count]) => `${rule} ${count}`).join(", ") || "none"}.\n\n`+
    `The earlier semantic hook audit is not a rewrite mandate: it used now-superseded register rules and the model prose judge is advisory-only. `+
    `This report relies on runtime selection, source status, deterministic policy, byte hashes, and owner approval records.\n\n`+
    `## Files\n\n`+
    `- \`inventory.json\`: all 168 pages, render lane, content key, mechanical checks, and recovery findings.\n`+
    `- \`editorial-queue.md\`: the exact ${queue.length}-page completion queue.\n`+
    `- \`verification.md\`: generated after the repository test pass.\n`;

  const queueMd = `# Sky Placement editorial completion queue\n\n`+
    `This queue contains only pages that are incomplete on the reader surface. It does not ask for edits to owner-approved copy.\n\n`+
    `| # | page | current state | required action |\n|---:|---|---|---|\n`+
    queue.map((item, index) => `| ${index + 1} | \`${item.page}\` | ${item.state} | ${item.action} |`).join("\n") + "\n";

  const recoveryLedger = recoveryCandidates.map((entry) => ({
    page_key: entry.page,
    current_render_state: entry.runtimeState,
    audit_context: "explicit planet/sign plus REVIEWED planet-cycle-facts",
    audit_valid: entry.auditValid,
    current_lint_state: entry.fails ? "fails_current_policy" : entry.warnings ? "advisory" : "clean",
    lint_failures: entry.failures,
    lint_advisories: entry.advisories,
    owner_status: "not_approved_by_this_audit",
    render_eligible: false,
    notes: entry.notes
  }));
  const recoveryMd = `# Sky Placement recovery ledger\n\n`+
    `Regenerated by \`audit-sky-placement-surface.js\` on 2026-08-15 from the unchanged historical source rows. `+
    `This supersedes the earlier ledger whose “clean” result depended on copy edits that were not part of this branch.\n\n`+
    `| metric | value |\n|---|---:|\n`+
    `| candidate pages | ${recoveryCandidates.length} |\n`+
    `| currently SOURCE_GAP | ${recoveryCandidates.filter((entry) => entry.runtimeState === "source_gap").length} |\n`+
    `| already served by an approved lane | ${recoveryCandidates.filter((entry) => entry.runtimeState !== "source_gap").length} |\n`+
    `| valid deterministic audits | ${recoveryCandidates.filter((entry) => entry.auditValid).length} |\n`+
    `| pages failing current policy | ${failingRecovery.length} |\n`+
    `| pages with zero hard failures | ${recoveryCandidates.length - failingRecovery.length} |\n\n`+
    `Failure counts: ${Object.entries(countBy(recoveryFailures, (failure) => failure.rule)).map(([rule, count]) => `\`${rule}\` ${count}`).join(", ") || "none"}.\n\n`+
    `No row in this ledger is owner-approved or render-eligible by audit result alone.\n`;

  fs.mkdirSync(reviewRoot, { recursive: true });
  fs.mkdirSync(recoveryRoot, { recursive: true });
  fs.writeFileSync(path.join(reviewRoot, "inventory.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(reviewRoot, "README.md"), readme);
  fs.writeFileSync(path.join(reviewRoot, "editorial-queue.md"), queueMd);
  fs.writeFileSync(path.join(recoveryRoot, "SKY-PLACEMENT-RECOVERY-LEDGER.json"), `${JSON.stringify(recoveryLedger, null, 2)}\n`);
  fs.writeFileSync(path.join(recoveryRoot, "SKY-PLACEMENT-RECOVERY-LEDGER.md"), recoveryMd);
  process.stdout.write(`${JSON.stringify({
    pages: pages.length,
    states: stateCounts,
    protectedPages: protectedPages.length,
    incompletePages: queue.length,
    recoveryCandidates: recoveryCandidates.length,
    recoveryHardFailPages: failingRecovery.length,
    recoveryFailuresByRule: countBy(recoveryFailures, (failure) => failure.rule),
    ownerReaderBundleSha256: report.sourceIntegrity.ownerReaderBundleSha256
  }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
