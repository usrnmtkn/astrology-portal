#!/usr/bin/env node

const assert = require("node:assert/strict");
const path = require("node:path");
const {
  isAllowedLiteralBannedVoiceUse,
  listStringFields,
  readJson,
  validateAll
} = require("./validate.js");

const root = path.resolve(__dirname, "..");
const approvedLiteralUses = [
  ["data/synastry/aspects/A-mercury_B-neptune_trine.json", "tension"],
  ["data/synastry/aspects/A-neptune_B-mercury_trine.json", "tension"],
  ["data/modifiers/nodal-axis-timing-framework.json", "classes.transitingNodeContacts.planets.neptune.examples[2]"],
  ["data/transits/mercury-conjunction-uranus.json", "readerCopy.body"],
  ["data/transits/mercury-square-pluto.json", "readerCopy.summary"],
  ["data/transits/mercury-square-pluto.json", "readerCopy.body"]
];

for (const [relativeFilePath, fieldPath] of approvedLiteralUses) {
  const json = readJson(path.join(root, relativeFilePath));
  const field = listStringFields(json).find((entry) => entry.fieldPath === fieldPath);
  assert(field, `${relativeFilePath}:${fieldPath} must exist`);
  assert.equal(
    isAllowedLiteralBannedVoiceUse(relativeFilePath, fieldPath, field.value),
    true,
    `${relativeFilePath}:${fieldPath} must match the exact approved literal use`
  );
  assert.equal(
    isAllowedLiteralBannedVoiceUse(relativeFilePath, fieldPath, `${field.value} Another leak.`),
    false,
    `${relativeFilePath}:${fieldPath} must fail closed when its wording changes`
  );
  assert.equal(
    isAllowedLiteralBannedVoiceUse(relativeFilePath, `${fieldPath}.extra`, field.value),
    false,
    `${relativeFilePath}:${fieldPath} must not authorize another field`
  );
}

const validationErrors = validateAll();
assert.equal(
  validationErrors.some((error) => error.includes("stale banned-voice literal-use allowlist entry")),
  false,
  "all six approved literal-use entries must remain current and contain their banned term"
);
for (const [relativeFilePath] of approvedLiteralUses) {
  assert.equal(
    validationErrors.some((error) => error.startsWith(`${relativeFilePath}: contains banned voice term`)),
    false,
    `${relativeFilePath} must pass only for its exact approved literal-use fields`
  );
}

console.log("Literal banned-voice allowlist passed: 6 exact file/field/value entries; changed wording and new fields fail closed.");
