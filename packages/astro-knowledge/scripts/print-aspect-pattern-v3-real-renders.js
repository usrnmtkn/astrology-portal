"use strict";

const {
  buildAspectPatternInterpretationContexts,
  detectPatterns,
  rankAspectPatterns,
  resolveAspectPatternCopy
} = require("../engine/aspect-patterns");
const realFixtures = require("../engine/aspect-patterns/fixtures/real");

const CASES = Object.freeze({
  "T-square": ["isolated-t-square-a", "t_square"],
  "Grand Cross": ["grand-square-a", "grand_square"],
  "Grand Trine": ["grand-trine-a", "grand_trine"],
  "Kite": ["kite-a", "kite"],
  "Yod": ["yod-wide-a", "yod"],
  "Mystic Rectangle": ["mystic-rectangle-a", "mystic_rectangle"]
});

function contextsFor(fixtureName, timeKnown) {
  const fixture = realFixtures[fixtureName];
  const planets = fixture.input.planets.map((planet) => timeKnown
    ? { ...planet, house: Math.floor(planet.longitude / 30) + 1 }
    : { ...planet });
  const detection = detectPatterns({ planets, aspects: fixture.input.aspects });
  const ranking = rankAspectPatterns(detection, { planets });
  return buildAspectPatternInterpretationContexts({ ...detection, ranking }, { planets });
}

function renderCard(copy) {
  const output = [
    `#### ${copy.content.headline}`,
    "",
    copy.content.overview,
    ""
  ];
  for (const section of copy.content.sections) {
    output.push(`**${section.title || section.id}**`);
    output.push("");
    output.push(section.body);
    output.push("");
  }
  return output.join("\n").trim();
}

const output = [
  "# Aspect-pattern v3.5 real-chart render audit",
  "",
  "De-identified calculated real-chart fixtures. Every pattern is rendered at exact, wide, and partial confidence with known and unknown birth time.",
  ""
];

for (const [name, [fixtureName, type]] of Object.entries(CASES)) {
  output.push(`## ${name}`);
  output.push("");
  for (const confidence of ["exact", "wide", "partial"]) {
    for (const [timeLabel, timeKnown] of [["Known time", true], ["Unknown time", false]]) {
      const context = contextsFor(fixtureName, timeKnown).find((candidate) => candidate.patternType === type);
      const copy = resolveAspectPatternCopy({
        ...context,
        geometry: { ...context.geometry, confidence }
      });
      output.push(`### ${confidence} - ${timeLabel}`);
      output.push("");
      output.push(renderCard(copy));
      output.push("");
    }
  }
}

console.log(output.join("\n").trim());
