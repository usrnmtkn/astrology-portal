"use strict";

const assert = require("node:assert/strict");
const {
  PLANET_IDS,
  buildAspectPatternInterpretationContexts,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternCopies,
  resolveAspectPatternCopy
} = require("../engine/aspect-patterns");
const realFixtures = require("../engine/aspect-patterns/fixtures/real");

const CASES = Object.freeze({
  t_square: "isolated-t-square-a",
  grand_square: "grand-square-a",
  grand_trine: "grand-trine-a",
  kite: "kite-a",
  yod: "yod-wide-a",
  mystic_rectangle: "mystic-rectangle-a"
});

function planetsWithHouses(planets) {
  return planets.map((planet) => ({
    ...planet,
    house: Math.floor(planet.longitude / 30) + 1
  }));
}

function contextsFor(fixtureName, timeKnown = true, extraContext = {}) {
  const fixture = realFixtures[fixtureName];
  const planets = timeKnown
    ? planetsWithHouses(fixture.input.planets)
    : fixture.input.planets.map(({ house, ...planet }) => planet);
  const detection = detectPatterns({
    planets,
    aspects: fixture.input.aspects
  });
  const rankingContext = { planets };
  const ranking = rankAspectPatterns(detection, rankingContext);
  return buildAspectPatternInterpretationContexts(
    { ...detection, ranking },
    { ...rankingContext, ...extraContext }
  );
}

function contextFor(type, timeKnown = true) {
  const contexts = contextsFor(CASES[type], timeKnown);
  const context = contexts.find((candidate) => candidate.patternType === type);
  assert.ok(context, `Missing ${type} context from ${CASES[type]}.`);
  return context;
}

function withConfidence(context, confidence) {
  return {
    ...context,
    geometry: {
      ...context.geometry,
      confidence
    }
  };
}

function allCopyText(copy) {
  return [
    copy.content.eyebrow,
    copy.content.headline,
    copy.content.overview,
    ...copy.content.sections.flatMap((section) => [section.title, section.body])
  ].filter(Boolean).join(" ");
}

function assertCleanResolvedCopy(copy, label) {
  const text = allCopyText(copy);
  assert.equal(copy.source.contentLevel, "source_grounded_template", `${label}: wrong content level.`);
  assert.equal(copy.source.resolverVersion, "v3", `${label}: wrong resolver version.`);
  assert.equal(copy.diagnostics.usedFallback, false, `${label}: fallback copy must stay off.`);
  assert.doesNotMatch(text, /\{[^}]+\}/, `${label}: unresolved token.`);
  assert.doesNotMatch(text, /\bundefined\b|\bnull\b/, `${label}: missing value leaked.`);
  assert.doesNotMatch(text, /\.\s+[a-z]/, `${label}: sentence continuation is not capitalized.`);
  assert.doesNotMatch(text, /\s[.,;:]/, `${label}: space before punctuation.`);
  assert.doesNotMatch(text, /[.,;:]{2,}/, `${label}: doubled punctuation.`);
  assert.doesNotMatch(text, /\b(emergency|temporary fallback|madlib)\b/i, `${label}: fallback boilerplate leaked.`);
  assert.doesNotMatch(
    text,
    /\bmoves through\b.+\bin (?:a|an) .+ way:/i,
    `${label}: decorated sign-house scaffold leaked.`
  );
  assert.doesNotMatch(
    text,
    /\b(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)(?:\s+in\s+the\s+\d+(?:st|nd|rd|th)\s+house(?:\s+of\s+[^.,;]+)?)?\s+can need\b/i,
    `${label}: hedged “can need” placement clause leaked.`
  );
  assert.doesNotMatch(
    text,
    /\b(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto)(?:\s+in\s+the\s+\d+(?:st|nd|rd|th)\s+house(?:\s+of\s+[^.,;]+)?)?\s+can\b[^.!?]*\b(?:yourself|yourselves)\b/i,
    `${label}: hedged placement clause contains a second-person reflexive.`
  );
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    if (/\bbetween\b/i.test(sentence)) {
      assert.ok(sentence.split(",").length - 1 <= 4, `${label}: comma pileup in joined pair.`);
    }
    const joinedSubject = sentence.match(/\btie\b(.+?)\binto one pattern\b/i)?.[1];
    if (joinedSubject) {
      const commaCount = joinedSubject.split(",").length - 1;
      assert.ok(commaCount <= 3, `${label}: comma pileup in joined subject (${commaCount}): ${sentence}`);
    }
  }
}

assert.deepEqual(
  PLANET_IDS,
  ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto"],
  "The primary detector must remain locked to exactly 10 planets."
);
assert.ok(!PLANET_IDS.includes("chiron"), "Chiron must remain secondary and must not create a primary pattern.");

