#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migration = fs.readFileSync(path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260907061500_content_studio_revision_completion.sql"
), "utf8");

assert.match(migration, /content_studio_package_revision_matches_target/u);
assert.match(migration, /content_studio_complete_matching_revisions/u);
assert.match(migration, /revision\.source_snapshot ->> 'targetRowId' = new\.id::text/u,
  "Only the revision explicitly targeting the published row may be retired.");
assert.match(migration, /revision\.event_type = 'sky-v4-governed-aspect-draft'/u,
  "Governed Calendar/Sky aspect revisions need completion cleanup.");
assert.match(migration, /revision\.event_type = 'sky-article-edition-revision'/u,
  "Sky article revisions need the same completion cleanup.");
assert.match(migration, /status = 'ARCHIVED',[\s\S]*lane = 'reference',[\s\S]*review_state = 'published-revision'/u);
assert.doesNotMatch(
  migration.match(/create or replace function public\.content_studio_complete_matching_revisions\(\)[\s\S]*?\$\$;/u)?.[0] ?? "",
  /set[\s\S]{0,180}updated_at\s*=/u,
  "The trigger must not change revision.updated_at before the API's idempotent cleanup PATCH."
);

function valueAt(record, pathValue) {
  return pathValue.split(".").reduce((current, part) => (
    current && typeof current === "object" && !Array.isArray(current)
      ? current[part]
      : undefined
  ), record);
}

function packageRevisionMatchesTarget(revisionSections, targetSections) {
  const draft = revisionSections?.packageDraft;
  const record = targetSections?.packageRecord;
  const fields = Array.isArray(record?.studio_editable_fields)
    ? record.studio_editable_fields
    : [];
  if (!draft || !record || !fields.length) return false;
  let compared = 0;
  for (const field of fields) {
    const pathValue = typeof field?.path === "string" ? field.path.trim() : "";
    if (!pathValue) continue;
    compared += 1;
    if (JSON.stringify(valueAt(draft, pathValue)) !== JSON.stringify(valueAt(record, pathValue))) {
      return false;
    }
  }
  return compared > 0;
}

const target = {
  packageRecord: {
    Summary: "New summary",
    Body: "New body",
    studio_editable_fields: [
      { path: "Summary", label: "Summary" },
      { path: "Body", label: "Body" }
    ]
  }
};

assert.equal(packageRevisionMatchesTarget({
  packageDraft: {
    Summary: "New summary",
    Body: "New body",
    body_you: "stale non-authoritative alias"
  }
}, target), true, "Exact declared package fields should complete the revision.");

assert.equal(packageRevisionMatchesTarget({
  packageDraft: {
    Summary: "New summary",
    Body: "Different body"
  }
}, target), false, "A draft must remain pending if any declared field differs from live copy.");

assert.equal(packageRevisionMatchesTarget({ packageDraft: { Body: "New body" } }, {
  packageRecord: { Body: "New body" }
}), false, "Rows without an editable-field contract must fail closed.");

console.log("Content Studio revision completion: PASS");
