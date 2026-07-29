#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  SourceGapError,
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageDir = path.join(repoRoot, "apps/web/src/content/fallbackArchitectureV3");
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(path.join(packageDir, relativePath), "utf8")
);
const sha256 = (value) => crypto
  .createHash("sha256")
  .update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value))
  .digest("hex");

const blendPath = path.join(packageDir, "source-rows/lunation-blend-units-v1.json");
const blendBytes = fs.readFileSync(blendPath);
const blend = JSON.parse(blendBytes);
const baseLibrary = readJson("source-rows/transit-synastry-rows-v1.json");
const baseRows = readJson("source-rows/fallback-source-rows-v3.json");
const templates = readJson("templates/fallback-templates-v3.json");
const allBlendRows = [...blend.authoredCards, ...blend.hookRows];
const newMoonOpen = "New Moons begin a six-month cycle, and what starts now grows on the terms you set first.";
const fullMoonOpen = "Full Moons bring what has been building into clearer view.";

const bundle = {
  transitLib: {
    authoredCards: [...baseLibrary.authoredCards, ...blend.authoredCards]
  },
  rowsFile: {
    ...baseRows,
    hookRows: [...baseRows.hookRows, ...blend.hookRows]
  }
};
const renderer = createTransitSynastryRenderer(
  bundle.transitLib,
  templates,
  bundle.rowsFile
);
const previewRenderer = createTransitSynastryRenderer(
  bundle.transitLib,
  templates,
  bundle.rowsFile,
  { allowUnreviewed: true }
);

// The corrected working-tree package is the locked import. This checksum catches
// accidental normalization or a return to any pre-ruling review draft.
assert.equal(
  sha256(blendBytes),
  "a92bf23a8fde1d5277137f35898d8a44e5a3b53704f5e8ef23dc67068ce687dc"
);
assert.equal(blend.authoredCards.length, 24);
assert.equal(blend.hookRows.length, 76);
assert.equal(allBlendRows.filter((row) => row.review_status === "approved").length, 66);
assert.equal(allBlendRows.filter((row) => row.review_status === "needs_review").length, 34);

// Batch 3 is owner-approved and must serve byte-identically through R4.
const batchThree = allBlendRows.filter((row) => row.source_keys?.includes(
  "Lunation sign packages batch 3 — the next three events"
));
assert.equal(batchThree.length, 9);
assert.ok(batchThree.every((row) => row.review_status === "approved"));
assert.equal(
  sha256(batchThree.map((row) => [
    row.contentKey,
    row.headline ?? null,
    row.body ?? row.body_you,
    row.review_status
  ])),
  "1d2320cede3022f66315daea48fbfa7ec5a16f611890c09a29cadb141fc777d1"
);
const batchThreeByKey = new Map(batchThree.map((row) => [row.contentKey, row]));
for (const [kind, sign, moonKind] of [
  ["new-moon", "leo", "newmoon"],
  ["full-moon", "pisces", "fullmoon"],
  ["new-moon", "virgo", "newmoon"]
]) {
  const sourceMacro = batchThreeByKey.get(
    `authored/sky-lunation-macro/${kind}/${sign}`
  );
  const sourceCompact = batchThreeByKey.get(
    `fallback-hook/lunation-sign-compact/${kind}/${sign}`
  );
  const sourceSign = batchThreeByKey.get(
    `fallback-hook/sky-${moonKind}-sign/${sign}`
  );
  assert.ok(sourceMacro && sourceCompact && sourceSign);

  const renderedMacro = renderer.renderLunationMacro({ kind, sign });
  assert.equal(renderedMacro.headline, sourceMacro.headline);
  assert.equal(renderedMacro.body, sourceMacro.body);

  const article = renderer.renderSkyLunation({
    kind,
    sign,
    dateLine: "On the event date"
  });
  assert.ok(article.body.startsWith(sourceMacro.body));
  assert.ok(article.body.includes(sourceSign.body_you));

  const rising = renderer.renderLunationHoroscope({
    kind,
    sign,
    risingSign: sign,
    moonHouse: 1,
    sunHouse: kind === "full-moon" ? 7 : null,
    ruler: sign === "leo" ? "sun" : sign === "pisces" ? "jupiter" : "mercury",
    rulerHouse: 5
  });
  assert.ok(rising.parts.some((part) => part.startsWith(sourceCompact.body_you)));
}

