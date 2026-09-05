#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const manifestPath = "packages/astro-knowledge/review/bond-effect-directional-copy-v1/shipping-manifest.json";
const outDir = "packages/astro-knowledge/review/between-you-two-v2-2026-09-05";
const outPath = path.join(outDir, "bond-evidence-28.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const members = manifest.rows ?? manifest.members ?? manifest.records ?? manifest.entries ?? [];
const base = members.filter((item) => /^fallback-hook\/bond-effect-(?:soft|hard)\/[^/]+$/u.test(item.contentKey));
const rows = base.map((item) => {
  const record = JSON.parse(fs.readFileSync(item.recordPath, "utf8"));
  const match = record.contentKey.match(/^fallback-hook\/bond-effect-(soft|hard)\/(.+)$/u);
  return {
    family: match?.[1],
    transiting: match?.[2],
    contentKey: record.contentKey,
    payloadSha256: record.payloadSha256,
    approvalLevel: record.approvalLevel,
    authorship: record.authorship,
    body_you: record.payload.body_you,
    body_they: record.payload.body_they
  };
}).sort((a, b) => `${a.family}:${a.transiting}`.localeCompare(`${b.family}:${b.transiting}`));
if (rows.length !== 28) throw new Error(`Expected 28 base bond families, got ${rows.length}`);
if (!rows.every((row) => row.approvalLevel === "exact_owner_approved" && row.authorship === "owner_authored")) {
  throw new Error("Every V2 bond evidence row must be exact owner-approved owner-authored copy.");
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify({ schemaVersion: 1, servingAuthority: false, rowCount: rows.length, rows }, null, 2) + "\n");
console.log(`Wrote ${outPath} with ${rows.length} canonical bond families.`);
