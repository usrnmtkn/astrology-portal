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
  .update(typeof value === "string" ? value : JSON.stringify(value))
  .digest("hex");

const baseLibrary = readJson("source-rows/transit-synastry-rows-v1.json");
const baseRows = readJson("source-rows/fallback-source-rows-v3.json");
const blend = readJson("source-rows/lunation-blend-units-v1.json");
const templates = readJson("templates/fallback-templates-v3.json");
const aquariusFullMoon = baseRows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/sky-fullmoon-sign/aquarius"
);
const aquariusNewMoon = baseRows.hookRows.find(
  (row) => row.contentKey === "fallback-hook/sky-newmoon-sign/aquarius"
);
const rulerRetro = blend.hookRows.find(
  (row) => row.contentKey === "fallback-hook/lunation-ruler-retro"
);
const expectedAquariusFullMoon = "An Aquarius Full Moon shows you how the arrangement actually works. Saturn rules Aquarius, so the focus falls on responsibility, limits, and the rules everyone has been following, including the ones nobody remembers agreeing to.\n\nYou may notice that the same person keeps organizing the group, covering the missing work, or adjusting their schedule so the plan can continue. A friendship, agreement, or long-term goal may still exist, but that does not mean the current version of it is working.\n\nAquarius is fixed air. It can step back from the immediate emotion and see the pattern clearly. It can also keep defending a principle after the circumstances have changed. The fixed signs are involved, so check your grip. Commitment matters. So does knowing when loyalty has become an excuse to avoid a necessary conversation.\n\nWhat has been building may become easier to name now. You do not have to make the final decision at the same speed. Let the information settle before one difficult conversation becomes the reason to end the entire arrangement. Which commitments still deserve your effort? Where has staying quiet become the price of belonging?";
const expectedAquariusNewMoon = "An Aquarius New Moon is useful for changing the rules before the old arrangement becomes permanent. Saturn rules Aquarius, so the beginning needs more than a good idea. It needs a plan, clear responsibilities, and limits that everyone understands.\n\nThis may be the new group where one person is not expected to do all the organizing, the project with an actual budget and deadline, or the agreement that finally says what happens when someone does not follow through. Aquarius thinks beyond the immediate moment. It looks at the structure and asks if people can still live with it six months from now.\n\nThe caution is distance. Stepping back can help you see the pattern, but it can also become a way to avoid participating. Do not build a future you only want to advise from the sidelines. Choose one change that requires your time, your presence, and your share of the responsibility.";
const expectedMacroBody = "Full Moons bring what has been building into clearer view. In Aquarius, that may be the friendship that only works because one person keeps organizing everything, the group plan everyone agrees with but no one supports, or the role you accepted years ago that no one has checked to see if you still want.\n\nAquarius is a fixed air sign ruled by Saturn. It can step back from the immediate emotion and see how the larger system works. Who makes the decisions? Who carries the responsibility? Who is expected to adjust? That distance is useful when you need to see the pattern clearly. Taken too far, it can become detachment, rigid thinking, or loyalty to a principle long after it stops helping the people involved.\n\nThe Sun in Leo sits opposite this Moon, bringing personal recognition into tension with the expectations of the group. You may notice where you have been waiting for approval, staying loyal to a familiar role, or agreeing with a plan because you do not want to risk your place in the room. If belonging depends on staying quiet or continuing to play the same part, that arrangement becomes harder to defend. You may also see where a group has been happy to use your work while treating your need for credit as an ego problem.\n\nSaturn gives this Full Moon weight. The problem probably did not begin this week. It may be the same limitation everyone keeps working around, the responsibility that keeps returning to the same person, or the future plan that still sounds good but has no budget, deadline, or clear owner.\n\nClarity does not require a decision on the same day. Let the information settle. Notice what needs new terms, what both sides are willing to repair, and what has reached its limit.";
const expectedNewMoonMacroBody = "A New Moon begins in the dark: both lights meet in the same sign, nothing is visible yet, and the terms you set now are the ones the next six months will grow on. In Aquarius, those terms are structural. This lunation favors the deliberate start over the inspired one: the arrangement written down, the responsibilities named, the limit stated before anyone has to test it.\n\nAquarius is a fixed air sign ruled by Saturn, and it begins the way an engineer begins: by looking at the whole system before touching a single part. That makes Aquarius starts durable. It also makes them slow, and the wait between commitment and evidence is where most of them are abandoned.\n\nSaturn's rulership adds one more condition: whatever starts now has to survive scrutiny. A beginning that depends on nobody asking hard questions is not protected by this sky; it is exposed by it.\n\nSet the terms while it is still dark. By the time the results are visible, they will already be following the rules you chose here.";
const expectedCompactAquarius = "An Aquarius Full Moon shows you how the arrangement actually works. Saturn rules this sign, so attention turns to the responsibilities, limits, and old terms holding the plan together. The fixed signs are involved, so check your grip.";
const expectedOpeningNine = "A course, trip, application, publication, or long-term plan may be reaching the point where someone has to give a real answer.";
const expectedWeekLayer = "This week, the missing information arrives, someone gives their answer, or the practical cost of the plan becomes harder to ignore.";
const expectedRulerHouseEleven = "friends, organizations, professional contacts, and shared commitments are part of the answer. A goal everyone supported in theory may have quietly become your responsibility to carry";
const expectedRetroOverlay = "Because {{rulerTitle}} is retrograde, this is less about taking on something new and more an inspection of what already exists: the standing arrangements, the roles nobody re-negotiated, who is actually carrying the weight.";
const expectedSaturnVenusBody = "You may feel lonely even next to people who love you. You can still share a home, a calendar, or a bank account while affection gets buried under work schedules, childcare, debt, and the assumption that closeness will take care of itself.\n\nMoney may feel tighter too. A conversation about rent, spending, debt, or who keeps paying for the extras can reveal a larger problem about fairness. The disagreement may not really be about the bill. It may be about who feels considered, who keeps adjusting, and if both people are carrying the life they built together.\n\nSome connections can be rebuilt if both people are willing to name the problem and change the routine. In others, history, habit, or fear of being alone may be doing more of the work than affection. Saturn square Venus makes it difficult to keep calling familiarity closeness.";
const renderer = createTransitSynastryRenderer(
  {
    authoredCards: [
      ...baseLibrary.authoredCards,
      ...blend.authoredCards
    ]
  },
  templates,
  {
    ...baseRows,
    hookRows: [
      ...baseRows.hookRows,
      ...blend.hookRows
    ]
  }
);
const previewRenderer = createTransitSynastryRenderer(
  {
    authoredCards: [
      ...baseLibrary.authoredCards,
      ...blend.authoredCards
    ]
  },
  templates,
  {
    ...baseRows,
    hookRows: [
      ...baseRows.hookRows,
      ...blend.hookRows
    ]
  },
  { allowUnreviewed: true }
);
const rendererWithoutRulerHouseNine = createTransitSynastryRenderer(
  {
    authoredCards: [
      ...baseLibrary.authoredCards,
      ...blend.authoredCards
    ]
  },
  templates,
  {
    ...baseRows,
    hookRows: [
      ...baseRows.hookRows,
      ...blend.hookRows.filter(
        (row) => row.contentKey !== "fallback-hook/lunation-ruler-house/9"
      )
    ]
  }
);

