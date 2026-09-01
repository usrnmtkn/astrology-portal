#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  natalAspectContentKey,
  natalAspectContentKeyPrefix,
  natalAspectDisplayTitle,
  natalAspectMatchesSelection,
  natalAspectSelectionOptions,
  natalAspectSourceDraft,
  parseNatalAspectContentKey
} from "../apps/admin/src/natalAspectSources.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const catalog = JSON.parse(fs.readFileSync(
  path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json"),
  "utf8"
));
const catalogRows = Object.values(catalog)
  .flatMap((value) => Array.isArray(value) ? value : [])
  .filter((row) => typeof row.contentKey === "string" && row.contentKey.startsWith(natalAspectContentKeyPrefix));

assert.ok(catalogRows.length >= 291, "The Natal Aspects workspace must cover the full exact pair-specific natal aspect catalog.");
assert.equal(new Set(catalogRows.map((row) => row.contentKey)).size, catalogRows.length, "Exact natal aspect content keys must remain unique.");
assert.ok(catalogRows.every((row) => row.content_role === "fallback_hook" || row.content_role === "full_copy"), "The workspace must be backed by exact fallback-hook or full-copy rows.");
assert.ok(catalogRows.every((row) => parseNatalAspectContentKey(row.contentKey)), "Every exact natal aspect key must parse into two bodies and one aspect.");

const sampleRows = catalogRows.map((row) => ({ content_key: row.contentKey }));
const options = natalAspectSelectionOptions(sampleRows);
assert.ok(options.first.includes("lilith"));
assert.ok(options.aspects.includes("conjunction"));
assert.ok(options.aspects.includes("semisextile"));
assert.ok(options.second.includes("part-of-fortune"));
assert.equal(
  natalAspectDisplayTitle({ first: "lilith", aspect: "conjunction", second: "sun" }),
  "Lilith Conjunction Sun"
);
assert.equal(
  natalAspectContentKey({ first: "lilith", aspect: "square", second: "ascendant" }),
  "fallback-hook/natal-aspect-lived/lilith/square/ascendant"
);
const missingAspectDraft = natalAspectSourceDraft({ first: "lilith", aspect: "square", second: "ascendant" });
assert.equal(missingAspectDraft.contentKey, "fallback-hook/natal-aspect-lived/lilith/square/ascendant");
assert.equal(missingAspectDraft.sections.packageRecord.body, "");
assert.equal(missingAspectDraft.sections.packageRecord.body_they, "");
assert.equal(missingAspectDraft.sections.packageRecord.review_status, "needs_review");
assert.equal(missingAspectDraft.sections.packageRecord.render_policy, "reader-only-exact-lived-v1");
assert.equal(missingAspectDraft.sourceSnapshot.sourcePackage, "tldrastro-fallback-architecture-v3");
assert.equal(parseNatalAspectContentKey("fallback-hook/aspect-lived/conjunction"), null, "Generic aspect prose must not appear in the exact Natal Aspects workspace.");
assert.ok(natalAspectMatchesSelection(
  { content_key: "fallback-hook/natal-aspect-lived/lilith/conjunction/sun" },
  { first: "lilith", aspect: "conjunction", second: "sun" }
));
assert.equal(natalAspectMatchesSelection(
  { content_key: "fallback-hook/natal-aspect-lived/lilith/opposition/sun" },
  { first: "lilith", aspect: "conjunction", second: "sun" }
), false);
assert.ok(natalAspectMatchesSelection(
  { content_key: "fallback-hook/natal-aspect-lived/lilith/conjunction/sun" },
  { first: "sun", aspect: "conjunction", second: "lilith" }
), "The finder must match the runtime's reverse body lookup order.");

const dashboardSource = fs.readFileSync(path.join(repoRoot, "apps/admin/src/GeneratedContentAdminDashboard.tsx"), "utf8");
const natalChartNavIndex = dashboardSource.indexOf('label: "Natal Chart"');
const natalAspectNavIndex = dashboardSource.indexOf('label: "Natal Aspects"');
const skyWriteupsNavIndex = dashboardSource.indexOf('label: "Sky Write-ups"');
assert.ok(natalChartNavIndex >= 0 && natalAspectNavIndex > natalChartNavIndex && skyWriteupsNavIndex > natalAspectNavIndex, "Natal Aspects must appear directly beneath Natal Chart in the primary navigation.");
assert.match(dashboardSource, /<NatalAspectSourceFinder/u, "The dedicated workspace must lazy-load the exact natal aspect finder.");
assert.match(dashboardSource, /category: "Natal Aspects"/u, "The Natal Aspects navigation must deep-link to its dedicated category route.");

const finderSource = fs.readFileSync(path.join(repoRoot, "apps/admin/src/NatalAspectSourceFinder.tsx"), "utf8");
const firstLabelIndex = finderSource.indexOf("1. Planet or point");
const aspectLabelIndex = finderSource.indexOf("2. Aspect");
const secondLabelIndex = finderSource.indexOf("3. Other planet or point");
assert.ok(firstLabelIndex >= 0 && aspectLabelIndex > firstLabelIndex && secondLabelIndex > aspectLabelIndex, "Natal aspect selector labels must preserve the reader-friendly first body, aspect, second body order.");
assert.match(finderSource, />Edit source</u, "Every matching exact natal aspect must open the standard editor.");
assert.match(finderSource, /Write \{selectedTitle\}/u, "A missing exact aspect must offer a contextual writing action.");
assert.match(finderSource, /onCreateSource\(natalAspectSourceDraft\(\{ first, aspect, second \}\)\)/u, "The contextual action must preserve the selected exact pair.");

console.log(`Admin Natal Aspects workspace passed: ${catalogRows.length} exact pair-specific passages are discoverable and editable.`);
