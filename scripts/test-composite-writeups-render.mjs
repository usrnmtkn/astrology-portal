import assert from "node:assert/strict";
import { createApiStore } from "../tests/helpers/calendar-review-api.mjs";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({ root: "./apps/web", appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
try {
  const { friendsViewModelDependencies: runtime } = await vite.ssrLoadModule("/src/App.tsx");
  const { FriendCompositeTab } = await vite.ssrLoadModule("/src/features/friends/FriendCompositeTab.tsx");
  const { installContentPublications } = await vite.ssrLoadModule("/src/content/contentPublicationState.ts");
  const { compositeAspectContentKey } = await vite.ssrLoadModule("/src/services/generatedContentKeys.ts");
  const source = JSON.parse(readFileSync("packages/astro-knowledge/data/composite/aspects/mars_trine_pluto.json", "utf8"));
  const aspect = { from: "Mars", type: "trine", to: "Pluto", orb: 0 };
  // The first request loads the deferred relationship registry. Retry the same
  // app boundary after module loading, just as the revision subscription does.
  runtime.normalizeCompositeAspectSurface(aspect);
  await vite.ssrLoadModule("/src/content/relationshipRegistry.ts");
  await new Promise((resolve) => setTimeout(resolve, 20));
  const article = runtime.normalizeCompositeAspectSurface(aspect);
  assert.equal(article.status, "servable");
  assert.equal(article.sections[0].body, source.plainTranslation);
  assert.equal(runtime.normalizeCompositeAspectSurface({ ...aspect, from: "Pluto", to: "Mars" }).sections[0].body, source.plainTranslation);
  assert.equal(runtime.normalizeCompositeAspectSurface({ ...aspect, from: "Unknown" }).status, "not-servable");
  const key = compositeAspectContentKey("Mars", "trine", "Pluto");
  const fullBody = [source.plainTranslation, "Second fixture paragraph.", "Final fixture sentence."].join("\n\n");
  const generated = new Map([[key, { id: "composite-test", contentKey: key, body: fullBody, summary: "Short fixture summary.", sections: {}, sourceSnapshot: {}, updatedAt: "2026-09-08T00:00:00Z" }]]);
  const loaded = runtime.normalizeCompositeAspectSurface(aspect, generated);
  assert.equal(loaded.sections[0].body, fullBody, "Loaded full interpretation must survive without rewriting or truncation");
  const html = renderToStaticMarkup(React.createElement(FriendCompositeTab, {
    aspectGroups: [{ key: "gifts", label: "Gifts", aspects: [{ ...aspect, summary: loaded.sections[0].body }] }],
    compositeAvailable: true, placementRows: [], relationshipCompare: null, relationshipCompareStatus: "idle", onAspectClick() {}
  }));
  assert.ok(html.includes(source.plainTranslation));
  assert.ok(html.includes("Final fixture sentence."));
  assert.match(html, /<button[^>]+aria-label="Open full entry for Mars trine Pluto"/);
  const variants = {
    friendship: { body: "Friendship fixture opening.\n\nFinal friendship fixture sentence." },
    romantic: { summary: "Romantic fixture opening. Final romantic fixture sentence." },
    creative: { copy: "Creative fixture opening. Final creative fixture sentence." },
    family: "  Family fixture opening. Final family fixture sentence.\n",
    coworkers: { experience: "Legacy experience.", advice: "Legacy advice.", astro: "Legacy facts." },
    exes: " \n\t ",
    complicated: { body: " \n ", summary: "Complete complicated fixture." }
  };
  const fixture = { id: "composite-variant-fixture", content_key: key, surface: "composite", mode: "feed", event_type: "composite-aspect", status: "DRAFT", lane: "serving", review_state: null,
    headline: "Composite fixture", body: fullBody, summary: "Shared fixture summary.", sections: { byRelationshipType: variants }, source_snapshot: {}, facts: {}, provider: "manual-admin", updated_at: "2026-09-08T00:00:00Z" };
  const store = await createApiStore([fixture]);
  try {
    const draftReader = await store.invoke("POST", { keys: [key] }, "/api/content-reader");
    assert.equal(draftReader.status, 200);
    assert.equal(draftReader.payload.rows.length, 0, "Draft relationship variants must never reach the public reader.");
    const edited = await store.invoke("PATCH", { id: fixture.id, sections: { byRelationshipType: { ...variants, privateEditorNotes: "Do not expose." }, privateReview: "Do not expose." }, expectedUpdatedAt: fixture.updated_at });
    assert.equal(edited.status, 200);
    const reopened = await store.invoke("GET", undefined, `/api/admin/generated-content?id=${fixture.id}`);
    assert.deepEqual(reopened.payload.rows[0].sections.byRelationshipType, { ...variants, privateEditorNotes: "Do not expose." });
    assert.equal((await store.invoke("PATCH", { id: fixture.id, body: "Stale fixture edit.", expectedUpdatedAt: fixture.updated_at })).status, 409);
    // Existing publication machinery is verified elsewhere; this isolated seed
    // now models an already-published owner revision for the public read path.
    const saved = store.rows.get(fixture.id);
    store.rows.set(fixture.id, { ...saved, status: "LIVE", lane: "serving", review_state: null });
    const reader = await store.invoke("POST", { keys: [key] }, "/api/content-reader");
    assert.equal(reader.status, 200);
    assert.equal(reader.payload.rows.length, 1);
    const publicRow = reader.payload.rows[0];
    assert.equal(publicRow.sections.privateReview, undefined);
    assert.deepEqual(publicRow.sections.byRelationshipType, variants, "The actual reader boundary must retain saved variant fields.");
    const content = new Map([[key, { id: publicRow.id, contentKey: key, body: publicRow.body, summary: publicRow.summary, sections: publicRow.sections, sourceSnapshot: publicRow.source_snapshot, updatedAt: publicRow.updated_at }]]);
    for (const [relationshipType, expected] of [["friend", variants.friendship.body], ["romantic", variants.romantic.summary], ["business", variants.creative.copy], ["family", variants.family], ["coworker", "Legacy experience.\n\nLegacy advice.\n\nLegacy facts."], ["ex", fullBody], ["situationship", variants.complicated.summary], [null, fullBody]]) {
      const resolved = runtime.normalizeCompositeAspectSurface(aspect, content, relationshipType);
      assert.equal(resolved.sections[0].body, expected, `Reader relationship mapping: ${relationshipType}`);
    }
  } finally { store.close(); }
  installContentPublications([{ content_key: key, state: "retired", revision: 1, row_id: null, row_updated_at: null, updated_at: "2026-09-08T00:00:00Z" }]);
  assert.equal(runtime.normalizeCompositeAspectSurface(aspect, generated).status, "not-servable", "Retirement must block loaded and bundled copy");
  console.log("Composite write-up app resolution and rendered-card regression passed.");
} finally {
  await vite.close();
}
