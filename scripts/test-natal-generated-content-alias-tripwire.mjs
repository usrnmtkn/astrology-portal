#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";

import { equivalentAstroContentKeys } from "../apps/web/src/content/keyAliases.ts";

const appSource = fs.readFileSync("apps/web/src/App.tsx", "utf8");

function functionBody(source, functionName) {
  const signatureStart = source.indexOf(`function ${functionName}(`);
  assert.notEqual(signatureStart, -1, `${functionName} must remain an explicit natal-content boundary.`);

  const bodyStart = source.indexOf("{", signatureStart);
  assert.notEqual(bodyStart, -1, `${functionName} must have a function body.`);

  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(bodyStart + 1, index);
  }

  assert.fail(`${functionName} has an unterminated function body.`);
}

const aliasProbe = equivalentAstroContentKeys("natal.aspect.sun.square.moon");
const aliasesNatalAspects = aliasProbe.some((key) => key.startsWith("natal.") || key.startsWith("natal-"));
const aliasesSkyAspects = aliasProbe.some((key) => key.startsWith("sky.") || key.startsWith("sky-"));
const aliasesTransitAspects = aliasProbe.some((key) => key.startsWith("transit.") || key.startsWith("transit-"));
const aspectKeyspacesStillAliased = aliasesNatalAspects && aliasesSkyAspects && aliasesTransitAspects;

const generatedNatalBody = functionBody(appSource, "generatedNatalAspectSection")
  .replace(/\/\/.*$/gmu, "")
  .replace(/\s+/gu, " ")
  .trim();
const generatedNatalContentStoreEnabled = generatedNatalBody !== "void aspect; void generatedContent; return null;";

function assertAliasSafety(storeEnabled, keyspacesAliased) {
  assert.equal(
    storeEnabled && keyspacesAliased,
    false,
    "Generated natal content must stay disabled while natal, Sky, and transit aspect keys share aliases. Separate the keyspaces before enabling the store."
  );
}

assert.equal(
  aspectKeyspacesStillAliased,
  true,
  "Tripwire assumptions changed: remove this guard only after natal, Sky, and transit aspect keyspaces are demonstrably separate."
);
assert.throws(
  () => assertAliasSafety(true, true),
  /Generated natal content must stay disabled/u,
  "The tripwire must prove that enabling the store with the current aliases fails."
);
assert.doesNotThrow(() => assertAliasSafety(generatedNatalContentStoreEnabled, aspectKeyspacesStillAliased));

console.log("Generated natal content alias tripwire passed (store disabled; cross-surface aspect aliases still present).");