// The Leo New Moon is Sun-ruled, so the circular ruler line remains skipped.
const leoNewMoon = renderer.renderLunationHoroscope({
  kind: "new-moon",
  sign: "leo",
  risingSign: "leo",
  moonHouse: 1,
  ruler: "sun",
  rulerHouse: 1
});
assert.doesNotMatch(leoNewMoon.body, /Sun rules this New Moon from your/u);

// Approved macros must obey the owner-ruled fixed frame before they can serve.
for (const macro of blend.authoredCards.filter(
  (row) => row.review_status === "approved"
)) {
  const expected = macro.contentKey.includes("/new-moon/")
    ? newMoonOpen
    : fullMoonOpen;
  assert.ok(
    macro.body.startsWith(expected),
    `${macro.contentKey} must open with its fixed macro function sentence.`
  );
}

// The owner-approved fallback set completes all kind-by-sign slots in the
// reader lane.
const fallbackSetSource = "Lunation fallback set — full sign coverage, 19 macros + 20 compact cores";
const fallbackSet = allBlendRows.filter((row) => row.source_keys?.includes(
  fallbackSetSource
));
assert.equal(fallbackSet.length, 39);
assert.ok(fallbackSet.every((row) => row.review_status === "approved"));
assert.equal(
  sha256(fallbackSet.map((row) => [
    row.contentKey,
    row.headline ?? null,
    row.body ?? row.body_you,
    row.review_status
  ])),
  "49e40a8ab404cba6e98de20604489d4161a6b87d14eb31d9c60ebdf8a726b0e6"
);
const fallbackMacros = fallbackSet.filter(
  (row) => row.contentKey.startsWith("authored/sky-lunation-macro/")
);
const fallbackCompacts = fallbackSet.filter(
  (row) => row.contentKey.startsWith("fallback-hook/lunation-sign-compact/")
);
assert.equal(fallbackMacros.length, 19);
assert.equal(fallbackCompacts.length, 20);
for (const macro of fallbackMacros) {
  const expected = macro.contentKey.includes("/new-moon/")
    ? newMoonOpen
    : fullMoonOpen;
  assert.ok(macro.body.startsWith(expected));
  const [, , kind, sign] = macro.contentKey.split("/");
  assert.equal(renderer.renderLunationMacro({ kind, sign }).body, macro.body);
  assert.equal(
    previewRenderer.renderLunationMacro({ kind, sign }).body,
    macro.body
  );
}
for (const compact of fallbackCompacts) {
  assert.ok(
    compact.body_you.split(/\s+/u).length > 10,
    `${compact.contentKey} must serve its authored compact prose, not a sign-name placeholder.`
  );
}
const signs = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];
for (const kind of ["new-moon", "full-moon"]) {
  for (const sign of signs) {
    const macroKey = `authored/sky-lunation-macro/${kind}/${sign}`;
    const compactKey = `fallback-hook/lunation-sign-compact/${kind}/${sign}`;
    assert.ok(blend.authoredCards.some((row) => row.contentKey === macroKey));
    assert.ok(blend.hookRows.some((row) => row.contentKey === compactKey));
    if (kind === "new-moon" && sign === "aquarius") {
      assert.throws(
        () => renderer.renderLunationMacro({ kind, sign }),
        SourceGapError
      );
    } else {
      assert.doesNotThrow(() => renderer.renderLunationMacro({ kind, sign }));
    }
    assert.doesNotThrow(() => previewRenderer.renderLunationMacro({ kind, sign }));
  }
}

// Batch 2 V2 remains wired for preview while every needs_review row stays dark
// in the reader renderer.
const batchTwo = allBlendRows.filter((row) => row.source_keys?.includes(
  "Lunation blend batch 2 — house-keyed families complete + Aquarius NM macro"
));
assert.equal(batchTwo.length, 34);
assert.ok(batchTwo.every((row) => row.review_status === "needs_review"));
assert.equal(
  sha256(batchTwo.map((row) => [
    row.contentKey,
    row.headline ?? null,
    row.body ?? row.body_you,
    row.review_status
  ])),
  "7b3ae8f7a96ae7938021dc2499397d7d216eeed7f1ac97e622ea1f8dc405b905"
);
assert.throws(
  () => renderer.renderLunationMacro({ kind: "new-moon", sign: "aquarius" }),
  SourceGapError
);
const stagedAquarius = blend.authoredCards.find(
  (row) => row.contentKey === "authored/sky-lunation-macro/new-moon/aquarius"
);
assert.equal(
  previewRenderer.renderLunationMacro({
    kind: "new-moon",
    sign: "aquarius"
  }).body,
  stagedAquarius.body
);

