#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migration = fs.readFileSync(
  path.join(repoRoot, "apps/web/supabase/migrations/20260808122000_relationship_report_consent.sql"),
  "utf8"
);
const composer = fs.readFileSync(path.join(repoRoot, "api/_lib/relationship-facts.ts"), "utf8");
const endpoint = fs.readFileSync(path.join(repoRoot, "api/relationship-report-facts.ts"), "utf8");

assert.match(migration, /create or replace function public\.can_read_chart_for_report\(\s*viewer uuid,\s*subject_ref text/u);
assert.match(migration, /friendship\.high_shares_chart/u, "Friend consent must use the friend's per-side sharing flag.");
assert.match(migration, /friendship\.low_shares_chart/u, "Friend consent must support either canonical friendship side.");
assert.match(migration, /chart\.owner_user_id = viewer/u, "Manual charts must remain owner-scoped.");
assert.match(migration, /chart\.claimed_by_user_id is null/u, "Unclaimed owner-created manual charts must be eligible.");
assert.match(migration, /social_blocks/u, "Blocked relationships must not satisfy report consent.");
assert.match(migration, /revoke all on function public\.can_read_chart_for_report\(uuid, text\) from anon/u);
assert.match(migration, /grant execute on function public\.can_read_chart_for_report\(uuid, text\) to authenticated/u);
assert.match(migration, /report_type <> 'relationship'\s*or public\.can_read_chart_for_report\(user_id, subject_id\)/u,
  "The user_reports SELECT policy must recheck relationship consent on every read.");

assert.ok(
  composer.indexOf("requireConsent") < composer.indexOf("astroClient.serviceVersion"),
  "The composer must check consent before the first FastAPI call."
);
assert.ok(
  composer.indexOf("requireConsent") < composer.indexOf("fetchReportEnvelope(dependencies.envelopeStore, identity)"),
  "The composer must check consent before reading a frozen envelope."
);
assert.match(composer, /throw new RelationshipReportUnavailableError\(\)/u);
assert.match(endpoint, /await authenticatedUserId\(req\)/u);
assert.match(endpoint, /RELATIONSHIP_REPORT_AUTH_REQUIRED_CODE/u);
assert.doesNotMatch(endpoint, /generateContent|openai|anthropic/iu, "R1–R2 must not invoke an LLM.");

console.log("relationship consent SQL, read-policy, compose ordering, authentication, and no-LLM contracts passed");
