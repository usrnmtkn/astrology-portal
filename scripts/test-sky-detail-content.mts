import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import type { LiveGeneratedContent } from "../apps/web/src/services/generatedContent.ts";
import type { SkySnapshot } from "../apps/web/src/types.ts";

// These app services read Vite's import.meta.env through their auth dependency.
// Load their shared module graph with the same transform used by the reader.
const vite = await createServer({
  root: fileURLToPath(new URL("../apps/web", import.meta.url)),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "silent"
});
try {
  const { installContentPublications } = await vite.ssrLoadModule("/src/content/contentPublicationState.ts") as typeof import("../apps/web/src/content/contentPublicationState.ts");
  const { loadSkyDetailContent, skySnapshotAspectContentKeys } = await vite.ssrLoadModule("/src/services/skyDetailContent.ts") as typeof import("../apps/web/src/services/skyDetailContent.ts");
  const { resolveSkyAspectContentStudioExact } = await vite.ssrLoadModule("/src/services/skyAspectContent.ts") as typeof import("../apps/web/src/services/skyAspectContent.ts");
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
      assert.equal(result.get(row.content_key)?.body, row.body, `${row.content_key} source bytes`);
      // Ignore trailing display whitespace, while preserving every word and
      // paragraph in order and requiring the loaded source bytes above.
      assert.ok(resolved?.body.includes(row.body.replace(/[ \t]+$/gmu, "").trim()), row.content_key);
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
  const offline = await loadSkyDetailContent(facts, content, ["unavailable-row"], async () => { throw new Error("offline fixture"); });
  assert.equal(offline.get(key), content.get(key), "An offline refresh keeps the eligible approved row.");
  await assert.rejects(
    loadSkyDetailContent(facts, stale, [key], async () => { throw new Error("offline fixture"); }),
    /current article publication/i,
    "An unavailable authoritative row must reject a partial article, not reveal older fallback prose."
  );
  const unrelatedLive = "sky.aspect.mercury.trine.pluto";
  installContentPublications([{
    content_key: unrelatedLive, state: "live", revision: 1, row_id: "11111111-1111-1111-1111-111111111111",
    row_updated_at: "2026-09-07T12:00:00.000Z", updated_at: "2026-09-07T12:00:00.000Z"
  }]);
  const placementLike = { generatedAt: "2026-07-10T12:00:00.000Z", positions: [], aspects: [
    { from: "Mercury", to: "Pluto", type: "trine", fromSign: "Cancer", toSign: "Aquarius", orb: 1 },
    { from: "Lilith", to: "Sun", type: "square", fromSign: "Sagittarius", toSign: "Virgo", orb: 1 }
  ] } as unknown as SkySnapshot;
  const relatedOnly = await loadSkyDetailContent(placementLike, content, [], async () => { throw new Error("offline fixture"); });
  assert.equal(relatedOnly.get(key), content.get(key), "A placement article still renders when an unrelated live aspect row is missing.");
  installContentPublications([{content_key:key,state:"retired",revision:999999,row_id:null,row_updated_at:null,updated_at:"2026-09-08T15:00:00Z"}]);
  const retired = await loadSkyDetailContent(facts, content, [], async () => { throw new Error("offline fixture"); });
  assert.equal(retired.has(key), false, "A missing response must not restore a retired row.");
  console.log(`PASS: ${checked} published detail identities in both orders; event signs, stale revisions and retirement remain guarded.`);
} finally {
  await vite.close();
}
