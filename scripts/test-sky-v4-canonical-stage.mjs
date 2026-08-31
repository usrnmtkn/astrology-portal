import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import {
  SKY_V4_CANONICAL_PACKAGE_VERSION,
  SKY_V4_OVERLAY_DEFAULTS,
  assertSkyV4CanonicalPackage,
  continuousArticleFor,
  renderSkyV4ContinuousPreview,
  renderSkyV4StudioPreview,
  resolveSkyV4EclipseMainBody,
  resolveSkyV4Lunation,
  resolveSkyV4Retrograde,
  resolveSkyV4ContextualOverlays,
  selectSkyV4Aspects,
  skyV4ContentStudioRecords,
  skyV4RuntimeCoverage
} from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";

const sourcePath = new URL("../apps/web/src/content/fallbackArchitectureV3/authored-inputs/sky-v4-canonical-content-studio-stage-v1.json", import.meta.url);
const bytes = fs.readFileSync(sourcePath);
const corpus = JSON.parse(bytes);
const lower = (value) => String(value ?? "").trim().toLowerCase();
const title = (value) => String(value ?? "").replace(/[-_]+/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());

assert.equal(createHash("sha256").update(bytes).digest("hex"), "9b91e715bea63a2c835001783240122aad1e000b3982d68bfebbb3cef690a750");
assert.equal(assertSkyV4CanonicalPackage(corpus), corpus);
assert.equal(corpus.packageVersion, SKY_V4_CANONICAL_PACKAGE_VERSION);
assert.equal(corpus.servingEnabled, false);

const records = skyV4ContentStudioRecords(corpus);
const coverage = skyV4RuntimeCoverage(corpus);
assert.equal(records.length, 305);
assert.equal(coverage.continuousCount, 120);
assert.equal(coverage.fallbackCount, 120);
assert.equal(coverage.compositionScenarioCount, 30);
assert.equal(coverage.editingTestCount, 14);
assert.ok(records.every((row) => row.review_status === "needs_review"));
assert.ok(records.every((row) => row.owner_approved === false));
assert.ok(records.every((row) => row.serving_enabled === false));
assert.ok(records.every((row) => row.source_package === SKY_V4_CANONICAL_PACKAGE_VERSION));
assert.equal(new Set(records.map((row) => row.contentKey)).size, records.length);

for (const source of corpus.content.continuous) {
  const staged = records.find((row) => row.contentKey === source.contentKey);
  assert.ok(staged, `Missing staged record ${source.contentKey}`);
  assert.equal(staged.placementArticle, source.placementArticle, `${source.contentKey} placementArticle drifted`);
  assert.equal(staged.body_you, source.placementArticle, `${source.contentKey} body mirror drifted`);
  assert.deepEqual(staged.studio_source_baseline, source, `${source.contentKey} baseline drifted`);
}

const venusAriesContext = {
  subjectFamily: "continuous",
  subjectBody: "Venus",
  subjectSign: "Aries",
  subjectCondition: "retrograde",
  contextKind: "co-present-motion",
  contextBodyOrEvent: "Mercury",
  contextSign: "Aries",
  contextCondition: "retrograde"
};
const matchedOverlays = resolveSkyV4ContextualOverlays(corpus, [venusAriesContext]);
assert.equal(matchedOverlays.length, 1);
assert.equal(resolveSkyV4ContextualOverlays(corpus, [venusAriesContext], { contextualTransitOverlaysEnabled: false }).length, 0);
assert.equal(resolveSkyV4ContextualOverlays(corpus, [venusAriesContext], SKY_V4_OVERLAY_DEFAULTS, {
  exactAspectDuplicateKeys: [matchedOverlays[0].OverlayKey]
}).length, 0);

