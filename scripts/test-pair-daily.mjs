#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  SourceGapError,
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderPairDaily as renderNodePairDaily } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { stablePairDailyVariant } from "../apps/web/src/services/pairDaily.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const sourceRows = JSON.parse(fs.readFileSync(path.join(packageDir, "source-rows/fallback-source-rows-v3.json"), "utf8"));
const transitRows = JSON.parse(fs.readFileSync(path.join(packageDir, "source-rows/transit-synastry-rows-v1.json"), "utf8"));
const templates = JSON.parse(fs.readFileSync(path.join(packageDir, "templates/fallback-templates-v3.json"), "utf8"));

assert.equal(
  sourceRows.hookRows.some((row) => row.contentKey.startsWith("fallback-hook/pair-daily/")),
  false,
  "Production must stay dark until approved pair-daily rows land."
);
assert.throws(
  () => renderNodePairDaily({
    reader: { clauseKey: "fallback-hook/daily-headline/square/sun" },
    friend: { handle: "nova", clauseKey: "fallback-hook/daily-headline/square/moon" },
    shared: { kind: null },
    variant: 1
  }),
  (error) => error?.constructor?.name === "SourceGapError" && /SOURCE_GAP/u.test(error.message),
  "The Node reference resolver must SOURCE_GAP while production pair rows are absent."
);

const approved = (contentKey, body_you, body_they = body_you) => ({
  contentKey,
  content_role: "fallback_hook",
  grammar_frame: "complete_sentence",
  body_you,
  body_they,
  review_status: "approved"
});
const fixtureRows = {
  hookRows: [
    approved("fallback-hook/pair-daily/opener", "{{readerClause}}, while {{friendHandle}} {{friendClause}}."),
    approved("fallback-hook/pair-daily/opener/variant-2", "Today, {{readerClause}}; meanwhile, {{friendHandle}} {{friendClause}}."),
    approved("fallback-hook/pair-daily/opener/variant-3", "{{readerClause}} today, as {{friendHandle}} {{friendClause}}."),
    approved("fallback-hook/daily-headline/square/sun", "you choose the direct route", "chooses the wrong voice"),
    approved("fallback-hook/daily-headline/soft/moon", "you take the quick route", "takes the patient route"),
    approved("fallback-hook/bond-effect-soft/venus", "the plan may feel easier"),
    approved("fallback-hook/pair-daily/shared-bond/soft", "Together, {{bondClause}} today."),
    approved("fallback-hook/pair-daily/shared-bond/soft/variant-2", "Between you, {{bondClause}} today."),
    approved("fallback-hook/pair-daily/shared-bond/hard", "Together, {{bondClause}} needs care today."),
    approved("fallback-hook/pair-daily/shared-bond/hard/variant-2", "Between you, {{bondClause}} needs care today."),
    ...["fire", "earth", "air", "water"].map((element) => approved(
      `fallback-hook/pair-daily/shared-moon/${element}`,
      `You are both moving with ${element} emphasis today.`
    ))
  ],
  vocabularyRows: []
};
const renderer = createTransitSynastryRenderer({ authoredCards: [] }, { templates: [] }, fixtureRows);
const baseFacts = {
  reader: { clauseKey: "fallback-hook/daily-headline/square/sun" },
  friend: {
    handle: "nova",
    displayName: "Nova Lane",
    clauseKey: "fallback-hook/daily-headline/soft/moon"
  },
  shared: {
    kind: "bond",
    family: "soft",
    bondClauseKey: "fallback-hook/bond-effect-soft/venus"
  }
};

const first = renderer.renderPairDaily({ ...baseFacts, variant: 1 });
const second = renderer.renderPairDaily({ ...baseFacts, variant: 2 });
const third = renderer.renderPairDaily({ ...baseFacts, variant: 3 });
assert.match(first.body, /while @nova takes the patient route/u);
assert.doesNotMatch(first.body, /wrong voice/u, "Friend clauses must use body_they.");
assert.match(second.body, /^Today,/u);
assert.match(second.body, /Between you,/u);
assert.match(third.body, / today, as @nova/u);
assert.match(third.body, /Together,/u, "The third slot must wrap the two bond variants.");
assert.notEqual(first.body, second.body, "Frame variants must select distinct approved rows.");
const hard = renderer.renderPairDaily({
  ...baseFacts,
  shared: { ...baseFacts.shared, family: "hard" },
  variant: 2
});
assert.match(hard.body, /Between you, the plan may feel easier needs care today\./u);

