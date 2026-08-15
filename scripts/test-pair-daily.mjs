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
import { selectDailyGlanceDriverPool } from "../apps/web/src/services/chartMath.ts";
import { selectPairDailyDriver, stablePairDailyVariant } from "../apps/web/src/services/pairDaily.ts";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readPackageJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(packageDir, relativePath), "utf8")
);
const sourceRows = readPackageJson("source-rows/fallback-source-rows-v3.json");
const transitRows = readPackageJson("source-rows/transit-synastry-rows-v1.json");
const templates = readPackageJson("templates/fallback-templates-v3.json");
const pairFrames = readPackageJson("source-rows/pair-daily-frames-v1.json");
const pairClauses = readPackageJson("source-rows/pair-daily-clauses-v1.json");

assert.equal(pairFrames.rows.length, 28);
assert.equal(pairClauses.rows.length, 110);
assert.ok([...pairFrames.rows, ...pairClauses.rows].every((row) => row.review_status === "approved"));
const bondClauses = pairClauses.rows.filter((row) => (
  row.contentKey.startsWith("fallback-hook/pair-daily/bond-clause/")
));
assert.equal(bondClauses.length, 28);
assert.equal(bondClauses.filter((row) => row.contentKey.includes("/soft/")).length, 14);
assert.equal(bondClauses.filter((row) => row.contentKey.includes("/hard/")).length, 14);
assert.ok(bondClauses.every((row) => row.source_key?.startsWith("fallback-hook/bond-effect-")));
assert.equal(
  pairFrames.rows.find((row) => row.contentKey === "fallback-hook/pair-daily/opener")?.body_you,
  "{readerHandle}, you are {readerClause}, while {friendHandle} is {friendClause}."
);
assert.equal(
  pairFrames.rows.find((row) => row.contentKey === "fallback-hook/pair-daily/close/hard")?.body_you,
  "Keep the plan you already made. Don't reschedule twice and pretend it's flexibility."
);
assert.equal(
  pairFrames.rows.find((row) => row.contentKey === "fallback-hook/pair-daily/shared-bond/soft/variant-6")?.body_you,
  "You mention the plan and realize you are already on the same page. {bondClause}"
);
assert.equal(
  pairFrames.rows.find((row) => row.contentKey === "fallback-hook/pair-daily/shared-bond/soft/variant-10")?.body_you,
  "The plan that kept slipping gets a date, and suddenly it feels real. {bondClause}"
);
assert.equal(
  pairFrames.rows.find((row) => row.contentKey === "fallback-hook/pair-daily/shared-bond/hard/variant-2")?.body_you,
  "One strange text or offhand comment follows you both longer than either of you meant it to. {bondClause}"
);
assert.equal(
  pairClauses.rows.find((row) => row.contentKey === "fallback-hook/pair-daily/clause/square/venus")?.body_you,
  "letting a slow reply be a slow reply instead of assuming something is wrong"
);

const approvedRows = {
  ...sourceRows,
  hookRows: [
    ...sourceRows.hookRows,
    ...pairFrames.rows,
    ...pairClauses.rows
  ]
};
const renderer = createTransitSynastryRenderer(transitRows, templates, approvedRows);
const baseFacts = {
  reader: {
    handle: "mariesatori",
    clauseKey: "fallback-hook/pair-daily/clause/square/venus"
  },
  friend: {
    handle: "matthew_mezo",
    displayName: "Matthew Mezo",
    clauseKey: "fallback-hook/pair-daily/clause/house/4"
  },
  shared: { kind: "moon", element: "earth" }
};

const first = renderer.renderPairDaily({ ...baseFacts, variant: 1 });
assert.match(
  first.body,
  /^@mariesatori, you are letting a slow reply be a slow reply instead of assuming something is wrong, while @matthew_mezo is fixing the thing at home that makes the day harder every single time\./u
);
assert.deepEqual(first.sourceKeys, [
  "fallback-hook/pair-daily/opener",
  baseFacts.reader.clauseKey,
  baseFacts.friend.clauseKey,
  "fallback-hook/pair-daily/shared-moon/earth"
]);
assert.doesNotMatch(first.body, /\{\{?[\w.]+\}?\}/u);

const second = renderer.renderPairDaily({ ...baseFacts, variant: 2 });
const third = renderer.renderPairDaily({ ...baseFacts, variant: 3 });
assert.match(second.body, /^@mariesatori, your attention is on/u);
assert.ok(second.sourceKeys.includes("fallback-hook/pair-daily/clause/square/venus/variant-2"));
assert.match(third.body, /^You are/u);

const friendVoice = renderer.renderPairDaily({
  ...baseFacts,
  friend: {
    ...baseFacts.friend,
    clauseKey: "fallback-hook/pair-daily/clause/square/sun"
  },
  shared: { kind: null },
  variant: 1
});
assert.match(friendVoice.body, /@matthew_mezo is keeping up the version of themselves that looks like they have it handled/u);
assert.doesNotMatch(friendVoice.body, /version of yourself/u);

