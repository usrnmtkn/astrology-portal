#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import { templateVariableReferences } from "../apps/admin/src/templateVariableReference.ts";
import { templateVariableSourceCandidates } from "../apps/admin/src/templateVariableSources.ts";

const bodyYou = "{{#planetIntro}}{{planetIntro}}{{/planetIntro}} {{possessive}} {{planetTitle}} is in {{signTitle}}, meaning you {{planetVerb}} {{signAdverb}}.{{#modifierSentences}} {{.}}{{/modifierSentences}}";
const bodyThey = "{{possessive}} {{planetTitle}} is in {{signTitle}}, meaning they {{planetVerb}} {{signAdverb}}.";

const references = templateVariableReferences({ body_you: bodyYou, body_they: bodyThey }, {
  requiredSlots: ["possessive", "planetTitle", "signTitle", "planetVerb", "signAdverb"],
  optionalSlots: ["planetIntro", "modifierSentences"],
  body_you: bodyYou,
  body_they: bodyThey
});

assert.deepEqual(
  references.filter((reference) => reference.requirement === "Required").map((reference) => reference.name),
  ["planetTitle", "planetVerb", "possessive", "signAdverb", "signTitle"],
  "Required runtime values should be grouped and alphabetized."
);

assert.equal(references.find((reference) => reference.name === "planetIntro")?.requirement, "Optional");
assert.match(references.find((reference) => reference.name === "planetIntro")?.meaning ?? "", /introductory sentences/u);
assert.match(references.find((reference) => reference.name === "planetVerb")?.meaning ?? "", /base-form action/u);
assert.match(references.find((reference) => reference.name === "modifierSentences")?.meaning ?? "", /\{\{\.\}\}/u);
assert.equal(references.some((reference) => reference.name === "."), false, "The list-item token is syntax, not a standalone runtime variable.");
assert.equal(new Set(references.map((reference) => reference.name)).size, references.length, "Each runtime variable should appear once even when used in both voices.");
assert.ok(references.find((reference) => reference.name === "planetTitle")?.fields.includes("body_you"));
assert.ok(references.find((reference) => reference.name === "planetTitle")?.fields.includes("body_they"));
assert.equal(references.find((reference) => reference.name === "planetTitle")?.sourceKind, "runtime");
assert.equal(references.find((reference) => reference.name === "planetVerb")?.sourceKind, "saved-copy");

const sourceRows = [
  { id: "sun-verb", content_key: "fallback-vocab/planet-verb/sun" },
  { id: "moon-verb", content_key: "fallback-vocab/planet-verb/moon" },
  { id: "leo-adverb", content_key: "fallback-vocab/sign-adverb/leo" },
  { id: "jupiter-aries", content_key: "fallback-hook/placement-sentence/jupiter/aries" },
  { id: "jupiter-leo", content_key: "fallback-hook/placement-sentence/jupiter/leo" },
  { id: "mars-leo", content_key: "fallback-hook/placement-sentence/mars/leo" }
];
const planetVerbReference = references.find((reference) => reference.name === "planetVerb");
assert.ok(planetVerbReference);
assert.deepEqual(
  templateVariableSourceCandidates(planetVerbReference, sourceRows, "fallback-template/natal.planet-in-sign/sun").map((row) => row.id),
  ["sun-verb"],
  "A planet-specific template should link to the matching planet vocabulary row."
);
const placementReference = templateVariableReferences({ body: "{{placementSentences}}" })[0];
assert.deepEqual(
  templateVariableSourceCandidates(placementReference, sourceRows, "fallback-template/natal.planet-in-sign/jupiter").map((row) => row.id),
  ["jupiter-aries", "jupiter-leo"],
  "A specialized template should show every saved placement row for its planet."
);
const runtimeReference = references.find((reference) => reference.name === "planetTitle");
assert.ok(runtimeReference);
assert.deepEqual(templateVariableSourceCandidates(runtimeReference, sourceRows, "fallback-template/natal.planet-in-sign/sun"), []);

const unknownReference = templateVariableReferences({ body: "Visible from {{customTransitDate}}." })[0];
assert.equal(unknownReference.name, "customTransitDate");
assert.match(unknownReference.meaning, /calculated custom transit date/u);
assert.equal(unknownReference.source, "Calculated runtime fact");

const templatePackage = JSON.parse(fs.readFileSync(
  new URL("../apps/web/src/content/fallbackArchitectureV3/templates/fallback-templates-v3.json", import.meta.url),
  "utf8"
));
const packageReferences = new Map(templatePackage.templates.flatMap((template) => (
  templateVariableReferences({}, template).map((reference) => [reference.name, reference])
)));
const genericPackageReferences = [...packageReferences.values()].filter((reference) => (
  reference.source === "Runtime resolver" || reference.source === "Calculated runtime fact"
));
assert.equal(packageReferences.size, 72, "The variable guide should cover every variable in the current fallback template package.");
assert.deepEqual(genericPackageReferences, [], "Every packaged template variable should have a specific editorial definition, example, and source.");

console.log(`Admin template variable reference tests passed (${packageReferences.size} packaged variables documented).`);