// Duplicate ruler-house keys are intentional supersession pairs. Production
// selects the approved V1; preview selects its later needs_review V2. No key may
// be imported twice into the active map.
const hooksByKey = new Map();
for (const row of blend.hookRows) {
  const keyed = hooksByKey.get(row.contentKey) ?? [];
  keyed.push(row);
  hooksByKey.set(row.contentKey, keyed);
}
const duplicateHooks = [...hooksByKey].filter(([, rows]) => rows.length > 1);
assert.equal(duplicateHooks.length, 11);
for (const [contentKey, rows] of duplicateHooks) {
  assert.match(contentKey, /^fallback-hook\/lunation-ruler-house\/(?:[1-9]|10|12)$/u);
  assert.equal(rows.length, 2);
  assert.deepEqual(
    rows.map((row) => row.review_status).sort(),
    ["approved", "needs_review"]
  );
}
const approvedRulerOne = duplicateHooks
  .find(([key]) => key.endsWith("/1"))[1]
  .find((row) => row.review_status === "approved").body_you;
const stagedRulerOne = duplicateHooks
  .find(([key]) => key.endsWith("/1"))[1]
  .find((row) => row.review_status === "needs_review").body_you;
const rulerFacts = {
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "aquarius",
  moonHouse: 1,
  sunHouse: 7,
  ruler: "saturn",
  rulerHouse: 1
};
assert.ok(renderer.renderLunationHoroscope(rulerFacts).body.includes(approvedRulerOne));
assert.ok(previewRenderer.renderLunationHoroscope(rulerFacts).body.includes(stagedRulerOne));
assert.notEqual(approvedRulerOne, stagedRulerOne);

// Register split: weekly calls renderLunationHoroscope directly. The You-page
// event resolver accepts only a date-keyed Satori unit unless the pending blend
// fallback is explicitly enabled.
assert.throws(
  () => renderer.renderLunationEventCard({
    eventDate: "2026-07-29",
    ...rulerFacts
  }),
  SourceGapError
);
assert.equal(
  renderer.renderLunationEventCard({
    eventDate: "2026-07-29",
    blendFallbackEnabled: true,
    ...rulerFacts
  }).body,
  renderer.renderLunationHoroscope(rulerFacts).body
);
const syntheticSatori = {
  contentKey: "authored/satori-lunation/2026-07-29/aquarius-rising",
  content_role: "authored_card",
  headline: "Satori event card",
  body: "Locked per-event Satori copy.",
  review_status: "approved"
};
const satoriRenderer = createTransitSynastryRenderer(
  {
    authoredCards: [
      ...bundle.transitLib.authoredCards,
      syntheticSatori
    ]
  },
  templates,
  bundle.rowsFile
);
const satori = satoriRenderer.renderLunationEventCard({
  eventDate: "2026-07-29T10:35:00-04:00",
  ...rulerFacts
});
assert.equal(satori.headline, syntheticSatori.headline);
assert.equal(satori.body, syntheticSatori.body);
assert.equal(satori.templateKey, "authored/satori-lunation-v1");

// Moving-body houses remain computed slots, never authored into package copy.
assert.ok(
  allBlendRows
    // Uranus rows are themselves the engine-selected computed-house slot.
    .filter((row) => !row.contentKey.startsWith("fallback-hook/lunation-uranus-layer/"))
    .every((row) => !/\byour\s+(?:1st|2nd|3rd|\d+th)\s+house\b/iu.test(
      `${row.body ?? ""}\n${row.body_you ?? ""}\n${row.body_they ?? ""}`
    ))
);

console.log(
  "lunation blend checks passed: 23/24 reader macros, 24/24 preview macros, 24/24 compacts, 39 approved fallback rows, 34 gated Batch 2 rows, 11 supersession pairs, macro frames, and register split"
);