const readerHandleFallback = renderer.renderPairDaily({
  ...baseFacts,
  reader: { ...baseFacts.reader, handle: null },
  shared: { kind: null },
  variant: 1
});
assert.match(readerHandleFallback.body, /^You are/u);
assert.equal(readerHandleFallback.sourceKeys[0], "fallback-hook/pair-daily/opener/variant-3");
assert.doesNotMatch(readerHandleFallback.body, /Marie|@mariesatori/u);

const displayNameFallback = renderer.renderPairDaily({
  ...baseFacts,
  friend: { ...baseFacts.friend, handle: "" },
  shared: { kind: null },
  variant: 1
});
assert.match(displayNameFallback.body, /while Matthew Mezo is/u);
const genericFallback = renderer.renderPairDaily({
  ...baseFacts,
  friend: { ...baseFacts.friend, handle: null, displayName: "" },
  shared: { kind: null },
  variant: 1
});
assert.match(genericFallback.body, /while your friend is/u);

const houseFallback = renderer.renderPairDaily({
  ...baseFacts,
  reader: {
    ...baseFacts.reader,
    clauseKey: "fallback-hook/pair-daily/clause/house/4"
  },
  shared: { kind: null },
  variant: 2
});
assert.equal(houseFallback.sourceKeys[1], "fallback-hook/pair-daily/clause/house/4");
assert.match(houseFallback.body, /fixing the thing at home that makes the day harder every single time/u);

const softBondClauseKey = "fallback-hook/pair-daily/bond-clause/soft/venus";
const softTen = renderer.renderPairDaily({
  ...baseFacts,
  shared: { kind: "bond", family: "soft", transiting: "venus" },
  variant: 10
});
assert.ok(softTen.sourceKeys.includes("fallback-hook/pair-daily/shared-bond/soft/variant-10"));
assert.ok(softTen.sourceKeys.includes(softBondClauseKey));
assert.ok(!softTen.sourceKeys.some((key) => key.startsWith("fallback-hook/bond-effect-")));
assert.match(softTen.body, /A small gesture of affection reaches the place the long conversation kept circling\./u);
const softWrap = renderer.renderPairDaily({
  ...baseFacts,
  shared: { kind: "bond", family: "soft", transiting: "venus" },
  variant: 11
});
assert.ok(softWrap.sourceKeys.includes("fallback-hook/pair-daily/shared-bond/soft"));
const correctedJupiterClause = renderer.renderPairDaily({
  ...baseFacts,
  shared: { kind: "bond", family: "soft", transiting: "jupiter" },
  variant: 1
});
assert.match(
  correctedJupiterClause.body,
  /One idea turns into three plans fast, so check the calendar before you commit to all of them\./u
);
assert.doesNotMatch(correctedJupiterClause.body, /before you promise all of them/u);

for (const [element, count] of [["fire", 3], ["earth", 3], ["air", 2], ["water", 4]]) {
  const last = renderer.renderPairDaily({
    ...baseFacts,
    shared: { kind: "moon", element },
    variant: count
  });
  assert.ok(last.sourceKeys.includes(`fallback-hook/pair-daily/shared-moon/${element}/variant-${count}`));
  const wrapped = renderer.renderPairDaily({
    ...baseFacts,
    shared: { kind: "moon", element },
    variant: count + 1
  });
  assert.ok(wrapped.sourceKeys.includes(`fallback-hook/pair-daily/shared-moon/${element}`));
}

for (const transiting of ["saturn", "mercury"]) {
  const gatedClose = renderer.renderPairDaily({
    ...baseFacts,
    shared: { kind: "bond", family: "hard", transiting },
    variant: 1
  });
  assert.ok(gatedClose.sourceKeys.includes(`fallback-hook/pair-daily/bond-clause/hard/${transiting}`));
  assert.ok(gatedClose.sourceKeys.includes("fallback-hook/pair-daily/close/hard"));
  assert.match(gatedClose.body, /Don't reschedule twice and pretend it's flexibility\.$/u);
}
const ungatedClose = renderer.renderPairDaily({
  ...baseFacts,
  shared: { kind: "bond", family: "hard", transiting: "mars" },
  variant: 2
});
assert.ok(ungatedClose.sourceKeys.includes("fallback-hook/pair-daily/shared-bond/hard/variant-2"));
assert.ok(!ungatedClose.sourceKeys.includes("fallback-hook/pair-daily/close/hard"));
assert.equal(
  renderNodePairDaily({
    ...baseFacts,
    shared: { kind: "bond", family: "soft", transiting: "venus" },
    variant: 10
  }).body,
  softTen.body
);

