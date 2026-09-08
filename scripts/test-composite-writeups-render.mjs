import assert from "node:assert/strict";
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
  installContentPublications([{ content_key: key, state: "retired", revision: 1, row_id: null, row_updated_at: null, updated_at: "2026-09-08T00:00:00Z" }]);
  assert.equal(runtime.normalizeCompositeAspectSurface(aspect, generated).status, "not-servable", "Retirement must block loaded and bundled copy");
  console.log("Composite write-up app resolution and rendered-card regression passed.");
} finally {
  await vite.close();
}
