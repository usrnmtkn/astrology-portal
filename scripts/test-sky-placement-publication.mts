import assert from "node:assert/strict";
import { skyPlacementSourceCorpus as corpus, skyPlacementSourceRecords as records } from "../api/_lib/sky-placement-sources";
import { createPublishedSkyReader } from "../apps/web/src/content/skyPlacementPublishedSources";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState";
import { contentLiveStatuses } from "../api/_lib/content-live-status";
import { makeSkyIngressComposition } from "../apps/web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs";
import { packageHookRowFromRow } from "../apps/web/src/services/fallbackArchitectureV3CorePackaging";
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
const libraryKey = "sky-placement/article/venus/virgo";
const libraryTime = "2026-09-17T18:00:00.000Z";
installContentPublications([{
  content_key: libraryKey, state: "live", revision: 4, row_id: "writing-library-test",
  row_updated_at: libraryTime, updated_at: libraryTime
}]);
const libraryBaseline = records.get(libraryKey)?.placementArticle
  ?? corpus.content.continuous.find((row: { contentKey: string }) => row.contentKey === libraryKey)?.placementArticle;
assert(libraryBaseline, "corpus must still serve Venus in Virgo");
assert(reader({ route: "placement", planet: "venus", sign: "virgo" }).readerParts.includes(libraryBaseline));
assert.equal(JSON.stringify(corpus), original, "approved corpus remains byte-identical");

const v5Key = "sky-placement/article/mercury/cancer";
const v5Base = records.get(v5Key)!;
assert(v5Base, "corpus must include Mercury in Cancer");
const ingress = makeSkyIngressComposition();
ingress.enabled = true;
for (const module of ingress.modules.filter((item: { id: string }) => item.id === "dignity")) module.enabled = false;
for (const module of ingress.modules.filter((item: { required: boolean }) => item.required)) {
  for (const [, name] of module.template.matchAll(/\{\{(\w+)\}\}/gu)) {
    ingress.sources[name].text = `Fixture ${name} for {{planetTitle}} in {{signTitle}}.`;
  }
}
ingress.sources.openingHook.text = "Fixture calculated interval {{passEntryDate}} to {{passExitDate}}.";
ingress.modules.reverse();
const v5Time = "2026-07-09T12:00:00.000Z";
const v5Packaged = packageHookRowFromRow({
  id: "v5-ingress-test",
  content_key: v5Key,
  surface: "sky",
  mode: "in_depth",
  status: "LIVE",
  lane: "serving",
  review_state: null,
  target_date: null,
  provider: "tldrastro-fallback-architecture-v3",
  updated_at: v5Time,
  headline: v5Base.headline,
  body: "",
  summary: v5Base.summary,
  sections: { packageRecord: { ...v5Base, studio_version_status: "approved-serving-revision", placementArticle: "", placementArticleDirect: "", placementArticleRetrograde: "", ingress } },
  facts: { fallbackArchitectureV3: true },
  source_snapshot: { sourcePackage: v5Base.source_package, content_role: v5Base.content_role },
  block_type: "fallback_hook",
  event_type: "fallback-hook"
} as any);
assert(v5Packaged, "an enabled V5 composition must remain packaged without a body");
installContentPublications([{
  content_key: v5Key, state: "live", revision: 20, row_id: "v5-ingress-test",
  row_updated_at: v5Time, updated_at: v5Time
}]);
sources = [v5Packaged];
const v5Rendered = reader({
  route: "placement",
  planet: "mercury",
  sign: "cancer",
  isRetrograde: true,
  ingressOccurrence: {
    passes: [{ entryDate: "2026-06-29T00:00:00.000Z", exitDate: "2026-07-23T00:00:00.000Z", entryMotion: "retrograde" }],
    asOfDate: "2026-07-10T12:00:00.000Z",
    timeZone: "America/New_York"
  }
});
assert(v5Rendered.readerParts.some((part: string) => part.includes("Fixture planetFunctionSentence for Mercury in Cancer.")),
  `V5 overlay must assemble required sentences, received: ${JSON.stringify(v5Rendered.readerParts)}`);
assert.equal(JSON.stringify(corpus), original, "approved corpus remains byte-identical after V5 overlay");
console.log("PASS: current published Sky article/Rx revisions replace the baseline, repeated edits, stale/draft rejection and retirement.");