const aspects = [
  { id: "venus", bodyA: "Venus", bodyB: "Saturn", approved: true, exactDateTime: "2026-09-01", orb: 1, headline: "Venus trine Saturn", dateLine: "September 1", body: "Approved Venus aspect." },
  { id: "mars", bodyA: "Mars", bodyB: "Saturn", approved: true, exactDateTime: "2026-08-31", orb: 0, headline: "Mars square Saturn", dateLine: "August 31", body: "Approved Mars aspect." },
  { id: "draft", bodyA: "Venus", bodyB: "Mars", approved: false, exactDateTime: "2026-08-30", orb: 0, headline: "Draft", dateLine: "August 30", body: "Draft." }
];
assert.deepEqual(selectSkyV4Aspects(aspects, { subjectBody: "Venus" }).map((aspect) => aspect.id), ["venus"]);

const baseInput = {
  planet: "venus",
  sign: "aries",
  dateLine: "March 6 to April 1, 2026",
  facts: {},
  contexts: [venusAriesContext],
  aspects
};
const canonical = renderSkyV4ContinuousPreview(corpus, baseInput);
assert.equal(canonical.resolution, "canonical-article");
assert.match(canonical.page, /Venus in Aries/u);
assert.deepEqual(canonical.selectedAspectIds, ["venus"]);

const fallback = renderSkyV4ContinuousPreview(corpus, {
  ...baseInput,
  articleAvailable: false,
  overlaySettings: { includeContextualOverlayInFallbackHook: true }
});
assert.equal(fallback.resolution, "exact-fallback");
assert.equal(fallback.selectedOverlayKeys.length, 1);
assert.match(fallback.page, /Mercury retrograde/u);

