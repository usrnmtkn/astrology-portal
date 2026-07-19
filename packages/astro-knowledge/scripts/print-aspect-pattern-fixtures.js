"use strict";

const { detectPatterns } = require("../engine/aspect-patterns");
const { fixtures } = require("../engine/aspect-patterns/fixtures");

const fixtureName = process.argv[2];
const names = fixtureName ? [fixtureName] : Object.keys(fixtures).sort();

const output = {};
for (const name of names) {
  if (!fixtures[name]) {
    throw new Error(`Unknown aspect-pattern fixture: ${name}`);
  }
  output[name] = detectPatterns(fixtures[name]);
}

console.log(JSON.stringify(output, null, 2));