assert.equal(blend.authoredCards.length, 5);
assert.equal(blend.hookRows.length, 56);
const approvedBlendRows = [...blend.authoredCards, ...blend.hookRows]
  .filter((row) => row.review_status === "approved");
const reviewGatedBlendRows = [...blend.authoredCards, ...blend.hookRows]
  .filter((row) => row.review_status === "needs_review");
assert.equal(approvedBlendRows.length, 18);
assert.equal(reviewGatedBlendRows.length, 43);
const batchThreeRows = [...blend.authoredCards, ...blend.hookRows]
  .filter((row) => row.source_keys?.includes(
    "Lunation sign packages batch 3 — the next three events"
  ));
assert.equal(batchThreeRows.length, 9);
assert.ok(batchThreeRows.every((row) => row.review_status === "needs_review"));
assert.equal(
  sha256(batchThreeRows.map((row) => [
    row.contentKey,
    row.headline ?? null,
    row.body ?? row.body_you
  ])),
  "078101e931510176f48b68fc29e506131dd4659390af5472dd346858eb6d90a0"
);
const batchThreeText = (sign) => batchThreeRows
  .filter((row) => row.contentKey.endsWith(`/${sign}`))
  .map((row) => `${row.headline ?? ""}\n${row.body ?? row.body_you ?? ""}`)
  .join("\n");
