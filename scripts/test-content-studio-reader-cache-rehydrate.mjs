#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync("apps/web/src/App.tsx", "utf8");
const signal = fs.readFileSync("apps/web/src/services/contentUpdateSignal.ts", "utf8");

assert.match(app, /subscribeToContentUpdates\(\(\) => \{[\s\S]{0,500}setContentRefreshVersion\(\(version\) => version \+ 1\)/u,
  "Open reader tabs must react to Content Studio update broadcasts.");

for (const [label, loader] of [
  ["planet/sign vocabulary", "loadPlanetTopicVocabulary"],
  ["natal card taglines", "loadNatalCardTaglines"]
]) {
  const pattern = new RegExp(`useEffect\\(\\(\\) => \\{[\\s\\S]{0,900}${loader}\\(\\)[\\s\\S]{0,900}\\}, \\[contentRefreshVersion\\]\\);`, "u");
  assert.match(app, pattern, `${label} must rehydrate after Content Studio content updates.`);
}

assert.match(signal, /clearPlanetTopicVocabularyCache\(\)/u);
assert.match(signal, /clearNatalCardTaglineCache\(\)/u);
console.log("Content Studio reader cache rehydrate contract passed.");