for (const type of Object.keys(CASES)) {
  const knownBase = contextFor(type, true);
  const unknownBase = contextFor(type, false);
  const knownByConfidence = new Map();
  const unknownByConfidence = new Map();

  for (const confidence of ["exact", "strong", "wide", "partial"]) {
    const known = resolveAspectPatternCopy(withConfidence(knownBase, confidence));
    const unknown = resolveAspectPatternCopy(withConfidence(unknownBase, confidence));
    knownByConfidence.set(confidence, known);
    unknownByConfidence.set(confidence, unknown);
    assertCleanResolvedCopy(known, `${type}/${confidence}/known`);
    assertCleanResolvedCopy(unknown, `${type}/${confidence}/unknown`);

    if (confidence !== "partial") {
      assert.match(allCopyText(known), /\bhouse\b/i, `${type}/${confidence}: known-time copy must use houses.`);
    }
    assert.doesNotMatch(allCopyText(unknown), /\bhouse\b/i, `${type}/${confidence}: unknown-time copy must stay house-free.`);
  }

  assert.equal(
    knownByConfidence.get("strong").content.headline,
    knownByConfidence.get("exact").content.headline,
    `${type}: strong must reuse the exact title verbatim.`
  );
  assert.equal(
    knownByConfidence.get("strong").content.overview,
    knownByConfidence.get("exact").content.overview,
    `${type}: strong must reuse the exact opening verbatim.`
  );
  assert.notEqual(
    knownByConfidence.get("wide").content.headline,
    knownByConfidence.get("exact").content.headline,
    `${type}: wide must use its authored wide title.`
  );
  assert.deepEqual(
    knownByConfidence.get("partial").content.sections.map((section) => section.id),
    ["level_2", "confidence_note"],
    `${type}: partial must render only its abbreviated L1/L2 bodies and reading note.`
  );
}

assert.match(
  allCopyText(resolveAspectPatternCopy(contextFor("kite", true))),
  /a form that survives being done differently/,
  "Kite must use the authored focal-demand table value for its real focal planet."
);
assert.match(
  allCopyText(resolveAspectPatternCopy(withConfidence(contextFor("yod", true), "exact"))),
  /consequences that are harder to smooth over/,
  "Yod must use the authored apex-pressure table value for its real apex planet."
);
assert.doesNotMatch(
  allCopyText(resolveAspectPatternCopy(withConfidence(contextFor("yod", true), "exact"))),
  /consequences that are harder to smooth over\s+(?:for|around|with room for|involving)\b/i,
  "Yod table clauses must render verbatim without appended role or house tails."
);
assert.doesNotMatch(
  allCopyText(resolveAspectPatternCopy(contextFor("kite", true))),
  /a form that survives being done differently\s+(?:for|around|with room for|involving)\b/i,
  "Kite table clauses must render verbatim without appended role or house tails."
);

{
  const exactContexts = contextsFor("kite-a", true);
  const kite = exactContexts.find((context) => context.patternType === "kite");
  const grandTrine = exactContexts.find((context) => context.patternType === "grand_trine");
  assert.ok(kite && grandTrine);
  assert.equal(grandTrine.display.isSuppressed, true, "An exact/strong Kite must suppress its contained Grand Trine.");
  assert.deepEqual(resolveAspectPatternCopies(exactContexts).map((copy) => copy.patternId), [kite.patternId]);

  const detection = detectPatterns({
    planets: planetsWithHouses(realFixtures["kite-a"].input.planets),
    aspects: realFixtures["kite-a"].input.aspects
  });
  const parent = detection.patterns.find((pattern) => pattern.type === "kite");
  const child = detection.patterns.find((pattern) => pattern.type === "grand_trine");
  parent.geometry.confidence = "wide";
  child.geometry.confidence = "exact";
  const planets = planetsWithHouses(realFixtures["kite-a"].input.planets);
  const ranking = rankAspectPatterns(detection, { planets });
  const contexts = buildAspectPatternInterpretationContexts({ ...detection, ranking }, { planets });
  const wideKite = contexts.find((context) => context.patternId === parent.id);
  const exactTrine = contexts.find((context) => context.patternId === child.id);
  assert.equal(exactTrine.display.isSuppressed, false);
  assert.equal(exactTrine.display.isContained, false);
  assert.ok(exactTrine.display.rank < wideKite.display.rank, "An exact contained pattern must lead a wide parent.");
  assert.deepEqual(
    new Set(resolveAspectPatternCopies(contexts).map((copy) => copy.patternId)),
    new Set([parent.id, child.id]),
    "A wide parent must not suppress an exact contained pattern."
  );
}

{
  const baseContexts = contextsFor("yod-wide-a", false);
  const yod = baseContexts.find((context) => context.patternType === "yod");
  assert.ok(yod.members.some((member) => member.planet === "moon"));
  const contexts = contextsFor("yod-wide-a", false, {
    moonTimeUncertainty: [{
      patternId: yod.patternId,
      qualifyingStart: "10:00",
      qualifyingEnd: "14:00"
    }]
  });
  const uncertain = contexts.find((context) => context.patternId === yod.patternId);
  assert.equal(uncertain.display.isWithheldForMoonTimeUncertainty, true);
  assert.equal(uncertain.display.moonTimeUncertainty.status, "uncertain");
  assert.ok(
    !resolveAspectPatternCopies(contexts).some((copy) => copy.patternId === yod.patternId),
    "Moon-time-uncertain patterns must be retained in context but withheld from reader copy."
  );
}

console.log("Aspect-pattern v3.3 resolver tests passed.");
