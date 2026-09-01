import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { friendVoiceFromReaderCopy } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(
  repoRoot,
  "apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json"
);
const approvalPath = path.join(
  repoRoot,
  "packages/astro-knowledge/review/transit-aspect-friends-name-anchor-v1.json"
);
const approvalRecordPath = "packages/astro-knowledge/review/transit-aspect-friends-name-anchor-v1.json";
const approvalEvidence = "Owner preapproval in Codex chat on 2026-09-01: adapt each current Personal Transit passage into explicit Friends copy, add {{Name}}, and keep it editable on the live site.";
const properOpening = /^(?:Sun|Moon|Mercury|Venus|Mars|Jupiter|Saturn|Uranus|Neptune|Pluto|Chiron|Lilith|North Node|South Node)\b/u;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function firstSentence(value) {
  return value.match(/^[\s\S]*?[.!?](?:\s|$)/u)?.[0] ?? value;
}

function addNameAnchor(value) {
  if (/\{\{Name\}\}/u.test(firstSentence(value))) return value;
  const anchored = properOpening.test(value)
    ? `For {{Name}}, ${value}`
    : `For {{Name}}, ${value.charAt(0).toLowerCase()}${value.slice(1)}`;
  return anchored;
}

const source = JSON.parse(await readFile(sourcePath, "utf8"));
assert.ok(Array.isArray(source.authoredCards), "Transit-synastry source must contain authoredCards.");

const records = [];
for (const row of source.authoredCards) {
  if (!String(row.contentKey ?? "").startsWith("authored/transit-aspect/")) continue;
  const readerBody = typeof row.body_you === "string" && row.body_you.trim()
    ? row.body_you
    : typeof row.body === "string" && row.body.trim()
      ? row.body
      : "";
  assert.ok(readerBody, `${row.contentKey} is missing current reader copy.`);

  const bodyThey = addNameAnchor(friendVoiceFromReaderCopy(readerBody, "{{Name}}"));
  const bodyTheySha256 = sha256(bodyThey);
  assert.match(firstSentence(bodyThey), /\{\{Name\}\}/u, `${row.contentKey} must name the friend in its first sentence.`);
  assert.doesNotMatch(bodyThey, /\byou(?:r|rs|rself|rselves)?\b/iu, `${row.contentKey} must not leak reader-address grammar into Friends copy.`);

  row.body_they = bodyThey;
  row.body_they_review_status = "approved";
  row.body_they_sha256 = bodyTheySha256;
  row.body_they_approved_via = approvalRecordPath;
  row.body_they_authorship = "owner_preapproved_adaptation";
  row.body_they_name_variable = "{{Name}}";
  row.body_they_sourceMechanism = "Explicit stored Friends adaptation of the current approved reader passage. The one-time migration adds a {{Name}} anchor and converts reader address; runtime pronoun substitution remains disabled.";
  row.body_they_approval = {
    approvalLevel: "exact_owner_approved",
    recordPath: approvalRecordPath,
    payloadSha256: bodyTheySha256,
    approvedAt: "2026-09-01"
  };
  row.source_keys = [...new Set([...(Array.isArray(row.source_keys) ? row.source_keys : []), approvalRecordPath])];

  records.push({
    contentKey: row.contentKey,
    sourceField: typeof row.body_you === "string" && row.body_you.trim() ? "body_you" : "body",
    body_they: bodyThey,
    body_they_sha256: bodyTheySha256
  });
}

assert.equal(records.length, 378, "Expected all 378 exact Personal Transit rows.");

const approval = {
  schema: "tldrastro-transit-aspect-friends-name-anchor-v1",
  approvedAt: "2026-09-01",
  approvalLevel: "exact_owner_approved",
  evidence: approvalEvidence,
  method: "One-time deterministic adaptation stored as editable body_they. No runtime reader-to-friend transformation is permitted.",
  count: records.length,
  records
};

await writeFile(sourcePath, `${JSON.stringify(source, null, 1)}\n`);
await writeFile(approvalPath, `${JSON.stringify(approval, null, 2)}\n`);
console.log(`Stored ${records.length} approved, name-anchored Personal Transit Friends passages.`);
