#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const bundleDir = path.join("/private/tmp", "tldrastro-sky-historical-lookback-test");
const bundleFile = path.join(bundleDir, "sky-historical-lookback.bundle.mjs");

fs.mkdirSync(bundleDir, { recursive: true });
await build({
  bundle: true,
  entryPoints: [path.join(repoRoot, "apps/web/src/content/skyHistoricalLookback.ts")],
  format: "esm",
  logLevel: "silent",
  outfile: bundleFile,
  platform: "node"
});

const {
  historicalEventIdentityMatches,
  resolveSkyHistoricalLookback,
  skyHistoricalLookbackSettingId,
  skyHistoricalLookbackSettingKey,
  skyHistoricalLookbackTemplateId
} = await import(`${pathToFileURL(bundleFile).href}?t=${Date.now()}`);

const eventIdentity = {
  eventType: "planet-in-sign",
  bodies: ["Uranus"],
  sign: "Gemini"
};

const reviewedRecord = {
  id: "history.sky.uranus-gemini.1941-1949",
  status: "reviewed",
  surface: "sky.collective.detail",
  eligibility: "eligible",
  eventIdentity,
  currentWindow: {
    start: "2026-04-26",
    end: "2032-08-03"
  },
  previousWindows: [{
    start: "1941-08-07",
    end: "1949-06-10",
    calculationSourceId: "calculated/ephemeris/uranus-gemini-1941-1949"
  }],
  previousCycleDateLabel: "1941-1949",
  historicalHeading: "Last time around",
  clauses: {
    historicalContext: "The previous Uranus-in-Gemini era gives an earlier chapter for studying communication systems.",
    recurringQuestion: "The recurring question is how information moves when established channels cannot contain it.",
    importantDifference: "The earlier period offers context, not a script.",
    presentInvitation: "Return to the current transit by asking which networks deserve our attention now."
  },
  historicalSources: [{
    id: "reviewed/history/communications-1940s",
    title: "Reviewed communications history source",
    supports: ["historicalContext"]
  }],
  astrologyCalculationSources: ["calculated/ephemeris/uranus-gemini-1941-1949"],
  reviewedBy: "editorial",
  reviewedAt: "2026-07-13T00:00:00.000Z",
  confidence: "high",
  causalClaimCheck: "passed",
  repetitionClaimCheck: "passed",
  historicalMatchSpecificity: "same-planet-same-sign",
  exactDegreeMatch: false,
  directionMatch: true,
  historicalAnalogyStrength: "broad"
};

assert.equal(skyHistoricalLookbackSettingId, "skyHistoricalLookbackEnabled");
assert.equal(skyHistoricalLookbackSettingKey, "app-setting/sky-historical-lookbacks");
assert.equal(skyHistoricalLookbackTemplateId, "sky.collective.historical-lookback.v1");
assert.equal(historicalEventIdentityMatches(reviewedRecord, eventIdentity), true);
assert.equal(historicalEventIdentityMatches(reviewedRecord, { ...eventIdentity, sign: "Cancer" }), false);

assert.equal(resolveSkyHistoricalLookback({
  enabled: false,
  eventIdentity,
  records: [reviewedRecord]
}), null, "Disabled setting must omit the lookback entirely.");

assert.equal(resolveSkyHistoricalLookback({
  enabled: true,
  eventIdentity,
  records: [{ ...reviewedRecord, status: "draft" }]
}), null, "Draft historical candidates must remain Admin-only.");

assert.equal(resolveSkyHistoricalLookback({
  enabled: true,
  eventIdentity,
  records: [{ ...reviewedRecord, causalClaimCheck: "failed" }]
}), null, "Failed causal-claim checks must not render.");

assert.equal(resolveSkyHistoricalLookback({
  enabled: true,
  eventIdentity: { ...eventIdentity, sign: "Cancer" },
  records: [reviewedRecord]
}), null, "Mismatched event identity must not render.");

const rendered = resolveSkyHistoricalLookback({
  enabled: true,
  eventIdentity,
  records: [reviewedRecord]
});

assert.ok(rendered, "Reviewed, eligible, matching historical record should render.");
assert.equal(rendered.heading, "Last time around");
assert.equal(rendered.dateLabel, "1941-1949");
assert.equal(rendered.paragraphs.length, 1);
assert.match(rendered.paragraphs[0], /context, not a script/i);
assert.equal(rendered.trace.templateId, "sky.collective.historical-lookback.v1");
assert.deepEqual(rendered.trace.previousWindowSource, ["calculated/ephemeris/uranus-gemini-1941-1949"]);
assert.deepEqual(rendered.trace.historicalEventSources, ["reviewed/history/communications-1940s"]);

const appSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/App.tsx"), "utf8");
const adminSource = fs.readFileSync(path.join(repoRoot, "apps/web/src/admin/GeneratedContentAdminDashboard.tsx"), "utf8");

assert.match(appSource, /skyHistoricalLookbackEnabled\(generatedContent\)/, "App must gate lookbacks from generated content settings.");
assert.match(appSource, /<h2>\{detail\.historicalLookback\.heading\}<\/h2>/, "Reader must render historical heading only when a lookback exists.");
assert.match(adminSource, /Historical lookbacks in expanded Sky/, "Admin app behavior page must expose the setting.");
assert.match(adminSource, /userConfigurable:\s*false/, "Persisted setting payload must mark the setting as not user-configurable.");

console.log(JSON.stringify({
  status: "PASS",
  settingId: skyHistoricalLookbackSettingId,
  settingKey: skyHistoricalLookbackSettingKey,
  templateId: skyHistoricalLookbackTemplateId,
  renderedParagraphs: rendered.paragraphs.length
}, null, 2));
