import assert from "node:assert/strict";
import { skyPlacementSourceCorpus as corpus, skyPlacementSourceRecords as records } from "../api/_lib/sky-placement-sources";
import { createPublishedSkyReader } from "../apps/web/src/content/skyPlacementPublishedSources";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState";
import { contentLiveStatuses } from "../api/_lib/content-live-status";
const key = "sky-placement/article/saturn/aries";
const rxKey = "sky-placement/retrograde/saturn";
const original = JSON.stringify(corpus);
const base = records.get(key)!;
const rx = records.get(rxKey)!;
assert(base && rx);
let sources: any[] = [];
const reader = createPublishedSkyReader(corpus, undefined, () => sources);
const input = { route: "placement", planet: "saturn", sign: "aries", isRetrograde: true };
assert(reader(input).readerParts.includes(rx.Body));
assert(reader(input).readerParts.includes(base.placementArticle));
const virtual = { id: `package:${key}`, content_key: key, sections: { packageRecord: base } } as any;
assert.equal(contentLiveStatuses([virtual])[0].live, true);
for (let version = 1; version <= 2; version++) {
  const time = `2026-09-08T01:00:0${version}.000Z`;
  sources = [{ ...base, studio_version_status: "approved-serving-revision", placementArticle: `Approved test revision ${version}.`, publicationRowId: "article-test", publicationRowUpdatedAt: time },
    { ...rx, studio_version_status: "approved-serving-revision", Body: `Approved test retrograde ${version}.`, publicationRowId: "rx-test", publicationRowUpdatedAt: time }];
  installContentPublications(sources.map(row => ({ content_key: row.contentKey, state: "live", revision: version, row_id: row.publicationRowId, row_updated_at: time, updated_at: time })));
  assert(reader(input).readerParts.includes(`Approved test revision ${version}.`));
  assert(reader(input).readerParts.includes(`Approved test retrograde ${version}.`));
  assert(!reader(input).readerParts.includes(base.placementArticle));
  assert(!reader(input).readerParts.includes(rx.Body));
}
sources[0] = { ...sources[0], review_status: "needs_review" };
assert.throws(() => reader(input), /SOURCE_GAP/);
sources[0] = { ...sources[0], review_status: "approved", publicationRowUpdatedAt: "2026-09-08T01:00:01.000Z" };
assert.throws(() => reader(input), /SOURCE_GAP/);
installContentPublications([{ content_key: rxKey, state: "retired", revision: 3, row_id: null, row_updated_at: null, updated_at: "2026-09-08T01:00:03Z" }]);
assert.throws(() => reader({ contentKey: rxKey }), /SOURCE_GAP/);
assert.equal(JSON.stringify(corpus), original, "approved corpus remains byte-identical");
console.log("PASS: current published Sky article/Rx revisions replace the baseline, repeated edits, stale/draft rejection and retirement.");
