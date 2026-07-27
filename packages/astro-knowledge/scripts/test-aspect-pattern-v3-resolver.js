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

function replaceContextPlanets(context, replacements) {
  const replace = (planet) => replacements[planet] ?? planet;
  return {
    ...context,
    members: context.members.map((member) => ({
      ...member,
      planet: replace(member.planet)
    })),
    roles: {
      ...context.roles,
      apex: replace(context.roles.apex),
      focalPlanet: replace(context.roles.focalPlanet),
      opposedTrinePlanet: replace(context.roles.opposedTrinePlanet),
      oppositionAxis: context.roles.oppositionAxis?.map(replace),
      basePlanets: context.roles.basePlanets?.map(replace),
      grandTrinePlanets: context.roles.grandTrinePlanets?.map(replace),
      oppositionAxes: context.roles.oppositionAxes?.map((axis) => axis.map(replace))
    }
  };
}

function sectionBody(copy, sectionId) {
  return copy.content.sections.find((section) => section.id === sectionId)?.body ?? "";
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
  assert.doesNotMatch(
    text,
    /\b(?:Uranus|Neptune|Pluto)\b[^.!?]*\byou need\b/i,
    `${label}: an outer planet must not receive a personal sign-need claim.`
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

for (const [type, expected] of Object.entries({
  t_square: /When those aims pull apart, .+ is where you tend to respond first/,
  grand_square: /One conflict runs between .+; the other runs between/,
  grand_trine: /Those instincts tend to support one another/,
  kite: /The momentum meets its limit when it reaches/,
  mystic_rectangle: /What you learn from one conflict can help with the other/
})) {
  assert.match(
    allCopyText(resolveAspectPatternCopy(withConfidence(contextFor(type, true), "exact"))),
    expected,
    `${type} must render the relationship-level narrative instead of independent placement summaries.`
  );
}

assert.match(
  allCopyText(resolveAspectPatternCopy(contextFor("kite", true))),
  /a form that survives being done differently/,
  "Kite must use the authored focal-demand table value for its real focal planet."
);
assert.match(
  allCopyText(resolveAspectPatternCopy(withConfidence(contextFor("yod", true), "exact"))),
  /The agreement keeps becoming more than you can carry/,
  "Yod must use the authored lived-title value for its real apex planet."
);
{
  const yodText = allCopyText(resolveAspectPatternCopy(withConfidence(contextFor("yod", true), "exact")));
  assert.match(
    yodText,
    /An agreement can look reasonable and still place too much weight on you over time/,
    "Yod must use the authored incomplete-answer sentence for its real apex planet."
  );
  assert.doesNotMatch(
    yodText,
    /keep an easy rhythm|produce a workable first answer|comes back later with the question|together, those instincts can produce a first answer|a yod starts with|marks the part of life where the first answer|reference point falls opposite/i,
    "Yod must not regress to independent placement clauses joined by abstract response glue."
  );
}

{
  const context = contextFor("t_square", true);
  const sourcePlanet = context.roles.oppositionAxis[0];
  const mercury = replaceContextPlanets(context, { [sourcePlanet]: "Mercury" });
  const mars = replaceContextPlanets(context, { [sourcePlanet]: "Mars" });
  const mercuryFeel = sectionBody(resolveAspectPatternCopy(mercury), "feel");
  const marsFeel = sectionBody(resolveAspectPatternCopy(mars), "feel");

  assert.notEqual(
    mercuryFeel,
    marsFeel,
    "The same sign and house in the same member slot must render planet-distinct placement clauses."
  );
  assert.match(mercuryFeel, /Your Mercury in /);
  assert.match(marsFeel, /Your Mars in /);
}

for (const timeKnown of [true, false]) {
  const context = contextFor("yod", timeKnown);
  const [firstBase, secondBase] = context.roles.basePlanets;
  const outerBaseContext = replaceContextPlanets(context, {
    [firstBase]: "Pluto",
    [secondBase]: "Neptune",
    [context.roles.apex]: "Moon"
  });
  const copy = resolveAspectPatternCopy(outerBaseContext);
  const feel = timeKnown ? sectionBody(copy, "feel") : copy.content.overview;

  assert.match(
    feel,
    /(?:Pluto and Neptune|Neptune and Pluto) move slowly/,
    `Yod/${timeKnown ? "known" : "unknown"}: the two outer bases must share one combined background sentence.`
  );
  assert.equal(
    feel.match(/describe a generation/g)?.length,
    1,
    `Yod/${timeKnown ? "known" : "unknown"}: the generation framing must appear exactly once.`
  );
  assert.doesNotMatch(
    feel,
    /\b(?:Pluto|Neptune)\b[^.!?]*\byou need\b/i,
    `Yod/${timeKnown ? "known" : "unknown"}: outer bases must not inherit personal sign needs.`
  );
  if (timeKnown) {
    assert.match(feel, /In your chart,/);

    const marieContext = withConfidence({
      ...outerBaseContext,
      members: outerBaseContext.members.map((member) => ({
        ...member,
        house: member.planet === "Pluto" ? 8 : member.planet === "Neptune" ? 10 : 3,
        longitude: member.planet === "Pluto" ? 214.4 : member.planet === "Neptune" ? 271.5 : 62.5,
        sign: member.planet === "Pluto" ? "scorpio" : member.planet === "Neptune" ? "capricorn" : "gemini"
      }))
    }, "strong");
    assert.equal(
      resolveAspectPatternCopy(marieContext).content.overview,
      "Pluto helps you see what has to change. Neptune helps you keep the future from shrinking to the safest available option. Because the decision affects both shared trust and your reputation, the plan has to work in private as well as it does on paper. Your Moon will not call it settled until you know what you can rely on once the decision is made.",
      "The Marie-style Yod opening should read as one lived decision, not assembled chart components."
    );
  } else {
    assert.doesNotMatch(feel, /\bhouse\b/i);
  }
}

{
  const context = contextFor("yod", true);
  const outerApexContext = replaceContextPlanets(context, {
    [context.roles.apex]: "Pluto"
  });
  const feel = sectionBody(resolveAspectPatternCopy(outerApexContext), "feel");

  assert.match(feel, /Here, Pluto in /, "An outer Yod apex should use its resolved placement behavior.");
  assert.doesNotMatch(feel, /Pluto[^.!?]*you also need/i, "An outer Yod apex must not receive a personal need sentence.");
}
assert.doesNotMatch(
  allCopyText(resolveAspectPatternCopy(contextFor("kite", true))),
  /a form that survives being done differently\s+(?:for|around|with room for|involving)\b/i,
  "Kite table clauses must render verbatim without appended role or house tails."
);
assert.equal(
  allCopyText(resolveAspectPatternCopy(contextFor("kite", true)))
    .match(/a form that survives being done differently/g)?.length,
  1,
  "Kite must not repeat its focal demand across the overview and lived paragraph."
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

console.log("Aspect-pattern v3.5 resolver tests passed.");
