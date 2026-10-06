import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { auditRelationshipTemplatePairs } from "./audit-relationship-template-pairs.mjs";
import { resolveBondEffect, resolveRelationshipTemplate, missingRelationshipPerspectives } from "../apps/web/src/content/fallbackArchitectureV3/resolver/relationshipTemplate.mjs";
import { createTransitSynastryRenderer as browser } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts";
import { createTransitSynastryRenderer as shipped } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { renderBondTransit as nodeReference } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";
import { bondEffectVersionsFromPayload } from "../apps/admin/src/bondEffectPageAssembly.ts";
import { packageHookRowFromRow } from "../apps/web/src/services/fallbackArchitectureV3CorePackaging.ts";

const root = "apps/web/src/content/fallbackArchitectureV3/";
const read = (file: string) => JSON.parse(fs.readFileSync(root + file, "utf8"));
const rows = read("source-rows/fallback-source-rows-v3.json");
const templates = read("templates/fallback-templates-v3.json");
const key = "fallback-hook/bond-effect-sextile/mars";
const facts = { transiting: "mars", aspect: "sextile", endpointPlanet: "sun", endpointOwner: "reader", activatedPlanets: ["moon"], otherName: "Name", variant: 2, duplicateIndex: 2 };
const pair = process.env.RELATIONSHIP_TEMPLATE_FIXTURE
  ? JSON.parse(fs.readFileSync(process.env.RELATIONSHIP_TEMPLATE_FIXTURE, "utf8"))
  : { you: "  You and {{holder1}} keep  the exact spacing.\n\nFinal sentence: {{holder1}}.  ", friend: "{{holder1}}'s perspective.\nIts own final sentence." };
// The exact historical Mars pair is private test input, never a serving source.
// Hashes lock the approved test evidence; changing the input cannot silently
// change the expected copy. The private fixture is provided only for local release checks.
if (process.env.RELATIONSHIP_TEMPLATE_FIXTURE) {
  const expectedHashes = {"you": "b338b98198dae07b5279071d9a91d2b037f402bc0c07441d1419208282bc9a78", "friend": "2b5e1625c373edaee58b2dc60cabb14c2423137331a779faa240fac3f9fdb475"};
  for (const audience of ["you", "friend"] as const) {
    assert.equal(createHash("sha256").update(pair[audience]).digest("hex"), expectedHashes[audience], `Historical Mars ${audience} bytes changed`);
  }
}
const row = { contentKey: key, content_role: "fallback_hook", review_status: "approved", body_you: pair.you, body_they: pair.friend };
const packaged = packageHookRowFromRow({ id: "fixture", content_key: key, sections: { packageRecord: row }, facts: { content_role: "fallback_hook", review_status: "approved" } } as any)!;
assert.equal(packaged.body_you, pair.you, "Dashboard packaging preserves authored bytes, including whitespace.");
assert.equal(packaged.body_they, pair.friend);
assert.ok(packageHookRowFromRow({ id: "incomplete", content_key: key, sections: { packageRecord: { ...row, body_you: "", body_they: "" } } } as any), "An empty selected publication must remain identifiable and cannot reveal older package prose.");
const family = { ...row, contentKey: "fallback-hook/bond-effect-soft/mars", body_you: "Different source must not replace this record.", body_they: "Different friend source." };
const fixture = { ...rows, hookRows: [row, family, { ...family, contentKey: family.contentKey + "/variant-2" }] };
for (const audience of ["you", "friend"] as const) for (const name of ["Name", "O'Neil", "$& $` $'", "A  B"]) {
  const expected = pair[audience].split("{{holder1}}").join(name);
  const input = { ...facts, endpointOwner: audience === "you" ? "reader" : "friend", otherName: name };
  assert.equal(resolveBondEffect(new Map(fixture.hookRows.map(r => [r.contentKey, r])), { ...input, family: "soft" }, Error).effect, expected);
  for (const factory of [browser, shipped]) {
    const result = factory({ authoredCards: [] }, templates, fixture).renderBondTransit(input as any);
    assert.equal(result.contentKey, key, "Duplicate position never changes an existing exact source.");
    assert.equal(result.parts[0], expected, "Only variable substitution may alter the selected template.");
    assert.ok(result.body.startsWith(expected + "\n\n"), "The full card preserves the entire opening, including outer whitespace.");
  }
}
for (const field of ["body_you", "body_they"]) {
  const incomplete = { ...row, [field]: "" };
  assert.equal(missingRelationshipPerspectives(incomplete).length, 1);
  for (const factory of [browser, shipped]) for (const endpointOwner of ["reader", "friend"]) {
    assert.throws(() => factory({ authoredCards: [] }, templates, { ...fixture, hookRows: [incomplete, family] }).renderBondTransit({ ...facts, endpointOwner } as any), /Incomplete relationship pair/);
  }
}
assert.throws(() => resolveRelationshipTemplate({ ...row, body_they: "{{unknown}}" }, "friend", { holder1: "Name" }), /Missing relationship variable/);
const payload = { rows: [{ id: "record", content_key: key, updated_at: "current", sections: {
  packageDraft: row, packageRecord: family,
  dashboardEditHistory: [{ versionId: "older", editedAt: "earlier", packageDraft: { body_you: pair.you, body_they: pair.friend } }, { versionId: "partial", packageDraft: { body_you: pair.you } }]
} }] };
const versions = bondEffectVersionsFromPayload(payload);
assert.equal(versions[0].body_they, pair.friend);
assert.equal(versions.find(v => v.versionId === "older")!.body_they, pair.friend);
assert.deepEqual(versions.find(v => v.versionId === "partial")!.missing, ["friend"]);
assert.equal(versions.find(v => v.versionId === "partial")!.body_they, "", "A partial historical record must not borrow another version's counterpart.");
assert.equal(bondEffectVersionsFromPayload({ rows: [{ content_key: key, sections: { packageRecord: row } }] })[0].body_you, pair.you);
for (const r of rows.hookRows.filter(r => r.contentKey.startsWith("fallback-hook/bond-effect-"))) assert.deepEqual(missingRelationshipPerspectives(r), [], r.contentKey);
for (const endpointOwner of ["reader", "friend"]) {
  const result = nodeReference({ ...facts, endpointOwner });
  for (const factory of [browser, shipped]) assert.deepEqual(factory({ authoredCards: [] }, templates, rows).renderBondTransit({ ...facts, endpointOwner } as any), result);
}
console.log("PASS exact template bytes, both perspectives, explicit versions, missing-side refusal, literal names, exact-source priority, and Node/browser/shipped parity; all 139 canonical pairs complete.");

