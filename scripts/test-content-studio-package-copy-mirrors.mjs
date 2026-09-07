#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(
  repoRoot,
  "apps/web/supabase/migrations/20260907060000_content_studio_package_copy_mirrors.sql"
);
const migration = fs.readFileSync(migrationPath, "utf8");

assert.match(migration, /create or replace function public\.content_studio_package_copy_value/u);
assert.match(migration, /studio_editable_fields/u, "Declared Content Studio fields must be authoritative.");
assert.match(migration, /array\['summary', 'Summary', 'tldr', 'TLDR'\]/u);
assert.match(migration, /array\['body_you', 'body', 'Body', 'text'\]/u);
assert.match(migration, /jsonb_typeof\(new\.sections -> 'packageDraft'\) = 'object'[\s\S]*return new;/u,
  "Non-serving packageDraft proposals must never leak into top-level reader mirrors.");
assert.match(migration, /before insert or update of sections, headline, summary, body/u,
  "The invariant must run for every Content Studio write path that can change reader copy.");
assert.match(migration, /update public\.generated_interpretations as gi[\s\S]*set sections = gi\.sections/u,
  "The migration must repair existing split-brain package rows.");

function valueAt(record, pathValue) {
  return pathValue.split(".").reduce((current, part) => (
    current && typeof current === "object" && !Array.isArray(current) ? current[part] : undefined
  ), record);
}

function resolvePackageCopy(record, copyField) {
  const definitions = {
    headline: {
      aliases: ["headline", "Headline", "title", "Title"],
      acceptedTails: new Set(["headline", "title"])
    },
    summary: {
      aliases: ["summary", "Summary", "tldr", "TLDR"],
      acceptedTails: new Set(["summary", "tldr"])
    },
    body: {
      aliases: ["body_you", "body", "Body", "text"],
      acceptedTails: new Set(["bodyyou", "body", "text"])
    }
  };
  const definition = definitions[copyField];
  if (!definition) throw new Error(`Unsupported copy field ${copyField}`);

  for (const field of Array.isArray(record.studio_editable_fields) ? record.studio_editable_fields : []) {
    const declaredPath = typeof field?.path === "string" ? field.path.trim() : "";
    if (!declaredPath) continue;
    const tail = declaredPath.split(".").at(-1)?.toLowerCase().replace(/[_-]/gu, "") ?? "";
    if (!definition.acceptedTails.has(tail)) continue;
    const declaredValue = valueAt(record, declaredPath);
    if (typeof declaredValue === "string") return declaredValue;
  }

  for (const alias of definition.aliases) {
    if (typeof record[alias] === "string") return record[alias];
  }
  return null;
}

const exactCalendarAspect = {
  Headline: "Sun Trine Lilith",
  Summary: "edited summary",
  Body: "edited body",
  summary: "stale summary mirror",
  body_you: "stale body mirror",
  studio_editable_fields: [
    { path: "Summary", label: "Summary" },
    { path: "Body", label: "Body" }
  ]
};
assert.equal(resolvePackageCopy(exactCalendarAspect, "summary"), "edited summary");
assert.equal(resolvePackageCopy(exactCalendarAspect, "body"), "edited body");

const lowercasePackage = {
  headline: "Legacy headline",
  summary: "Legacy summary",
  body_you: "Legacy body"
};
assert.equal(resolvePackageCopy(lowercasePackage, "headline"), "Legacy headline");
assert.equal(resolvePackageCopy(lowercasePackage, "summary"), "Legacy summary");
assert.equal(resolvePackageCopy(lowercasePackage, "body"), "Legacy body");

const declaredLowercasePackage = {
  summary: "Current summary",
  Summary: "obsolete capitalized shadow",
  body_you: "Current body",
  Body: "obsolete capitalized shadow",
  studio_editable_fields: [
    { path: "summary", label: "Summary" },
    { path: "body_you", label: "You copy" }
  ]
};
assert.equal(resolvePackageCopy(declaredLowercasePackage, "summary"), "Current summary");
assert.equal(resolvePackageCopy(declaredLowercasePackage, "body"), "Current body");

console.log("Content Studio package copy mirrors: PASS");