assert.match(batchThreeText("leo"), /\bSun\b/u);
assert.match(batchThreeText("pisces"), /\bJupiter\b/u);
assert.doesNotMatch(batchThreeText("pisces"), /\bNeptune\b/u);
assert.match(batchThreeText("virgo"), /\bMercury\b/u);
assert.equal(blend.authoredCards[1].body, expectedNewMoonMacroBody);
assert.equal(blend.authoredCards[1].review_status, "needs_review");
assert.equal(aquariusFullMoon?.body_you, expectedAquariusFullMoon);
assert.equal(aquariusFullMoon?.body_they, expectedAquariusFullMoon);
assert.equal(aquariusNewMoon?.body_you, expectedAquariusNewMoon);
assert.equal(aquariusNewMoon?.body_they, expectedAquariusNewMoon);
assert.equal(aquariusFullMoon?.review_status, "approved");
assert.equal(aquariusNewMoon?.review_status, "approved");
assert.equal(blend.authoredCards[0].body, expectedMacroBody);
assert.equal(
  blend.hookRows.find((row) => row.contentKey === "fallback-hook/lunation-sign-compact/aquarius")?.body_you,
  expectedCompactAquarius
);
assert.equal(
  blend.hookRows.find((row) => row.contentKey === "fallback-hook/lunation-opening-situation/9")?.body_you,
  expectedOpeningNine
);
assert.equal(
  blend.hookRows.find((row) => row.contentKey === "fallback-hook/lunation-week-layer")?.body_you,
  expectedWeekLayer
);
assert.equal(
  blend.hookRows.find((row) => row.contentKey === "fallback-hook/lunation-ruler-house/11")?.body_you,
  expectedRulerHouseEleven
);
assert.equal(rulerRetro?.body_you, expectedRetroOverlay);
assert.equal(rulerRetro?.review_status, "approved");
assert.ok(
  [...blend.authoredCards, aquariusFullMoon, aquariusNewMoon]
    .every((row) => row && !/\byour\s+(?:1st|2nd|3rd|\d+th)\s+house\b/iu.test(
      `${row.body ?? ""}\n${row.body_you ?? ""}\n${row.body_they ?? ""}`
    )),
  "Macro and per-sign authored copy must stay house-neutral."
);
assert.ok(
  blend.hookRows
    .filter((row) => (
      row.contentKey.startsWith("fallback-hook/lunation-ruler-house/")
      || row.contentKey === "fallback-hook/lunation-ruler-retro"
    ))
    .every((row) => !/\byour\s+(?:1st|2nd|3rd|\d+th)\s+house\b/iu.test(row.body_you)),
  "Moving-body house numbers must remain computed slots, never authored ruler-hook copy."
);

const macro = renderer.renderLunationMacro({
  kind: "full-moon",
  sign: "aquarius"
});
assert.equal(macro.headline, blend.authoredCards[0].headline);
assert.equal(macro.body, blend.authoredCards[0].body);
assert.throws(
  () => renderer.renderLunationMacro({ kind: "new-moon", sign: "aquarius" }),
  SourceGapError,
  "The Aquarius New Moon macro must remain dark while it is needs_review."
);
const previewNewMoonMacro = previewRenderer.renderLunationMacro({
  kind: "new-moon",
  sign: "aquarius"
});
assert.equal(previewNewMoonMacro.headline, blend.authoredCards[1].headline);
assert.equal(previewNewMoonMacro.body, expectedNewMoonMacroBody);
const batchThreeByKey = new Map(batchThreeRows.map((row) => [row.contentKey, row]));
for (const [kind, sign] of [
  ["new-moon", "leo"],
  ["full-moon", "pisces"],
  ["new-moon", "virgo"]
]) {
  assert.throws(
    () => renderer.renderLunationMacro({ kind, sign }),
    SourceGapError,
    `${kind}/${sign} macro must remain dark while needs_review.`
  );
  const previewMacro = previewRenderer.renderLunationMacro({ kind, sign });
  const sourceMacro = batchThreeByKey.get(`authored/sky-lunation-macro/${kind}/${sign}`);
  assert.equal(previewMacro.headline, sourceMacro.headline);
  assert.equal(previewMacro.body, sourceMacro.body);
}