const canonicalAudit = auditRelationshipTemplatePairs(rows);
assert.equal(canonicalAudit.currentChecked, 139);
assert.deepEqual(canonicalAudit.currentMissing, []);
const shape = JSON.parse(fs.readFileSync("tests/fixtures/relationship-pair-inventory-shape.json", "utf8"));
const fullAudit = auditRelationshipTemplatePairs(shape);
assert.equal(fullAudit.currentChecked, 148);
assert.deepEqual(fullAudit.currentMissing, []);
assert.equal(fullAudit.historicalChecked, 35);
assert.deepEqual(fullAudit.historicalMissing.map(r => [r.contentKey, r.missing]).sort(), [
  ["fallback-hook/bond-effect-conjunction/pluto", ["friend"]],
  ["fallback-hook/bond-effect-sextile/chiron", ["you", "friend"]],
  ["fallback-hook/bond-effect-sextile/chiron", ["you", "friend"]],
  ["fallback-hook/bond-effect-sextile/moon", ["you", "friend"]],
  ["fallback-hook/bond-effect-trine/mercury", ["you", "friend"]],
  ["fallback-hook/bond-effect-hard/uranus/variant-3", ["friend"]],
  ["fallback-hook/bond-effect-trine/pluto", ["friend"]]
].sort());
for (const field of ["body_you", "body_they"]) {
  const damaged = structuredClone(shape);
  damaged[0].sections.packageRecord[field] = "";
  assert.equal(auditRelationshipTemplatePairs(damaged).currentMissing.length, 1);
}
assert.deepEqual(auditRelationshipTemplatePairs([{ content_key: key, sections: {} }]).currentMissing[0].missing, ["you", "friend"]);
console.log("PASS full pair-inventory audit: missing current pairs block; historical gaps stay visible without borrowed copy.");

// Always run an exact Mars source regression in CI, using the existing canonical
// pair without copying it into a fixture or changing any serving source.
const canonicalMars = rows.hookRows.find(r => r.contentKey === key);
const canonicalMarsHashes = {"body_you": "d840449e715013b0e4532af54f6c471ed1be94b02491583321957f4561b82322", "body_they": "d840449e715013b0e4532af54f6c471ed1be94b02491583321957f4561b82322"};
for (const [audience, field] of [["you", "body_you"], ["friend", "body_they"]]) {
  assert.equal(createHash("sha256").update(canonicalMars[field]).digest("hex"), canonicalMarsHashes[field]);
  const expected = canonicalMars[field].split("{{holder1}}").join("Name");
  for (const factory of [browser, shipped]) {
    const result = factory({ authoredCards: [] }, templates, rows).renderBondTransit({ ...facts, endpointOwner: audience === "you" ? "reader" : "friend" } as any);
    assert.equal(result.parts[0], expected);
  }
}
console.log("PASS canonical Mars exact source hashes and rendered perspectives.");