const factsOnly = renderSkyV4ContinuousPreview(corpus, {
  ...baseInput,
  articleAvailable: false,
  fallbackAvailable: false,
  aspects: []
});
assert.equal(factsOnly.resolution, "facts-only");
assert.doesNotMatch(factsOnly.page, /## TLDR/u);

const newMoonPreview = renderSkyV4StudioPreview(corpus, {
  contentKey: "sky-lunation/new-moon/gemini",
  draftFields: { NewMoonArticle: `${corpus.content.newMoon.find((row) => row.Sign === "Gemini").NewMoonArticle}\n\nOwner review draft.` }
});
assert.match(newMoonPreview.page, /Owner review draft\.$/u);
assert.equal(newMoonPreview.servingEnabled, false);
assert.throws(() => renderSkyV4StudioPreview(corpus, {
  contentKey: "sky-lunation/new-moon/gemini",
  draftFields: { ContentKey: "changed" }
}), /SKY_V4_STRUCTURE_LOCK/u);

const fullMoonPreview = renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/full-moon/taurus" });
assert.match(fullMoonPreview.page, /Full Moon in Taurus/u);
const eclipsePreview = renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/lunar-eclipse/2025-03-14-virgo" });
assert.match(eclipsePreview.page, /Total Lunar Eclipse/u);
const eclipseFallbackSource = corpus.content.eclipseFallbacks.find((row) => row.EclipseSign === "Virgo" && row.EclipseType === "solar-eclipse" && row.NodeRelation === "south-node");
const eclipseFallbackPreview = renderSkyV4StudioPreview(corpus, {
  contentKey: eclipseFallbackSource.ContentKey,
  draftFields: { Hook: "Draft opening.", Lived: eclipseFallbackSource.Lived, Turn: eclipseFallbackSource.Turn }
});
assert.match(eclipseFallbackPreview.page, /Draft opening\./u);
assert.doesNotMatch(eclipseFallbackPreview.page, new RegExp(eclipseFallbackSource.Hook.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
const nodePreview = renderSkyV4StudioPreview(corpus, { contentKey: "sky-nodes/axis/aries-libra" });
assert.match(nodePreview.page, /North Node in Aries/u);
const lilithPreview = renderSkyV4StudioPreview(corpus, { contentKey: "sky-lilith/article/sagittarius" });
assert.match(lilithPreview.page, /Lilith in Sagittarius/u);

const exactEclipse = corpus.content.eclipseEvents[0];
assert.equal(resolveSkyV4EclipseMainBody(corpus, { exactEventKey: exactEclipse.ContentKey }).resolution, "exact-event");
assert.equal(resolveSkyV4EclipseMainBody(corpus, {
  exactEventKey: "missing", eclipseType: "solar-eclipse", nodeRelation: "south-node", eclipseSign: "virgo"
}).resolution, "sign-aware-fallback");
assert.equal(resolveSkyV4EclipseMainBody(corpus, {
  exactEventKey: "missing", eclipseType: "solar-eclipse", nodeRelation: "south-node", eclipseSign: "virgo",
  signFallbackAvailable: false
}).resolution, "generic-type-node-fallback");
assert.equal(resolveSkyV4EclipseMainBody(corpus, {
  exactEventKey: "missing", eclipseType: "solar-eclipse", nodeRelation: "south-node", eclipseSign: "virgo",
  signFallbackAvailable: false, genericFallbackAvailable: false
}).resolution, "facts-only");
assert.equal(resolveSkyV4Lunation(corpus, { phase: "full-moon", sign: "taurus" }).axis.sunSign, "Scorpio");
assert.equal(resolveSkyV4Lunation(corpus, { phase: "new-moon", sign: "gemini", articleAvailable: false }).resolution, "facts-only");

for (const test of corpus.runtime.retrogradeResolverTests) {
  const body = test["Input body"];
  const sign = test["Input sign"];
  const exactExpected = /exact|chapter/i.test(test["Expected result"]);
  const exactCopy = exactExpected && !["Sun", "Moon", "Lunar Nodes", "Black Moon Lilith"].includes(body)
    ? `Exact governed ${body} ${sign} copy.`
    : "";
  const result = resolveSkyV4Retrograde(corpus, {
    body,
    sign,
    exactCopy,
    stationSupported: body === "Black Moon Lilith"
  });
  if (body === "Sun" || body === "Moon") assert.equal(result.resolution, "omit", test.TestID);
  else if (body === "Lunar Nodes") assert.equal(result.resolution, "node-motion-education", test.TestID);
  else if (body === "Black Moon Lilith") assert.equal(result.resolution, "lilith-station", test.TestID);
  else if (exactCopy) assert.equal(result.resolution, "exact-sign", test.TestID);
  else assert.ok(["generic-body", "omit"].includes(result.resolution), test.TestID);
}

const executedComposition = new Set();
const mark = (...ids) => ids.forEach((id) => executedComposition.add(id));
const tokenOrder = (page, tokens) => {
  let cursor = -1;
  for (const token of tokens) {
    const next = page.indexOf(token, cursor + 1);
    assert.ok(next > cursor, `Expected ${token} after position ${cursor}`);
    cursor = next;
  }
};

for (const [id, planet, sign, hemisphere] of [
  ["C-001", "sun", "aries", "northern"],
  ["C-002", "sun", "cancer", "southern"],
  ["C-003", "sun", "libra", "neutral"]
]) {
  const seasonal = corpus.content.seasonalContext.find((row) => lower(row.Sign) === sign && lower(row.Hemisphere) === hemisphere)?.Copy;
  const page = renderSkyV4ContinuousPreview(corpus, { planet, sign, dateLine: "Engine dates", seasonalContext: seasonal, aspects: [] }).page;
  tokenOrder(page, ["## TLDR", seasonal, continuousArticleFor(corpus, planet, sign).placementArticle]);
  mark(id);
}

for (const [id, body, sign] of [
  ["C-004", "mercury", "cancer"], ["C-005", "mercury", "aries"], ["C-006", "venus", "aries"],
  ["C-007", "mars", "leo"], ["C-008", "jupiter", "virgo"], ["C-009", "saturn", "aries"],
  ["C-010", "uranus", "gemini"], ["C-011", "neptune", "aries"], ["C-012", "pluto", "aquarius"],
  ["C-013", "chiron", "taurus"]
]) {
  const motion = resolveSkyV4Retrograde(corpus, { body, sign, exactCopy: `Exact ${body} ${sign} retrograde chapter.` });
  const page = renderSkyV4ContinuousPreview(corpus, {
    planet: body, sign, dateLine: "Engine dates", aspects: [],
    motionConditions: [{ headline: `${title(body)} retrograde`, dateLine: "Engine station dates", body: motion.body }]
  }).page;
  tokenOrder(page, [continuousArticleFor(corpus, body, sign).placementArticle, "## What is shaping this transit now", motion.body]);
  mark(id);
}

assert.equal(resolveSkyV4Retrograde(corpus, { body: "lilith", sign: "sagittarius", stationSupported: true }).resolution, "lilith-station");
mark("C-014");
assert.equal(resolveSkyV4Lunation(corpus, { phase: "new-moon", sign: "libra" }).resolution, "canonical-lunation");
mark("C-015");
assert.equal(resolveSkyV4Lunation(corpus, { phase: "full-moon", sign: "taurus" }).axis.axis, "Taurus–Scorpio");
mark("C-016");

assert.equal(resolveSkyV4EclipseMainBody(corpus, { exactEventKey: "sky-lunation/solar-eclipse/2025-09-21-virgo" }).resolution, "exact-event");
mark("C-017");
assert.equal(resolveSkyV4EclipseMainBody(corpus, { eclipseType: "solar-eclipse", nodeRelation: "south-node", eclipseSign: "virgo" }).resolution, "sign-aware-fallback");
mark("C-018");
const piscesLunar = corpus.content.eclipseEvents.find((row) => lower(row.Type) === "lunar-eclipse" && lower(row.MoonSign) === "pisces");
assert.equal(resolveSkyV4EclipseMainBody(corpus, { exactEventKey: piscesLunar.ContentKey }).resolution, "exact-event");
mark("C-019");
assert.equal(resolveSkyV4EclipseMainBody(corpus, { eclipseType: "lunar-eclipse", nodeRelation: "north-node", eclipseSign: "pisces" }).resolution, "sign-aware-fallback");
mark("C-020");
assert.match(renderSkyV4StudioPreview(corpus, { contentKey: "sky-nodes/axis/pisces-virgo" }).page, /Pisces–Virgo/u);
mark("C-021");

const eclipseWithConditions = renderSkyV4StudioPreview(corpus, {
  contentKey: exactEclipse.ContentKey,
  motionConditions: [{ headline: "Mercury retrograde", dateLine: "Engine dates", body: "Approved condition." }],
  aspects: [{ id: "event-aspect", bodyA: "Mercury", bodyB: "Saturn", approved: true, exactDateTime: "2026-01-01", orb: 1, headline: "Mercury square Saturn", dateLine: "Engine date", body: "Approved event aspect." }],
  eventContextAspectIds: ["event-aspect"]
}).page;
tokenOrder(eclipseWithConditions, [exactEclipse.EventArticle, "## Other Conditions", "## Key aspects"]);
mark("C-022");
assert.deepEqual(selectSkyV4Aspects([{ id: "unapproved", approved: false, bodyA: "Sun", bodyB: "Moon" }], { subjectBody: "sun" }), []);
mark("C-023");
assert.equal(factsOnly.resolution, "facts-only");
mark("C-024");
assert.equal(canonical.selectedOverlayKeys.length, 1);
mark("C-025");
const fallbackOff = renderSkyV4ContinuousPreview(corpus, { ...baseInput, articleAvailable: false });
assert.doesNotMatch(fallbackOff.page, /Mercury retrograde scrambles the signal/u);
mark("C-026");
assert.match(fallback.page, /Mercury retrograde scrambles the signal/u);
mark("C-027");

const neptuneEclipseOverlay = corpus.content.contextualTransitOverlays.find((row) => lower(row.SubjectBody) === "neptune" && lower(row.ContextKind).includes("eclipse"));
assert.ok(neptuneEclipseOverlay);
const neptuneContext = {
  subjectFamily: neptuneEclipseOverlay.SubjectFamily, subjectBody: neptuneEclipseOverlay.SubjectBody,
  subjectSign: neptuneEclipseOverlay.SubjectSign, subjectCondition: neptuneEclipseOverlay.SubjectCondition,
  contextKind: neptuneEclipseOverlay.ContextKind, contextBodyOrEvent: neptuneEclipseOverlay.ContextBodyOrEvent,
  contextSign: neptuneEclipseOverlay.ContextSign, contextCondition: neptuneEclipseOverlay.ContextCondition
};
assert.equal(resolveSkyV4ContextualOverlays(corpus, [neptuneContext]).length, 1);
mark("C-028");
const lunationOverlay = corpus.content.contextualTransitOverlays.find((row) => lower(row.SubjectFamily) === "lunation" && lower(row.SubjectBody) === "new moon" && lower(row.SubjectSign) === "pisces");
assert.ok(lunationOverlay);
assert.equal(resolveSkyV4ContextualOverlays(corpus, [{
  subjectFamily: lunationOverlay.SubjectFamily, subjectBody: lunationOverlay.SubjectBody,
  subjectSign: lunationOverlay.SubjectSign, subjectCondition: lunationOverlay.SubjectCondition,
  contextKind: lunationOverlay.ContextKind, contextBodyOrEvent: lunationOverlay.ContextBodyOrEvent,
  contextSign: lunationOverlay.ContextSign, contextCondition: lunationOverlay.ContextCondition
}]).length, 1);
mark("C-029");
assert.equal(resolveSkyV4ContextualOverlays(corpus, [venusAriesContext], { contextualTransitOverlaysEnabled: false }).length, 0);
mark("C-030");
assert.equal(executedComposition.size, 30, "All 30 composition scenarios must execute.");

const executedContextual = new Set();
for (const overlay of corpus.content.contextualTransitOverlays) {
  const context = {
    subjectFamily: overlay.SubjectFamily, subjectBody: overlay.SubjectBody, subjectSign: overlay.SubjectSign,
    subjectCondition: overlay.SubjectCondition, contextKind: overlay.ContextKind,
    contextBodyOrEvent: overlay.ContextBodyOrEvent, contextSign: overlay.ContextSign,
    contextCondition: overlay.ContextCondition
  };
  assert.ok(resolveSkyV4ContextualOverlays(corpus, [context]).some((row) => row.OverlayKey === overlay.OverlayKey));
}
for (const id of ["CTX-001", "CTX-002", "CTX-003", "CTX-004", "CTX-005", "CTX-006", "CTX-007", "CTX-008"]) executedContextual.add(id);
assert.equal(resolveSkyV4ContextualOverlays(corpus, [{ ...venusAriesContext, contextBodyOrEvent: "Unreviewed" }]).length, 0);
executedContextual.add("CTX-009");
assert.equal(resolveSkyV4ContextualOverlays(corpus, [venusAriesContext], {}, { exactAspectDuplicateKeys: [matchedOverlays[0].OverlayKey] }).length, 0);
executedContextual.add("CTX-010");
assert.equal(resolveSkyV4ContextualOverlays(corpus, [venusAriesContext], { contextualTransitOverlaysEnabled: false }).length, 0);
executedContextual.add("CTX-011");
const clonedCorpus = structuredClone(corpus);
const baseOverlay = clonedCorpus.content.contextualTransitOverlays.find((row) => row.OverlayKey === matchedOverlays[0].OverlayKey);
baseOverlay.Priority = 30;
clonedCorpus.content.contextualTransitOverlays.push(
  { ...baseOverlay, OverlayKey: `${baseOverlay.OverlayKey}-priority-10`, Priority: 10 },
  { ...baseOverlay, OverlayKey: `${baseOverlay.OverlayKey}-priority-20`, Priority: 20 }
);
const prioritySelection = resolveSkyV4ContextualOverlays(clonedCorpus, [venusAriesContext]);
assert.deepEqual(prioritySelection.map((row) => row.OverlayKey), [
  `${baseOverlay.OverlayKey}-priority-10`, `${baseOverlay.OverlayKey}-priority-20`
]);
const fallbackPrioritySelection = resolveSkyV4ContextualOverlays(
  clonedCorpus, [venusAriesContext], { includeContextualOverlayInFallbackHook: true }, {}, "fallback"
);
assert.deepEqual(fallbackPrioritySelection.map((row) => row.OverlayKey), [`${baseOverlay.OverlayKey}-priority-10`]);
const suppressedPrioritySelection = resolveSkyV4ContextualOverlays(
  clonedCorpus, [venusAriesContext], {}, { exactAspectDuplicateKeys: [`${baseOverlay.OverlayKey}-priority-10`] }
);
assert.deepEqual(suppressedPrioritySelection.map((row) => row.OverlayKey), [
  `${baseOverlay.OverlayKey}-priority-20`, baseOverlay.OverlayKey
]);
executedContextual.add("CTX-012");
assert.equal(executedContextual.size, 12, "All 12 contextual overlay scenarios must execute.");

const newMoonWithCycle = renderSkyV4StudioPreview(corpus, {
  contentKey: "sky-lunation/new-moon/gemini",
  cycleContext: "Approved Gemini lunar-cycle context.",
  aspects: [{
    id: "new-moon-sun-mercury", bodyA: "Sun", bodyB: "Mercury", approved: true,
    exactDateTime: "2026-06-01", orb: 1, headline: "Sun conjunct Mercury",
    dateLine: "June 1, 2026", body: "Approved direct luminary aspect."
  }]
});
tokenOrder(newMoonWithCycle.page, ["## TLDR", "Approved Gemini lunar-cycle context.", "## Key aspects"]);

const fullMoonWithAxis = renderSkyV4StudioPreview(corpus, {
  contentKey: "sky-lunation/full-moon/taurus",
  cycleContext: "Approved Taurus–Scorpio cycle context.",
  aspects: [{
    id: "full-moon-axis", bodyA: "Moon", bodyB: "Sun", approved: true,
    exactDateTime: "2026-11-01", orb: 0, headline: "Moon opposite Sun",
    dateLine: "November 1, 2026", body: "Approved axis aspect."
  }]
});
assert.deepEqual(fullMoonWithAxis.axis, { moonSign: "Taurus", sunSign: "Scorpio", axis: "Taurus–Scorpio" });
assert.match(fullMoonWithAxis.page, /## Key aspects/u);

const exactEclipseParity = renderSkyV4StudioPreview(corpus, {
  contentKey: exactEclipse.ContentKey,
  cycleContext: "Approved eclipse cycle context.",
  eclipseContext: "Approved node and eclipse-series context.",
  motionConditions: [{ headline: "Mercury retrograde", dateLine: "Engine date", body: "Approved condition." }],
  aspects: [{ id: "exact-eclipse-aspect", bodyA: "Moon", bodyB: "Saturn", approved: true, exactDateTime: "2025-03-14", orb: 1, headline: "Moon opposite Saturn", dateLine: "March 14, 2025", body: "Approved eclipse aspect." }]
});
assert.equal(exactEclipseParity.resolution, "exact-event");
tokenOrder(exactEclipseParity.page, [exactEclipse.EventArticle, "Approved eclipse cycle context.", "Approved node and eclipse-series context.", "## Other Conditions", "## Key aspects"]);

const eclipseFallbackParity = renderSkyV4StudioPreview(corpus, {
  contentKey: exactEclipse.ContentKey,
  exactAvailable: false
});
assert.equal(eclipseFallbackParity.resolution, "sign-aware-fallback");

const continuousStacked = renderSkyV4StudioPreview(corpus, {
  contentKey: "sky-placement/article/venus/aries",
  dateLine: "Engine dates",
  contexts: [venusAriesContext],
  motionConditions: [{ headline: "Venus retrograde", dateLine: "Engine station dates", body: "Approved retrograde condition." }],
  aspects
});
tokenOrder(continuousStacked.page, ["## TLDR", matchedOverlays[0].OverlayBody, "## What is shaping this transit now", "## Aspects shaping this transit"]);

const zeroOptional = renderSkyV4StudioPreview(corpus, { contentKey: "sky-lunation/new-moon/gemini" });
assert.doesNotMatch(zeroOptional.page, /## (Other Conditions|Key aspects)/u);

console.log(`SKY V4 canonical stage: PASS (${records.length} records; ${coverage.continuousCount} continuous articles; serving OFF)`);
