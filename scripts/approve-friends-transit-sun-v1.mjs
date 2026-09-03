#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";

const packetPath = "packages/astro-knowledge/review/transit-aspect-friends-sun-proposed-v1.json";
const testPath = "scripts/test-transit-friends-sun-proposed-v1.mjs";

const packet = JSON.parse(await readFile(packetPath, "utf8"));
if (packet.count !== 27 || packet.records?.length !== 27) throw new Error("Expected 27 Sun Friends rows.");
packet.schema = "tldrastro-transit-aspect-friends-independent-owner-approved-v1";
packet.status = "owner_approved";
packet.approvedAt = "2026-09-03";
packet.approvalLevel = "exact_owner_approved";
packet.approvalEvidence = "Owner approved the complete 27-row Sun Friends Transit batch in ChatGPT on 2026-09-03.";
packet.servingEnabled = false;
for (const record of packet.records) {
  record.review_status = "exact_owner_approved";
  record.owner_approved = true;
  record.approvedAt = "2026-09-03";
  record.approvalLevel = "exact_owner_approved";
}
await writeFile(packetPath, `${JSON.stringify(packet, null, 2)}\n`);

let test = await readFile(testPath, "utf8");
test = test
  .replace('assert.equal(proposal.schema, "tldrastro-transit-aspect-friends-independent-proposed-v1");', 'assert.equal(proposal.schema, "tldrastro-transit-aspect-friends-independent-owner-approved-v1");')
  .replace('assert.equal(proposal.status, "proposed_owner_review");', 'assert.equal(proposal.status, "owner_approved");\nassert.equal(proposal.approvalLevel, "exact_owner_approved");\nassert.equal(proposal.approvedAt, "2026-09-03");')
  .replace('assert.equal(record.review_status, "proposed", `${record.contentKey}: must remain proposed.`);', 'assert.equal(record.review_status, "exact_owner_approved", `${record.contentKey}: must retain exact owner approval.`);\n  assert.equal(record.owner_approved, true, `${record.contentKey}: owner approval flag missing.`);\n  assert.equal(record.approvalLevel, "exact_owner_approved", `${record.contentKey}: approval level drifted.`);');
await writeFile(testPath, test);
console.log("Locked 27 Sun Friends Transit passages as exact owner-approved; serving remains disabled.");
