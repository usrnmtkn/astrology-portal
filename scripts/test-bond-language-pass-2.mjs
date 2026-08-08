#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import {
  createTransitSynastryRenderer
} from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";

const packageRoot = new URL(
  "../apps/web/src/content/fallbackArchitectureV3/",
  import.meta.url
);
const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(new URL(relativePath, packageRoot), "utf8")
);

const pass = readJson("source-rows/bond-language-pass-2.json");
const base = readJson("source-rows/fallback-source-rows-v3.json");
const transit = readJson("source-rows/transit-synastry-rows-v1.json");
const templates = readJson("templates/fallback-templates-v3.json");
const eligibleStatuses = new Set(["approved", "approved_reuse", "reviewed"]);
const baseByKey = new Map(base.hookRows.map((row) => [row.contentKey, row]));
const passByKey = new Map(pass.rows.map((row) => [row.contentKey, row]));

assert.equal(
  crypto.createHash("sha256").update(JSON.stringify(pass.rows)).digest("hex"),
  "b174cf71bffeb04eba4394040a75af8bc3226d7e3a0ae6a1b6303334eb30c46d",
  "The staged owner source must remain byte-stable after JSON parsing."
);
assert.equal(pass.rows.length, 139);
assert.equal(passByKey.size, 139, "Pass 2 keys must be unique.");
assert.deepEqual(
  Object.fromEntries(
    [...new Set(pass.rows.map((row) => row.contentKey.split("/")[1]))]
      .sort()
      .map((family) => [
        family,
        pass.rows.filter((row) => row.contentKey.split("/")[1] === family).length
      ])
  ),
  {
    "bond-effect-conjunction": 11,
    "bond-effect-hard": 42,
    "bond-effect-opposition": 11,
    "bond-effect-sextile": 11,
    "bond-effect-soft": 42,
    "bond-effect-square": 11,
    "bond-effect-trine": 11
  }
);

for (const row of pass.rows) {
  const servingTwin = baseByKey.get(row.contentKey);
  assert.equal(row.review_status, "reviewed", `${row.contentKey}: review state`);
  assert.equal(row.content_role, "fallback_hook", `${row.contentKey}: role`);
  assert.equal(row.grammar_frame, "complete_sentence", `${row.contentKey}: grammar`);
  assert.equal(row.body_you, row.body_they, `${row.contentKey}: single-voice family`);
  assert.deepEqual(row.source_keys, ["owner/bond-language-pass-2"], `${row.contentKey}: provenance`);
  assert.ok(servingTwin, `${row.contentKey}: serving twin`);
  assert.ok(
    eligibleStatuses.has(servingTwin.review_status),
    `${row.contentKey}: approved serving twin must remain active`
  );
}

assert.match(
  passByKey.get("fallback-hook/bond-effect-conjunction/uranus").body_you,
  /Let the change finish speaking before you decide it is a problem\./u
);
assert.match(
  passByKey.get("fallback-hook/bond-effect-trine/pluto").body_you,
  /uses the truth as a weapon/u
);
assert.match(
  passByKey.get("fallback-hook/bond-effect-soft/pluto/variant-3").body_you,
  /without holding it over them later/u
);
assert.match(
  passByKey.get("fallback-hook/bond-effect-hard/pluto/variant-2").body_you,
  /Name the actual power imbalance/u
);
assert.doesNotMatch(
  pass.rows.map((row) => row.body_you).join("\n"),
  /tell you something|as leverage|using it as leverage|actual leverage/iu
);

const combinedRows = {
  ...base,
  hookRows: [...base.hookRows, ...pass.rows]
};
const servingRenderer = createTransitSynastryRenderer(transit, templates, combinedRows);
const previewRenderer = createTransitSynastryRenderer(
  transit,
  templates,
  combinedRows,
  { allowUnreviewed: true }
);
const facts = {
  transiting: "saturn",
  aspect: "square",
  endpointPlanet: "venus",
  endpointOwner: "reader",
  activatedPlanets: ["mercury"],
  otherName: "Chris"
};
const key = "fallback-hook/bond-effect-square/saturn";

assert.equal(
  servingRenderer.renderBondTransit(facts).parts[0],
  passByKey.get(key).body_you,
  "The reviewed pass-2 body must supersede the older approved body."
);
assert.equal(
  previewRenderer.renderBondTransit(facts).parts[0],
  passByKey.get(key).body_you,
  "Admin preview must select the later pass-2 candidate."
);

const gatedRows = {
  ...base,
  hookRows: [
    ...base.hookRows,
    ...pass.rows.map((row) => ({ ...row, review_status: "needs_review" }))
  ]
};
const gatedRenderer = createTransitSynastryRenderer(transit, templates, gatedRows);
assert.equal(
  gatedRenderer.renderBondTransit(facts).parts[0],
  baseByKey.get(key).body_you
    .replaceAll("{{holder1}}'s", "Chris's")
    .replaceAll("{{holder1}}", "Chris"),
  "A review-gated pass-2 row must fall back to its older serving twin."
);

console.log(
  "bond language pass 2 passed: 139/139 reviewed and serving, 139 older twins superseded, "
  + "single-voice parity, four lint swaps, and review-gated fallback routing"
);
