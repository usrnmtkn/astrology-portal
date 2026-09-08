import assert from "node:assert/strict";
import fs from "node:fs";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState.ts";
import { loadSkyDetailContent, skySnapshotAspectContentKeys } from "../apps/web/src/services/skyDetailContent.ts";
import { resolveSkyAspectContentStudioExact } from "../apps/web/src/services/skyAspectContent.ts";
import type { LiveGeneratedContent } from "../apps/web/src/services/generatedContent.ts";
import type { SkySnapshot } from "../apps/web/src/types.ts";
const snapshot = JSON.parse(fs.readFileSync("apps/web/public/content-studio-last-known-good.json", "utf8"));
const rows = snapshot.rows.filter((row: any) => row.source_snapshot?.contentStudioExactAspect);
installContentPublications(snapshot.publications);
const content = new Map<string, LiveGeneratedContent>(rows.map((row: any) => [row.content_key, {
  ...row, contentKey: row.content_key, updatedAt: row.updated_at,
  targetDate: row.target_date, sourceSnapshot: row.source_snapshot
}]));
let checked = 0;
for (const row of rows) {
  const { a, b, aspect } = row.source_snapshot.exactSkyAspectIdentity;
  for (const [first, second] of [[a, b], [b, a]]) {
    // These are content identity fixtures, not ephemeris assertions.
    const facts = { generatedAt: "2026-09-19T12:00:00.000Z", positions: [], aspects: [
      { from: first, to: second, type: aspect, fromSign: "Aries", toSign: "Leo", orb: 0 }
    ] } as unknown as SkySnapshot;
    let requested: string[] = [];
    const result = await loadSkyDetailContent(facts, new Map(), [], async keys => {
      requested = keys;
      return new Map(keys.filter(key => content.has(key)).map(key => [key, content.get(key)!]));
    });
    assert.ok(requested.includes(row.content_key), row.content_key);
    const resolved = resolveSkyAspectContentStudioExact({
      generatedContent: result, first, second, aspect, firstSign: "Aries", secondSign: "Leo"
    });
    assert.ok(resolved?.body.includes(row.body), row.content_key);
    checked++;
  }
}
const facts = { generatedAt: "2026-09-19T12:00:00Z", positions: [], aspects: [
  { from: "Lilith", to: "Sun", type: "square", fromSign: "Sagittarius", toSign: "Virgo", orb: 1 }
] } as unknown as SkySnapshot;
assert.ok(skySnapshotAspectContentKeys(facts).some(key => key.includes("sagittarius") && key.includes("virgo")));
const key = "sky.aspect.sun.square.lilith";
const stale = new Map(content);
stale.set(key, { ...content.get(key)!, updatedAt: "2000-01-01T00:00:00Z" });
await loadSkyDetailContent(facts, stale, [], async keys => {
  assert.ok(keys.includes(key), "A stale row must be requested again.");
  return new Map([[key, content.get(key)!]]);
});
installContentPublications([{content_key:key,state:"retired",revision:999999,row_id:null,row_updated_at:null,updated_at:"2026-09-08T15:00:00Z"}]);
const retired = await loadSkyDetailContent(facts, content, [], async () => new Map());
assert.equal(retired.has(key), false, "A missing response must not restore a retired row.");
console.log(`PASS: ${checked} published detail identities in both orders; event signs, stale revisions and retirement remain guarded.`);