const previewLeoNewMoon = previewRenderer.renderLunationHoroscope({
  kind: "new-moon",
  sign: "leo",
  risingSign: "leo",
  moonHouse: 1,
  ruler: "sun",
  rulerHouse: 1
});
assert.ok(previewLeoNewMoon.parts.includes(
  batchThreeByKey.get("fallback-hook/lunation-sign-compact/new-moon/leo").body_you
));
assert.doesNotMatch(
  previewLeoNewMoon.body,
  /Sun rules this New Moon from your/u,
  "Leo's Sun-ruled skip rule must suppress the ruler line."
);
const readerLeoNewMoon = renderer.renderLunationHoroscope({
  kind: "new-moon",
  sign: "leo",
  risingSign: "leo",
  moonHouse: 1,
  ruler: "sun",
  rulerHouse: 1
});
assert.doesNotMatch(readerLeoNewMoon.body, /what you want your name on/u);

const previewPiscesFullMoon = previewRenderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "pisces",
  risingSign: "pisces",
  moonHouse: 1,
  sunHouse: 7,
  ruler: "jupiter",
  rulerHouse: 5
});
assert.ok(previewPiscesFullMoon.parts.some((part) => part.startsWith(
  batchThreeByKey.get("fallback-hook/lunation-sign-compact/full-moon/pisces").body_you
)));
assert.match(previewPiscesFullMoon.body, /Jupiter rules this Full Moon/u);
assert.doesNotMatch(previewPiscesFullMoon.body, /Neptune rules/u);

const previewVirgoNewMoon = previewRenderer.renderLunationHoroscope({
  kind: "new-moon",
  sign: "virgo",
  risingSign: "virgo",
  moonHouse: 1,
  ruler: "mercury",
  rulerHouse: 10
});
assert.ok(previewVirgoNewMoon.parts.includes(
  batchThreeByKey.get("fallback-hook/lunation-sign-compact/new-moon/virgo").body_you
));
assert.match(previewVirgoNewMoon.body, /Mercury rules this New Moon/u);

const openingDrafts = blend.hookRows.filter((row) => (
  row.contentKey.startsWith("fallback-hook/lunation-opening-situation/")
  && row.review_status === "needs_review"
));
const rulerDrafts = blend.hookRows.filter((row) => (
  row.contentKey.startsWith("fallback-hook/lunation-ruler-house/")
  && row.review_status === "needs_review"
));
const uranusDrafts = blend.hookRows.filter((row) => (
  row.contentKey.startsWith("fallback-hook/lunation-uranus-layer/")
  && row.review_status === "needs_review"
));
assert.equal(openingDrafts.length, 11);
assert.equal(rulerDrafts.length, 11);
assert.equal(uranusDrafts.length, 11);
assert.deepEqual(
  new Set(openingDrafts.map((row) => Number(row.contentKey.split("/").at(-1)))),
  new Set([1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12])
);
assert.deepEqual(
  new Set(rulerDrafts.map((row) => Number(row.contentKey.split("/").at(-1)))),
  new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12])
);
assert.deepEqual(
  new Set(uranusDrafts.map((row) => Number(row.contentKey.split("/").at(-1)))),
  new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
);
assert.equal(
  sha256(openingDrafts.map((row) => [row.contentKey, row.body_you])),
  "04173b14ca21dd75ee5ad8f5e85ebeb21c2b6998b0c3358370cafa33b0bdfa9f"
);
assert.equal(
  sha256(rulerDrafts.map((row) => [row.contentKey, row.body_you])),
  "27bc6d4052637ec3f823679e97fa34bc05a3cfd4ebdd47ade03688b7c296e1ff"
);
assert.equal(
  sha256(uranusDrafts.map((row) => [row.contentKey, row.body_you])),
  "d4633eb3192284d5f65c13002bcd58b81e9a9687ce1f8b298b007ff81098a16e"
);
assert.equal(
  sha256(blend.authoredCards[1].body),
  "9920cd664c3b41665f14d1f7607d9a1182e8edb25ffa6dec7f5061cd15f9289e"
);

