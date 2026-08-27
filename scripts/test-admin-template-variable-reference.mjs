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
  { id: "mars-leo", content_key: "fallback-hook/placement-sentence/mars/leo" },
  { id: "placement-gerund", content_key: "fallback-vocab/placement-gerund/jupiter/leo/0" },
  { id: "compat-domain", content_key: "fallback-hook/compat-domain/venus" },
  { id: "transit-type", content_key: "fallback-hook/transit-aspect-type/square" },
  { id: "transit-effect", content_key: "fallback-hook/transit-effect-hard/saturn/mars" },
  { id: "saturn-topic", content_key: "fallback-vocab/planet-topic/saturn" },
  { id: "venus-topic", content_key: "fallback-vocab/planet-topic/venus" },
  { id: "venus-natal-core", content_key: "fallback-hook/natal-core/venus" },
  { id: "venus-planet-core", content_key: "fallback-vocab/planet-core/venus" },
  { id: "ascendant-area", content_key: "fallback-vocab/angle-area/ascendant" },
  { id: "planet-mode", content_key: "fallback-hook/planet-mode/venus" },
  { id: "planet-ask", content_key: "fallback-vocab/planet-ask/venus" },
  { id: "planet-grates", content_key: "fallback-hook/planet-grates/venus" },
  { id: "planet-scene", content_key: "fallback-vocab/planet-scene/venus" },
  { id: "node-direction", content_key: "fallback-vocab/node-direction/aquarius" },
  { id: "retro-meaning", content_key: "fallback-hook/transit-retro/mercury" },
  { id: "sky-sign-copy", content_key: "fallback-hook/sky-sign-copy/jupiter/leo" },
  { id: "sky-window", content_key: "fallback-hook/sky-placement/jupiter" },
  { id: "sky-aspect", content_key: "fallback-hook/sky-aspect-exact/jupiter/trine/saturn" },
  { id: "sky-planet-frame", content_key: "fallback-hook/sky-placement-frame/jupiter" },
  { id: "sky-sign-lore", content_key: "fallback-hook/sky-placement-lore/leo" }
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

const transitDependencies = templateVariableReferences({}, {
  requiredSlots: ["transitTopic", "natalCore"]
});
assert.deepEqual(transitDependencies.map((reference) => reference.name), ["natalCore", "transitTopic"], "Declared resolver dependencies should appear even when consumed inside another phrase.");
assert.ok(transitDependencies.every((reference) => reference.sourceKind === "saved-copy"), "Resolver-selected vocabulary should remain editable saved writing.");
assert.deepEqual(
  templateVariableSourceCandidates(transitDependencies.find((reference) => reference.name === "transitTopic"), sourceRows, "fallback-template/transit.aspect").map((row) => row.id),
  ["saturn-topic", "venus-topic"]
);
assert.deepEqual(
  templateVariableSourceCandidates(transitDependencies.find((reference) => reference.name === "natalCore"), sourceRows, "fallback-template/transit.aspect").map((row) => row.id),
  ["venus-natal-core", "venus-planet-core"]
);

const mappedSourceSlots = {
  placementGerundText: "placement-gerund",
  compatDomain: "compat-domain",
  transitTypeLine: "transit-type",
  transitEffectLine: "transit-effect",
  retroMeaning: "retro-meaning",
  signCopy: "sky-sign-copy",
  windowFrame: "sky-window",
  currentAspects: "sky-aspect",
  planetFrame: "sky-planet-frame",
  signLore: "sky-sign-lore",
  modeA: "planet-mode",
  askB: "planet-ask",
  gratesA: "planet-grates",
  sceneB: "planet-scene",
  oppositeDirection: "node-direction"
};
for (const [slot, expectedId] of Object.entries(mappedSourceSlots)) {
  const reference = templateVariableReferences({ body: `{{${slot}}}` })[0];
  assert.ok(
    templateVariableSourceCandidates(reference, sourceRows, "fallback-template/audit").some((row) => row.id === expectedId),
    `${slot} should link to its canonical saved-source namespace.`
  );
}

const unwiredReference = templateVariableReferences({ body: "{{customUnwiredSlot}}" })[0];
assert.equal(unwiredReference.sourceKind, "unmapped", "A declared slot with no canonical provider must not masquerade as calculated or editable.");
assert.deepEqual(templateVariableSourceCandidates(unwiredReference, sourceRows, "fallback-template/synastry.aspect-v3"), []);

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
assert.equal(packageReferences.size, 72, "The variable guide should cover every variable and declared resolver dependency in the current fallback template package.");
assert.deepEqual(genericPackageReferences, [], "Every packaged template variable should have a specific editorial definition, example, and source.");

console.log(`Admin template variable reference tests passed (${packageReferences.size} packaged variables documented).`);
