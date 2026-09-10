#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  classifySynastryDirectionality,
  DIRECTIONALITY_ACTION
} from "./synastry-directionality-human-review.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
const sourcePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/synastry-directional-overrides-v1.json";
const basePath = "apps/web/src/content/fallbackArchitectureV3/source-rows/fallback-source-rows-v3.json";
const approvalPath = "packages/astro-knowledge/review/synastry-directionality-authoring-batch-4-2026-09-09/OWNER-APPROVAL.md";
const apply = process.argv.includes("--apply");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required for --apply.`);
  return value;
}

function compileFriendsName(body) {
  return body.replaceAll("{{Name}}", "{{holder2}}");
}

function validateRows(overrides, baseRows) {
  assert.equal(overrides.schema, "synastry-directional-overrides/v1");
  assert.equal(overrides.rows.length, 24, "Release v1 is bounded to the 24 owner-approved Batch 4 rows.");
  assert.equal(new Set(overrides.rows.map((row) => row.contentKey)).size, 24, "Release keys must be unique.");
  const baseByKey = new Map(baseRows.hookRows.map((row) => [row.contentKey, row]));

  for (const row of overrides.rows) {
    const decision = classifySynastryDirectionality(row.contentKey);
    assert.equal(decision.action, DIRECTIONALITY_ACTION.AUTHOR_REVERSE, `${row.contentKey}: reciprocal/held rows may never enter this release path.`);
    assert.equal(decision.missingSemanticDirection, row.body_you_semantic_direction, `${row.contentKey}: semantic arrow does not match the human-review inventory.`);
    assert.equal(row.review_status, "approved");
    assert.equal(row.directionality_mode, "viewer-centered-synastry-v1");
    assert.equal(row.approval?.approvalLevel, "exact_owner_approved");
    assert.equal(row.approval?.recordPath, approvalPath);
    assert.ok(row.body_you.includes("{{Name}}"), `${row.contentKey}: canonical authoring copy must retain {{Name}}.`);
    assert.ok(!compileFriendsName(row.body_you).includes("{{Name}}"), `${row.contentKey}: runtime compilation must resolve {{Name}}.`);

    const base = baseByKey.get(row.contentKey);
    assert.ok(base, `${row.contentKey}: canonical pre-release source row is missing.`);
    assert.equal(row.body_they, base.body_they, `${row.contentKey}: existing opposite-direction body_they changed; refusing release.`);
  }
}

const overrides = readJson(sourcePath);
const baseRows = readJson(basePath);
validateRows(overrides, baseRows);

if (!apply) {
  console.log(`Verified ${overrides.rows.length} directional synastry overrides. Re-run with --apply only after explicit owner serving authorization.`);
  process.exit(0);
}

const supabaseUrl = process.env.SUPABASE_URL ?? requireEnv("VITE_SUPABASE_URL");
const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const headers = {
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`,
  "content-type": "application/json",
  prefer: "return=representation",
  "x-content-publication-action": "publish"
};

for (const row of overrides.rows) {
  const query = new URL(`${supabaseUrl}/rest/v1/generated_interpretations`);
  query.searchParams.set("content_key", `eq.${row.contentKey}`);
  query.searchParams.set("provider", "eq.tldrastro-fallback-architecture-v3");
  query.searchParams.set("select", "id,content_key,status,lane,review_state,sections,updated_at");

  const currentResponse = await fetch(query, { headers: { apikey: serviceRoleKey, authorization: `Bearer ${serviceRoleKey}` } });
  if (!currentResponse.ok) throw new Error(`${row.contentKey}: failed to read Content Studio row (${currentResponse.status}).`);
  const currentRows = await currentResponse.json();
  assert.equal(currentRows.length, 1, `${row.contentKey}: expected exactly one fallback package mirror row.`);
  const current = currentRows[0];
  const sections = current.sections && typeof current.sections === "object" ? current.sections : {};
  const packageRecord = sections.packageRecord && typeof sections.packageRecord === "object" ? sections.packageRecord : {};
  assert.equal(packageRecord.body_they, row.body_they, `${row.contentKey}: Content Studio opposite-direction copy drifted; refusing overwrite.`);

  const runtimeBodyYou = compileFriendsName(row.body_you);
  const nextPackageRecord = {
    ...packageRecord,
    body_you: runtimeBodyYou,
    body_they: row.body_they,
    review_status: "approved",
    directionality_mode: row.directionality_mode,
    body_you_semantic_direction: row.body_you_semantic_direction,
    body_they_semantic_direction: row.body_they_semantic_direction,
    authoring_name_variable: "{{Name}}",
    approval: row.approval
  };
  const nextSections = {
    ...sections,
    packageRecord: nextPackageRecord,
    body_you: runtimeBodyYou,
    body_they: row.body_they,
    packageDraft: null
  };

  const patchResponse = await fetch(query, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      status: "LIVE",
      lane: "serving",
      review_state: null,
      target_date: null,
      sections: nextSections,
      reviewer_notes: "Owner-approved viewer-centered synastry directionality release v1. Canonical authoring uses {{Name}}; runtime projection compiles it to {{holder2}}.",
      reviewed_at: new Date().toISOString(),
      published_at: new Date().toISOString()
    })
  });
  if (!patchResponse.ok) throw new Error(`${row.contentKey}: release PATCH failed (${patchResponse.status}) ${await patchResponse.text()}`);
  const releasedRows = await patchResponse.json();
  assert.equal(releasedRows.length, 1, `${row.contentKey}: release must update exactly one row.`);
  const released = releasedRows[0];
  assert.equal(released.status, "LIVE");
  assert.equal(released.lane, "serving");
  assert.equal(released.review_state, null);
}

console.log(`Released ${overrides.rows.length} owner-approved viewer-centered synastry overrides to Content Studio.`);
