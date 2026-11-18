import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

// Optional private acceptance source. Bodies never enter a shipped bundle or Git.
const bodies = new Map<string, string>();
if (process.env.NATAL_APPROVED_PILOT_SOURCE) {
  const source = JSON.parse(readFileSync(process.env.NATAL_APPROVED_PILOT_SOURCE, "utf8"));
  assert.equal(source.ownerApproved, true);
  assert.equal(source.publicationApproved, false);
  assert.equal(source.entries.length, 8);
  for (const entry of source.entries) {
    const audience = entry.title.endsWith("Friend") ? "they" : "you";
    const planet = entry.title.startsWith("Jupiter") ? "jupiter" : "saturn";
    const sect = /Night/iu.test(entry.title) ? "night" : "day";
    const key = `cms/natal-planet-sect/${audience}/${planet}/${planet === "jupiter" ? "leo/house-3" : "aries"}/${sect}`;
    assert.equal(createHash("sha256").update(entry.body).digest("hex"), entry.sha256);
    assert.equal(bodies.has(key), false);
    bodies.set(key, entry.body);
  }
}
export function approvedNatalPilotBody(key: string, syntheticBody: string): string {
  return bodies.get(key) ?? syntheticBody;
}