assert.equal(renderNodePairDaily({ ...baseFacts, variant: 1 }).body, first.body);

assert.throws(
  () => renderer.renderPairDaily({
    ...baseFacts,
    reader: { ...baseFacts.reader, clauseKey: "fallback-hook/pair-daily/clause/square/missing" }
  }),
  (error) => error instanceof SourceGapError && /SOURCE_GAP/u.test(error.message)
);
const missingBaseClauseRenderer = createTransitSynastryRenderer(transitRows, templates, {
  ...approvedRows,
  hookRows: approvedRows.hookRows.filter((row) => (
    row.contentKey !== "fallback-hook/pair-daily/clause/square/venus"
  ))
});
assert.throws(
  () => missingBaseClauseRenderer.renderPairDaily({ ...baseFacts, variant: 2 }),
  (error) => error instanceof SourceGapError && /base clause/u.test(error.message),
  "An approved variant must never conceal a missing base clause."
);
const missingFamilyRenderer = createTransitSynastryRenderer(transitRows, templates, {
  ...approvedRows,
  hookRows: approvedRows.hookRows.filter((row) => !row.contentKey.startsWith("fallback-hook/pair-daily/shared-moon/water"))
});
assert.throws(
  () => missingFamilyRenderer.renderPairDaily({ ...baseFacts, shared: { kind: "moon", element: "water" } }),
  (error) => error instanceof SourceGapError && /SOURCE_GAP/u.test(error.message)
);
const missingBondClauseRenderer = createTransitSynastryRenderer(transitRows, templates, {
  ...approvedRows,
  hookRows: approvedRows.hookRows.filter((row) => row.contentKey !== softBondClauseKey)
});
assert.throws(
  () => missingBondClauseRenderer.renderPairDaily({
    ...baseFacts,
    shared: { kind: "bond", family: "soft", transiting: "venus" }
  }),
  (error) => error instanceof SourceGapError && error.message.includes(softBondClauseKey),
  "A missing compressed bond clause must fail closed instead of reusing the full bond-card body."
);
const unresolvedRenderer = createTransitSynastryRenderer(transitRows, templates, {
  ...approvedRows,
  hookRows: [
    ...approvedRows.hookRows,
    {
      ...pairFrames.rows.find((row) => row.contentKey === "fallback-hook/pair-daily/opener"),
      body_you: "{readerHandle}, you are {readerClause}, while {friendHandle} is {friendClause}. {missingSlot}"
    }
  ]
});
assert.throws(
  () => unresolvedRenderer.renderPairDaily({ ...baseFacts, shared: { kind: null }, variant: 1 }),
  (error) => error instanceof SourceGapError && /missing slot/u.test(error.message)
);
const forbiddenWindowRenderer = createTransitSynastryRenderer(transitRows, templates, {
  ...approvedRows,
  hookRows: [
    ...approvedRows.hookRows,
    {
      ...pairFrames.rows.find((row) => row.contentKey === "fallback-hook/pair-daily/opener"),
      body_you: "{readerHandle}, you are {readerClause}, while {friendHandle} is {friendClause}. Until tomorrow."
    }
  ]
});
assert.throws(
  () => forbiddenWindowRenderer.renderPairDaily({ ...baseFacts, shared: { kind: null }, variant: 1 }),
  (error) => error instanceof SourceGapError && /today-only window/u.test(error.message)
);

const sameDayVariant = stablePairDailyVariant("reader-a", "friend-b", "2026-08-06");
assert.equal(sameDayVariant, stablePairDailyVariant("reader-a", "friend-b", "2026-08-06"));
assert.notEqual(sameDayVariant, stablePairDailyVariant("reader-a", "friend-b", "2026-08-07"));
assert.equal(
  renderer.renderPairDaily({ ...baseFacts, variant: sameDayVariant }).body,
  renderer.renderPairDaily({ ...baseFacts, variant: sameDayVariant }).body,
  "Same-day refreshes must be byte-identical."
);

const applyingPool = selectDailyGlanceDriverPool(86, [
  { planet: "Jupiter", longitude: 177 },
  { planet: "Venus", longitude: 178 },
  { planet: "Mars", longitude: 179 },
  { planet: "Sun", longitude: 180 },
  { planet: "Saturn", longitude: 174 }
], 6, 5, 3);
assert.deepEqual(applyingPool, [
  { kind: "aspect", natal: "Jupiter", aspect: "square", orb: 1 },
  { kind: "aspect", natal: "Venus", aspect: "square", orb: 2 },
  { kind: "aspect", natal: "Mars", aspect: "square", orb: 3 }
]);
assert.ok(
  applyingPool.every((driver) => driver.kind !== "aspect" || driver.natal !== "Saturn"),
  "The separating Saturn contact must never enter the Pair Daily driver pool."
);
assert.ok(
  applyingPool.every((driver) => driver.kind !== "aspect" || driver.natal !== "Sun"),
  "Pair Daily must cap its valid applying-contact pool at the tightest three."
);

