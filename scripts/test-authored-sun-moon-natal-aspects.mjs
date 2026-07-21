#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const aspectDir = path.join(repoRoot, "packages/astro-knowledge/data/insights/natal-aspects");

const authoredRecords = {
  "sun-conjunction-moon": {
    title: "Sun Conjunct Moon",
    aspect: "conjunction",
    body:
      "You commit with everything or not at all. Your Sun conjunct Moon means your head and your heart move as one, so when you want something, all of you wants it. The blind spot? When every part of you agrees, no one's left to ask the hard questions. Keep honest people close. Let them push back.",
  },
  "sun-sextile-moon": {
    title: "Sun Sextile Moon",
    aspect: "sextile",
    body:
      "What you want and what you need are on speaking terms. Your Sun sextile Moon gives you an inner stability most people have to work for. Don't let it sit unused. When a big decision shows up, check your logic, then check your gut. For you, they'll usually agree. That agreement is your green light.",
  },
  "sun-square-moon": {
    title: "Sun Square Moon",
    aspect: "square",
    body:
      "Part of you wants one thing. Another part needs something else entirely. Your Sun square Moon keeps your will and your feelings in constant negotiation: restlessness, second-guessing, choosing a path and then mourning the one you didn't take. This isn't a flaw, it's friction. And friction is how you grow. Be patient with yourself.",
  },
  "sun-trine-moon": {
    title: "Sun Trine Moon",
    aspect: "trine",
    body:
      "You're comfortable in your own skin, and people can feel it. Your Sun trine Moon means what you want and what you need rarely argue. That's real stability, and it's rarer than you think. The only trap is comfort itself: when peace comes this easily, you can coast right past the experiences that stretch you. Choose growth anyway.",
  },
  "sun-opposition-moon": {
    title: "Sun Opposite Moon",
    aspect: "opposition",
    body:
      "You're pulled between your own direction and the people you love. Choose yourself, the guilt creeps in. Choose them, the resentment builds. Your Sun opposite Moon isn't asking you to pick a side, it's asking you to stop believing you have to. Closeness doesn't require losing yourself. Independence doesn't require distance. Hold both.",
  },
  "sun-quincunx-moon": {
    title: "Sun Quincunx Moon",
    aspect: "quincunx",
    body:
      "You get what you were chasing and it still doesn't land. Your Sun quincunx Moon puts your wants and your needs on different schedules, so the win arrives before the feeling catches up. Working harder won't fix it. Before you commit, ask the quieter question: will this actually feel good, or just look right?",
  },
};

const mechanicalFallbackPatterns = [
  /a need to be seen and to matter/i,
  /deep feelings and a strong need to feel safe/i,
  /source-backed/i,
  /fusion between/i,
  /this aspect creates/i,
  /giving .* a clear place/i,
  /generic/i,
];

for (const [id, expected] of Object.entries(authoredRecords)) {
  const filePath = path.join(aspectDir, `${id}.json`);
  const record = JSON.parse(fs.readFileSync(filePath, "utf8"));

  assert.equal(record.id, id, `${id} should keep its canonical id`);
  assert.equal(record.kind, "natal-aspect", `${id} should stay a natal-aspect record`);
  assert.equal(record.displayTitle, expected.title, `${id} should keep the authored display title`);
  assert.equal(record.body, expected.body, `${id} should keep the approved authored body copy`);
  assert.equal(record.status, "SOURCE_BACKED", `${id} should be marked source-backed`);
  assert.equal(record.voiceNeutral, true, `${id} should remain reader-safe voice-neutral copy`);
  assert.deepEqual(
    record.sourceFactors,
    [{ type: "natal-aspect", planetA: "sun", aspect: expected.aspect, planetB: "moon" }],
    `${id} should declare the exact Sun-Moon aspect source factor`,
  );

  for (const pattern of mechanicalFallbackPatterns) {
    assert.doesNotMatch(record.body, pattern, `${id} should not regress to mechanical fallback language`);
  }
}

console.log("Authored Sun-Moon natal aspect copy passed.");
