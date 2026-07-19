"use strict";

const {
  buildAspectPatternActivationInterpretationContexts,
  buildAspectPatternInterpretationContexts,
  buildPatternActivations,
  detectPatterns,
  rankAspectPatterns
} = require("../engine/aspect-patterns");
const { fixtures } = require("../engine/aspect-patterns/fixtures");

const calculatedFor = "2026-07-19T12:00:00.000Z";

function rankedDetection(fixture) {
  const detection = detectPatterns(fixture);
  const ranked = {
    ...detection,
    ranking: rankAspectPatterns(detection, {
      planets: fixture.planets,
      ascendantSign: "aries"
    })
  };
  return {
    ...ranked,
    interpretationContexts: buildAspectPatternInterpretationContexts(ranked, {
      planets: fixture.planets,
      ascendantSign: "aries"
    })
  };
}

function activationFixture(id, fixture, transitAspects) {
  const detection = rankedDetection(fixture);
  const activation = buildPatternActivations(detection, transitAspects, { calculatedFor });
  return {
    id,
    patternIds: detection.patterns.map((pattern) => ({
      id: pattern.id,
      type: pattern.type,
      planets: pattern.planets
    })),
    activation: {
      ...activation,
      interpretationContexts: buildAspectPatternActivationInterpretationContexts({ ...detection, activation })
    }
  };
}

const output = [
  activationFixture("grand-square-shared-moon", fixtures.grand_square, [
    {
      id: "transit.saturn.square.moon",
      movingBody: "saturn",
      targetNatalPlanet: "moon",
      aspectType: "square",
      orb: 0.5,
      applying: true,
      exactAt: "2026-07-19T18:00:00.000Z"
    }
  ]),
  activationFixture("kite-underlying-grand-trine", fixtures.kite, [
    {
      id: "transit.sun.trine.mars",
      movingBody: "sun",
      targetNatalPlanet: "mars",
      aspectType: "trine",
      orb: 1,
      applying: false
    }
  ])
];

console.log(JSON.stringify(output, null, 2));
