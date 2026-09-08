import assert from "node:assert/strict";
import { skyPlacementSourceCorpus as corpus, skyPlacementSourceRecords as records } from "../api/_lib/sky-placement-sources";
import { renderSkyV4ReaderRoute, renderSkyV4StudioPreview } from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementV4Canonical.mjs";
import { renderSkyV4ReaderRoute as shippedReader } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import { skyEvergreenFields, validateSkyEvergreenSections } from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyEvergreenSections.mjs";
import { createPublishedSkyReader } from "../apps/web/src/content/skyPlacementPublishedSources";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState";
import { skyPlacementAssembly } from "../apps/admin/src/skyPlacementAssembly";

const key = "sky-placement/article/saturn/aries";
const base = records.get(key)!;
const original = JSON.stringify(corpus);
const input = { route: "placement", planet: "saturn", sign: "aries", isRetrograde: true, articleAvailable: false };
const layout = [
  { id: "turn", source: "turn" },
  { id: "extra", label: "Editor-only label", body: "Fixture optional evergreen paragraph." },
  { id: "empty", label: "Empty section", body: " \n " },
  { id: "hook", source: "hook" },
  { id: "lived", source: "lived" }
];
const changed = structuredClone(corpus);
const article = changed.content.continuous.find((row: any) => row.contentKey === key);
article.placementArticle = "";
article.fallback.sections = layout;
article.fallback.lived = "";
const expected = [base.fallback.turn, layout[1].body, base.fallback.hook].join("\n\n");
for (const render of [renderSkyV4ReaderRoute, shippedReader]) {
  const output = render(changed, input);
  assert.equal(output.resolution, "exact-fallback");
  assert.equal(output.mainBody, expected);
  assert(output.readerParts.includes(expected));
  assert.equal(output.readerParts[0], records.get("sky-placement/retrograde/saturn")!.Body);
  assert(!output.page.includes("Editor-only label"));
  assert(!output.page.includes("Empty section"));
  assert(!output.readerParts.join("\n").includes(base.placementArticle));
  assert.deepEqual(render(corpus, { ...input, articleAvailable: true }).readerParts,
    renderSkyV4ReaderRoute(corpus, { ...input, articleAvailable: true }).readerParts);
}
const preview = renderSkyV4StudioPreview(corpus, { ...input, contentKey: key, draftFields: { "fallback.sections": layout, "fallback.lived": "" } });
assert.equal(preview.mainBody, expected);
const studioRow: any = { content_key: key, sections: { packageRecord: base, packageDraft: { fallback: { sections: layout, lived: "" } } } };
const mapped = skyPlacementAssembly([studioRow], "fallback").parts.filter(field => field.path.startsWith("fallback.") && field.value.trim());
assert.equal(mapped.map(field => field.value).join("\n\n"), expected);

const time = "2026-09-08T09:00:00.000Z";
const revision = { ...base, placementArticle: "", fallback: article.fallback, studio_version_status: "approved-serving-revision", publicationRowId: "evergreen-test", publicationRowUpdatedAt: time };
installContentPublications([{ content_key: key, state: "live", revision: 1, row_id: "evergreen-test", row_updated_at: time, updated_at: time }]);
const reader = createPublishedSkyReader(corpus, undefined, () => [revision]);
assert.equal(reader({ ...input, articleAvailable: true }).mainBody, expected);
revision.publicationRowUpdatedAt = "2026-09-08T10:00:00.000Z";
installContentPublications([{ content_key: key, state: "live", revision: 2, row_id: "evergreen-test", row_updated_at: revision.publicationRowUpdatedAt, updated_at: revision.publicationRowUpdatedAt }]);
revision.fallback = { ...revision.fallback, sections: [{ id: "invalid", source: "planetFrame" }] };
assert.throws(() => reader(input), /evergreen/i);
assert.throws(() => reader(input), /evergreen/i, "a rejected revision must never reuse the previous renderer on its next read");
assert.equal(JSON.stringify(corpus), original, "approved corpus must remain byte-identical");
installContentPublications([]);
article.fallback.sections = [];
for (const render of [renderSkyV4ReaderRoute, shippedReader]) {
  const empty = render(changed, input);
  assert.equal(empty.resolution, "facts-only");
  assert.deepEqual(empty.readerParts, [], "no legacy body or frame can reappear under empty canonical copy");
}
for (const invalid of [null, {}, [{ id: "x", source: "planetFrame" }], [{ id: "x", label: "x", body: "ok", serving_enabled: true }], [layout[0], layout[0]]]) {
  assert.throws(() => validateSkyEvergreenSections(invalid));
}
assert.equal(skyEvergreenFields(base).length, 3);
console.log("PASS: evergreen section order, custom/blank sections, canonical and shipped reader parity, Studio map, exact publication and immutable baselines.");