const pairSeeds = Array.from({ length: 12 }, (_, index) => ({
  friendId: `friend-${index}`,
  seed: stablePairDailyVariant("reader-a", `friend-${index}`, "2026-08-07")
}));
const firstThreeSeed = pairSeeds[0];
const differentThreeSeed = pairSeeds.find(({ seed }) => (
  (seed - 1) % applyingPool.length !== (firstThreeSeed.seed - 1) % applyingPool.length
));
assert.ok(differentThreeSeed, "Fixture pairs must cover different top-three driver slots.");
const firstPairDriver = selectPairDailyDriver(applyingPool, firstThreeSeed.seed);
const secondPairDriver = selectPairDailyDriver(applyingPool, differentThreeSeed.seed);
assert.notDeepEqual(firstPairDriver, secondPairDriver);
const pairDriverClauseKey = (driver) => (
  `fallback-hook/pair-daily/clause/square/${driver.natal.toLowerCase()}`
);
const firstPairOutput = renderer.renderPairDaily({
  ...baseFacts,
  reader: { ...baseFacts.reader, clauseKey: pairDriverClauseKey(firstPairDriver) },
  shared: { kind: null },
  variant: firstThreeSeed.seed
});
const secondPairOutput = renderer.renderPairDaily({
  ...baseFacts,
  reader: { ...baseFacts.reader, clauseKey: pairDriverClauseKey(secondPairDriver) },
  shared: { kind: null },
  variant: differentThreeSeed.seed
});
assert.notEqual(
  firstPairOutput.sourceKeys[1].replace(/\/variant-\d+$/u, ""),
  secondPairOutput.sourceKeys[1].replace(/\/variant-\d+$/u, ""),
  "Two friend pairs with three qualifying contacts can select different slot-A drivers."
);

const oppositeParitySeed = pairSeeds.find(({ seed }) => seed % 2 !== firstThreeSeed.seed % 2);
assert.ok(oppositeParitySeed, "Fixture pairs must cover both clause-variant lanes.");
const singleDriver = [
  { kind: "aspect", natal: "sun", aspect: "square", orb: 1 }
];
assert.deepEqual(
  selectPairDailyDriver(singleDriver, firstThreeSeed.seed),
  selectPairDailyDriver(singleDriver, oppositeParitySeed.seed),
  "A one-contact day must keep the same driver across friend pairs."
);
const firstClauseLane = renderer.renderPairDaily({
  ...baseFacts,
  reader: { ...baseFacts.reader, clauseKey: "fallback-hook/pair-daily/clause/square/sun" },
  shared: { kind: null },
  variant: firstThreeSeed.seed
});
const secondClauseLane = renderer.renderPairDaily({
  ...baseFacts,
  reader: { ...baseFacts.reader, clauseKey: "fallback-hook/pair-daily/clause/square/sun" },
  shared: { kind: null },
  variant: oppositeParitySeed.seed
});
assert.notEqual(firstClauseLane.sourceKeys[1], secondClauseLane.sourceKeys[1]);
assert.notEqual(
  firstClauseLane.parts[0],
  secondClauseLane.parts[0],
  "Two friend pairs with one qualifying driver can still vary slot A through approved clause lanes."
);

const housePool = selectDailyGlanceDriverPool(30, [{ planet: "Mars", longitude: 0 }], 9, 5, 3);
assert.deepEqual(housePool, [{ kind: "house", house: 9 }]);
assert.deepEqual(
  selectPairDailyDriver(housePool, firstThreeSeed.seed),
  selectPairDailyDriver(housePool, oppositeParitySeed.seed),
  "House fallback days remain a single non-rotating truth."
);

const words = first.body.trim().split(/\s+/u);
assert.ok(words.length <= 75, `Approved Pair Daily output must stay within 75 words; got ${words.length}.`);
assert.doesNotMatch(
  first.body,
  /\b(?:until|through)\s+(?:today\b|tomorrow\b|(?:mon|tues|wednes|thurs|fri|satur|sun)day\b|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|\d)/iu
);
assert.doesNotMatch(first.body, / {2,}|\s+[,.!?;:]|\b(?:and|while|but|so)\s*[.!?]?$/iu);
assert.doesNotMatch(displayNameFallback.body, / {2,}|\s+[,.!?;:]|\b(?:and|while|but|so)\s*[.!?]?$/iu);
const hedgeCount = first.body.match(/\b(?:can|could|may|might|perhaps|possibly)\b/giu)?.length ?? 0;
assert.ok(hedgeCount <= 1, `Assembled Pair Daily output has ${hedgeCount} hedges.`);

console.log("pair daily approved-row resolver and rotation checks passed");