const gemini = renderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "gemini",
  moonHouse: 9,
  sunHouse: 3,
  ruler: "saturn",
  rulerHouse: 11,
  rulerRetrograde: true,
  uranusHouse: 1,
  uranusLayerActive: true,
  weekly: true
});
const geminiRuler = gemini.parts.findIndex((part) => part.startsWith("Saturn rules this Full Moon"));
const geminiUranus = gemini.parts.findIndex((part) => part.startsWith("Uranus in your 1st house"));
assert.ok(gemini.parts[0].startsWith(expectedOpeningNine));
assert.match(gemini.parts[0], /9th house/u);
assert.ok(gemini.parts[1].startsWith(expectedCompactAquarius));
assert.match(gemini.parts[1], /3rd house/u);
assert.match(gemini.parts[1], /9th house/u);
assert.match(gemini.body, /Saturn rules this sign/u);
assert.doesNotMatch(gemini.body, /Uranus rules this sign/u);
assert.equal(
  gemini.body.includes(expectedAquariusFullMoon),
  false,
  "The full Sky sign section must not render inside the per-rising card."
);
assert.ok(geminiRuler > 1, "Ruler-house localization must follow the compact sign core and woven counterpoint.");
assert.match(
  gemini.parts[geminiRuler],
  /^Saturn rules this Full Moon from your 11th house, so friends, organizations, professional contacts, and shared commitments are part of the answer\. A goal everyone supported in theory may have quietly become your responsibility to carry\. Because Saturn is retrograde, this is less about taking on something new and more an inspection of what already exists: the standing arrangements, the roles nobody re-negotiated, who is actually carrying the weight\.$/u
);
assert.ok(geminiUranus > geminiRuler, "The conditional Uranus layer must follow the traditional ruler line.");
assert.equal(
  gemini.parts[geminiUranus],
  `Uranus in your 1st house adds a more personal element of change. Other people may notice that your direction, language, or presentation is changing before you have fully explained it. ${expectedWeekLayer}`
);
assert.doesNotMatch(
  gemini.body,
  /\b(?:It can show up|That might look|Let go of|Your higher path|Set your intention)\b/u,
  "The retired per-rising closer stack must not render."
);
const directSaturn = renderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "gemini",
  moonHouse: 9,
  sunHouse: 3,
  ruler: "saturn",
  rulerHouse: 11,
  rulerRetrograde: false,
  uranusHouse: 1,
  uranusLayerActive: true
});
const directSaturnRuler = directSaturn.parts.find(
  (part) => part.startsWith("Saturn rules this Full Moon")
);
assert.equal(
  directSaturnRuler,
  "Saturn rules this Full Moon from your 11th house, so friends, organizations, professional contacts, and shared commitments are part of the answer. A goal everyone supported in theory may have quietly become your responsibility to carry."
);
assert.doesNotMatch(directSaturn.body, /Because Saturn is retrograde/u);
assert.doesNotMatch(directSaturn.body, new RegExp(expectedWeekLayer, "u"));

const leo = renderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "leo",
  moonHouse: 7,
  sunHouse: 1,
  ruler: "saturn",
  rulerHouse: 9,
  uranusHouse: 11,
  uranusLayerActive: true,
  weekly: true
});
assert.match(leo.parts[0], /7th house/u);
assert.match(leo.body, /your 1st house/u);
assert.match(
  leo.body,
  /Saturn rules this Full Moon from your 9th house, so the realizations arrive through the bigger frame:/u
);
assert.doesNotMatch(leo.body, /Uranus in your/u, "Missing Uranus house copy must skip the secondary layer.");
assert.match(leo.body, new RegExp(expectedWeekLayer, "u"));
assert.doesNotMatch(
  leo.parts[0],
  /^A partnership, a marriage/u,
  "The needs_review seventh-house opener must not enter reader output."
);
const previewLeo = previewRenderer.renderLunationHoroscope({
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "leo",
  moonHouse: 7,
  sunHouse: 1,
  ruler: "saturn",
  rulerHouse: 9,
  uranusHouse: 11,
  uranusLayerActive: true,
  weekly: true
});
assert.match(previewLeo.parts[0], /^A partnership, a marriage/u);
assert.match(
  previewLeo.body,
  /Saturn rules this Full Moon from your 9th house, so the bigger frame is in charge: the trip, the course, the legal or academic process, the belief being tested\. A process far from your daily routine is setting the pace\./u
);
assert.doesNotMatch(previewLeo.body, /pace\.\./u);
assert.match(previewLeo.body, /Uranus in your 11th house keeps the circle in motion/u);
const leoWithoutRulerHouseNine = rendererWithoutRulerHouseNine.renderLunationHoroscope({
  kind: "full-moon",
  sign: "aquarius",
  risingSign: "leo",
  moonHouse: 7,
  sunHouse: 1,
  ruler: "saturn",
  rulerHouse: 9,
  uranusHouse: 11,
  uranusLayerActive: false,
  weekly: true
});
assert.match(leoWithoutRulerHouseNine.body, /7th house/u);
assert.match(leoWithoutRulerHouseNine.body, /your 1st house/u);
assert.doesNotMatch(
  leoWithoutRulerHouseNine.body,
  /Saturn rules this Full Moon/u,
  "A missing ruler-house localization row must omit only that line."
);
assert.ok(
  leoWithoutRulerHouseNine.body.trim().length > 0,
  "A missing ruler-house localization row must leave the assembled card complete."
);

