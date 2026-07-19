"use strict";

const {
  buildAspectPatternInterpretationContexts,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternCopies
} = require("../engine/aspect-patterns");
const { fixtures } = require("../engine/aspect-patterns/fixtures");

const fixtureName = process.argv[2];
const names = fixtureName ? [fixtureName] : Object.keys(fixtures).sort();

const output = {};
for (const name of names) {
  if (!fixtures[name]) {
    throw new Error(`Unknown aspect-pattern fixture: ${name}`);
  }
  const detection = detectPatterns(fixtures[name]);
  const rankingContext = {
    planets: fixtures[name].planets,
    ascendantSign: "aries",
    ascendantLongitude: 0,
    midheavenLongitude: 270
  };
  const rankedDetection = {
    ...detection,
    ranking: rankAspectPatterns(detection, rankingContext)
  };
  const interpretationContexts = buildAspectPatternInterpretationContexts(rankedDetection, rankingContext);
  output[name] = {
    ...rankedDetection,
    interpretationContexts,
    resolvedCopy: resolveAspectPatternCopies(interpretationContexts)
  };
}

console.log(JSON.stringify(output, null, 2));