const displayNameFallback = renderer.renderPairDaily({
  ...baseFacts,
  friend: { ...baseFacts.friend, handle: "" },
  shared: { kind: null }
});
assert.match(displayNameFallback.body, /Nova Lane takes the patient route/u);
const genericFallback = renderer.renderPairDaily({
  ...baseFacts,
  friend: { ...baseFacts.friend, handle: null, displayName: "" },
  shared: { kind: null }
});
assert.match(genericFallback.body, /your friend takes the patient route/u);

for (const element of ["fire", "earth", "air", "water"]) {
  const moon = renderer.renderPairDaily({
    ...baseFacts,
    shared: { kind: "moon", element },
    variant: 1
  });
  assert.match(moon.body, new RegExp(`${element} emphasis today`, "u"));
}

const darkRenderer = createTransitSynastryRenderer(transitRows, templates, sourceRows);
assert.throws(
  () => darkRenderer.renderPairDaily(baseFacts),
  (error) => error instanceof SourceGapError && /SOURCE_GAP/u.test(error.message),
  "Missing approved pair frames must SOURCE_GAP."
);
assert.throws(
  () => renderer.renderPairDaily({ ...baseFacts, reader: { clauseKey: "fallback-hook/daily-headline/missing" } }),
  (error) => error instanceof SourceGapError && /SOURCE_GAP/u.test(error.message),
  "Missing daily clauses must SOURCE_GAP."
);

const unresolvedRenderer = createTransitSynastryRenderer(
  { authoredCards: [] },
  { templates: [] },
  {
    ...fixtureRows,
    hookRows: fixtureRows.hookRows.map((row) => row.contentKey === "fallback-hook/pair-daily/opener"
      ? { ...row, body_you: `${row.body_you} {{missingSlot}}` }
      : row)
  }
);
assert.throws(
  () => unresolvedRenderer.renderPairDaily({ ...baseFacts, shared: { kind: null } }),
  (error) => error instanceof SourceGapError && /missing slot/u.test(error.message),
  "Unresolved pair slots must SOURCE_GAP."
);

assert.equal(stablePairDailyVariant("reader-a", "friend-b", "2026-08-06"), stablePairDailyVariant("reader-a", "friend-b", "2026-08-06"));
assert.notEqual(stablePairDailyVariant("reader-a", "friend-b", "2026-08-06"), stablePairDailyVariant("reader-a", "friend-b", "2026-08-07"));
const sameDayVariant = stablePairDailyVariant("reader-a", "friend-b", "2026-08-06");
assert.equal(
  renderer.renderPairDaily({ ...baseFacts, variant: sameDayVariant }).body,
  renderer.renderPairDaily({ ...baseFacts, variant: sameDayVariant }).body,
  "Same-day refreshes must be byte-identical."
);

const words = first.body.trim().split(/\s+/u);
assert.ok(words.length <= 65, `Fixture output must stay within 65 words; got ${words.length}.`);
assert.doesNotMatch(first.body, /\b(?:until|through)\b/iu);
assert.match(first.body, /\btoday\b/iu);
assert.doesNotMatch(first.body, / {2,}|\s+[,.!?;:]|\b(?:and|while|but|so)\s*[.!?]?$/iu);
assert.doesNotMatch(displayNameFallback.body, / {2,}|\s+[,.!?;:]|\b(?:and|while|but|so)\s*[.!?]?$/iu);
const hedgeCount = first.body.match(/\b(?:can|could|may|might|perhaps|possibly)\b/giu)?.length ?? 0;
assert.ok(hedgeCount <= 1, `Assembled Pair Daily output has ${hedgeCount} hedges.`);

console.log("pair daily resolver and rotation checks passed");