const cancerNewMoon = renderer.renderLunationHoroscope({
  kind: "new-moon",
  sign: "cancer",
  risingSign: "aries",
  moonHouse: 4,
  sunHouse: 4,
  ruler: "moon",
  rulerHouse: 4,
  weekly: true
});
assert.doesNotMatch(cancerNewMoon.body, /The friction this week/u);
assert.doesNotMatch(cancerNewMoon.body, /ruling this New Moon/u);
assert.doesNotMatch(cancerNewMoon.body, /Aquarius Full Moon/u);
assert.match(cancerNewMoon.body, new RegExp(expectedWeekLayer, "u"));

const saturnVenus = baseLibrary.authoredCards.find(
  (row) => row.contentKey === "authored/transit-aspect/saturn/venus/square"
);
assert.ok(saturnVenus, "The owner-final Saturn-Venus square unit must be imported.");
assert.equal(saturnVenus.body_you, expectedSaturnVenusBody);
const renderedSaturnVenus = renderer.renderTransitAspect({
  transiting: "saturn",
  natal: "venus",
  aspect: "square"
});
assert.equal(renderedSaturnVenus.headline, saturnVenus.headline);
assert.equal(renderedSaturnVenus.body, saturnVenus.body_you);
assert.match(
  renderedSaturnVenus.body,
  /if both people are carrying the life they built together/u
);
assert.doesNotMatch(
  renderedSaturnVenus.body,
  /whether both people are carrying the life they built together/u
);

assert.throws(
  () => renderer.renderLunationMacro({ kind: "full-moon", sign: "aries" }),
  SourceGapError,
  "Missing macro coverage must remain an explicit source gap."
);

const skyArticle = renderer.renderSkyLunation({
  kind: "full-moon",
  sign: "aquarius",
  dateLine: "On July 29"
});
assert.ok(
  skyArticle.body.startsWith(blend.authoredCards[0].body),
  "The approved macro must lead the matching Sky lunation article."
);
assert.ok(
  skyArticle.body.includes(expectedAquariusFullMoon),
  "The owner-final Aquarius sign replacement must supersede its legacy authored body."
);

for (const [kind, sign, moonKind] of [
  ["new-moon", "leo", "newmoon"],
  ["full-moon", "pisces", "fullmoon"],
  ["new-moon", "virgo", "newmoon"]
]) {
  const replacement = batchThreeByKey.get(`fallback-hook/sky-${moonKind}-sign/${sign}`);
  const macroRow = batchThreeByKey.get(`authored/sky-lunation-macro/${kind}/${sign}`);
  const readerArticle = renderer.renderSkyLunation({
    kind,
    sign,
    dateLine: "On the event date"
  });
  assert.equal(readerArticle.body.includes(macroRow.body), false);
  assert.equal(readerArticle.body.includes(replacement.body_you), false);

  const previewArticle = previewRenderer.renderSkyLunation({
    kind,
    sign,
    dateLine: "On the event date"
  });
  assert.ok(previewArticle.body.startsWith(macroRow.body));
  assert.ok(previewArticle.body.includes(replacement.body_you));
}

console.log("lunation blend assembly checks passed: retrograde ruler overlay, direct-ruler control, computed houses, conditional Uranus layer, and byte-identical aspect copy");
