import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { servingPackageRecords } from "../api/_lib/serving-package-records";
import { relatedLunationHoroscopes, skyWriteupRelatedSourcePrefixes } from "../apps/admin/src/skyWriteupRelations";
import { isLunationHoroscopeKey, lunationRisingSigns } from "../src/shared/lunationHoroscopeIdentity";
import { lunationHoroscopeIdentities } from "../src/shared/lunationHoroscopeIdentities";
import { createApiStore } from "../tests/helpers/calendar-review-api.mjs";
import { contentWiringStatus } from "../apps/admin/src/contentWiringStatus";

const directory = mkdtempSync(join(tmpdir(), "lunation-horoscopes-"));
try {
  const bundle = join(directory, "reader.mjs");
  await build({ stdin: { contents: `
    export { resolveLunationArticleHoroscopes, lunationArticleHoroscopeKeys, lunationArticleContentKeys,
      lunationArticleSnapshotKeys, loadDatedLunationArticle, lunationAspectCandidates,
      lunationArticleHoroscopeCards } from './apps/web/src/content/lunationArticleHoroscopes';
    export { loadLunationBookFallbackArchitectureV3Bundle, installFallbackArchitectureV3Bundle,
      loadFallbackArchitectureV3BundledCoreManifest, transitSynastryFallbackRendererV3 } from './apps/web/src/content/fallbackArchitectureV3Runtime';
    export { packageFallbackArchitectureV3CoreRows, packageAuthoredCardFromRow } from './apps/web/src/services/fallbackArchitectureV3CorePackaging';
    export { installContentPublications } from './apps/web/src/content/contentPublicationState';
    export { generatedContentMapFromRows } from './apps/web/src/services/generatedContent';
  `, resolveDir: process.cwd(), loader: "ts" }, bundle: true, outfile: bundle, platform: "node", format: "esm",
    define: { "import.meta.env": "{}" }, logLevel: "silent" });
  const reader = await import(pathToFileURL(bundle).href);
  assert.equal(reader.packageAuthoredCardFromRow({ id: 'ordinary-card', content_key: 'authored/transit/saturn/sun/trine',
    body: 'Saved owner revision. Complete final sentence.', sections: { packageRecord: { body: 'Stale packaged copy.' } } })?.body,
    'Saved owner revision. Complete final sentence.', 'Ordinary authored cards retain the complete saved top-level revision.');
  await reader.loadLunationBookFallbackArchitectureV3Bundle();
  for (const kind of ["new-moon", "full-moon"] as const) for (const sign of lunationRisingSigns) {
    const event = { startsAt: "2026-10-26T04:00:00Z", sign, phase: kind };
    const identities = lunationHoroscopeIdentities(kind, sign);
    assert(identities.every(entry => isLunationHoroscopeKey(entry.contentKey)));
    const resolved = reader.resolveLunationArticleHoroscopes(event, new Map());
    const cards = reader.lunationArticleHoroscopeCards(event, new Map());
    assert.equal(cards[0].risingSign, 'Aries');
    assert.deepEqual(cards.map(entry => entry.body), resolved.map(entry => entry.body), 'Reader labels preserve every complete passage.');
    assert.equal(resolved.length, 12, `${kind}/${sign}`);
    assert.deepEqual(reader.lunationArticleHoroscopeKeys(event), identities.map(entry => entry.contentKey));
    const rows = identities.map(identity => {
      const record = servingPackageRecords.get(identity.contentKey)!;
      const passage = resolved.find(entry => entry.risingSign === identity.risingSign);
      assert.equal(passage?.body, record.body, `Complete approved reader copy: ${identity.contentKey}`);
      assert.equal(passage?.house, identity.house);
      return { id: `package:${identity.contentKey}`, content_key: identity.contentKey, body: record.body };
    });
    const preview = relatedLunationHoroscopes(rows, { kind, sign, eclipse: "none" });
    assert.equal(preview.length, 12);
    assert(preview.every(entry => entry.sourceReady));
    for (const entry of preview) {
      assert.equal(entry.preview, resolved.find(passage => passage.risingSign === entry.risingSign)?.body);
      assert.deepEqual(entry.sources.map(source => source.role), ["RATM horoscope"]);
    }
  }
  const event = { startsAt: "2026-10-26T04:00:00Z", sign: "taurus", phase: "full-moon" };
  const moon = { moonEvent: { occursAt: event.startsAt, sign: event.sign, name: 'Full Moon' } };
  assert.deepEqual(reader.lunationArticleSnapshotKeys(moon), reader.lunationArticleContentKeys({ ...event, title: 'Full Moon' }));
  assert.deepEqual(reader.lunationArticleSnapshotKeys({ moonEvent: { ...moon.moonEvent, sign: 'cancer' } }, event),
    reader.lunationArticleContentKeys(event), 'The selected calendar lunation takes precedence over the snapshot Moon.');
  assert.equal(await reader.loadDatedLunationArticle({}, 'invalid-date', 'taurus', new Map(),
    () => { throw new Error('Invalid dates must not load sources.'); }, () => true), null);
  assert.deepEqual(reader.lunationAspectCandidates([
    { from: 'Venus', to: 'Mars', orb: 0 }, { from: 'Sun', to: 'Saturn', separation: 61, exactAngle: 60, orb: 0 },
    { from: 'Sun', to: 'Venus', orb: 0.5 }, { from: 'Moon', to: 'Mars', orb: 0.5 }
  ]).map(entry => `${entry.from}/${entry.to}`), ['Moon/Mars', 'Sun/Venus', 'Sun/Saturn'],
    'Lunar aspects use calculated separation, with Moon priority at equal orbs.');
  const identity = lunationHoroscopeIdentities("full-moon", "taurus")[0];
  assert.equal(isLunationHoroscopeKey(identity.contentKey), true);
  assert.equal(contentWiringStatus({ content_key: identity.contentKey, lane: "reference" }).state, "connected");
  assert.equal(isLunationHoroscopeKey(identity.contentKey.replace("house-2", "house-3")), false);
  assert.equal(isLunationHoroscopeKey(identity.contentKey.replace("taurus/", "invalid/")), false);
  assert.equal(isLunationHoroscopeKey(identity.contentKey.replace("rising-aries", "rising-invalid")), false);
  assert.equal(isLunationHoroscopeKey(identity.contentKey.replace("house-2", "house-02")), false);
  assert.equal(isLunationHoroscopeKey(`${identity.contentKey}/extra`), false);
  const datedKey = "cms/lunation-article/2026-10-26/full-moon/taurus";
  const dated = { contentKey: datedKey, body: "Synthetic dated article.", headline: "Synthetic title.", sections: {
    articleHoroscopes: { schema: "sky-article-horoscopes-v1", heading: "## Horoscopes", introduction: "",
      passages: lunationHoroscopeIdentities("full-moon", "taurus").map(entry => ({ ...entry, heading: entry.risingSign, body: `Synthetic dated ${entry.risingSign} opening. Complete dated ending.` })) }
  } };
  assert(reader.resolveLunationArticleHoroscopes(event, new Map([[datedKey, dated]])).every(entry => entry.body.startsWith("Synthetic dated")),
    "A complete dated article horoscope section wins over the fallback.");
  assert.equal(relatedLunationHoroscopes([{ id: "draft", content_key: identity.contentKey, body: "Published copy.",
    sections: { packageDraft: { body: "Synthetic unpublished edit." } } }],
    { kind: "full-moon", sign: "taurus", eclipse: "none" })[0].preview, "Synthetic unpublished edit.");
  const prefix = "authored/book-ritual-and-the-moon/lunation-horoscope/full-moon/taurus/";
  assert(skyWriteupRelatedSourcePrefixes({ id: "moon", content_key: "authored/sky-lunation-macro/full-moon/taurus" }).includes(prefix));
  assert(relatedLunationHoroscopes([{ id: "old", content_key: "fallback-hook/lunation-horoscope/full", body: "Old frame." }],
    { kind: "full-moon", sign: "taurus", eclipse: "none" }).every(entry => !entry.preview && !entry.sourceReady));
  assert.deepEqual(reader.lunationArticleHoroscopeKeys({ ...event, eclipseType: "lunar" }), []);
  assert.deepEqual(reader.lunationArticleHoroscopeKeys({ ...event, sign: "invalid" }), []);
  reader.installContentPublications([{ content_key: identity.contentKey, state: "retired", revision: 1,
    row_id: null, row_updated_at: null, updated_at: "2026-10-29T12:00:00Z" }]);
  assert.equal(reader.resolveLunationArticleHoroscopes(event, new Map()).length, 11, "Retirement cannot reveal the book original.");

  const record = servingPackageRecords.get(identity.contentKey)!;
  const row = { id: "a0000000-0000-4000-8000-000000000071", content_key: identity.contentKey,
    headline: record.headline, summary: "", body: record.body, surface: "you", mode: "in_depth",
    status: "LIVE", lane: "serving", review_state: null, provider: "tldrastro-fallback-architecture-v3",
    block_type: "fallback_hook", event_type: "fallback-hook", target_date: null, flags: [],
    sections: { packageRecord: record, packageOriginalRecord: structuredClone(record) },
    source_snapshot: { sourcePackage: "tldrastro-fallback-architecture-v3", content_role: "full_copy", review_status: "approved" },
    facts: { fallbackArchitectureV3: true }, updated_at: "2026-10-29T12:00:00Z" };
  const store = await createApiStore([row]);
  try {
    const keys = new URLSearchParams({ status: "all", visibility: "all", limit: "64" });
    lunationHoroscopeIdentities("full-moon", "taurus").forEach(entry => keys.append("contentKeys", entry.contentKey));
    const sources = await store.invoke("GET", undefined, `/api/admin/generated-content?${keys}`);
    assert.equal(sources.status, 200);
    assert.equal(sources.payload.rows.length, 12, "Studio retrieves saved sources and missing package originals together.");
    assert.equal(sources.payload.rows.find(entry => entry.content_key === row.content_key).id, row.id);
    const status = await store.invoke("POST", { ids: [`package:${identity.contentKey}`] }, "/api/admin/content-live-status");
    assert.equal(status.payload.statuses[0].live, true, "Studio recognizes the approved baseline used by the reader.");
    const body = "A synthetic owner revision opens here.\n\nThe complete revised final sentence stays intact.";
    const saved = await store.invoke("PATCH", { id: row.id, expectedUpdatedAt: row.updated_at,
      sections: { ...row.sections, packageDraft: { ...record, body } }, reviewStatus: "needs_review" });
    assert.equal(saved.status, 200, JSON.stringify(saved.payload));
    const draft = saved.payload.rows[0];
    const reopened = await store.invoke("GET", undefined, `/api/admin/generated-content?id=${draft.id}`);
    assert.equal(reopened.payload.rows[0].sections.packageDraft.body, body);
    const stale = await store.invoke("PATCH", { id: row.id, expectedUpdatedAt: row.updated_at,
      sections: { ...row.sections, packageDraft: { ...record, body: "Stale synthetic change." } } });
    assert.equal(stale.status, 409);
    const published = await store.invoke("PATCH", { id: draft.id, expectedUpdatedAt: draft.updated_at, ownerAction: "approve-package-revision" });
    assert.equal(published.status, 200, JSON.stringify(published.payload));
    const live = published.payload.rows[0];
    const read = await store.invoke("POST", { keys: [row.content_key] }, "/api/content-reader");
    assert.equal(read.status, 200);
    const liveStatus = await store.invoke("POST", { ids: [live.id] }, "/api/admin/content-live-status");
    assert.equal(liveStatus.payload.statuses[0].live, true, "The published revision is reported live in Studio.");
    reader.installContentPublications([{ content_key: row.content_key, state: "live", revision: 2,
      row_id: live.id, row_updated_at: live.updated_at, updated_at: live.updated_at }]);
    assert.equal(reader.resolveLunationArticleHoroscopes(event, new Map()).length, 11, "An unavailable published version cannot reveal older copy.");
    const content = reader.generatedContentMapFromRows(read.payload.rows);
    assert.equal(reader.resolveLunationArticleHoroscopes(event, content).find(entry => entry.contentKey === row.content_key)?.body, body);
    const core = reader.packageFallbackArchitectureV3CoreRows(read.payload.rows, await reader.loadFallbackArchitectureV3BundledCoreManifest());
    assert.equal(core?.transitLib.authoredCards.find(entry => entry.contentKey === row.content_key)?.body, body,
      'Published book edits must also enter the shared fallback renderer used outside the dated article.');
    reader.installFallbackArchitectureV3Bundle(core);
    const shared = reader.transitSynastryFallbackRendererV3.renderLunationHoroscope({
      kind: 'full-moon', sign: 'taurus', risingSign: 'aries', house: 2,
      eventDate: event.startsAt, matchingNewMoon: { sign: 'taurus', exactAt: '2026-05-16T20:00:00Z' },
      ruler: 'venus', rulerHouse: 1, sunHouse: 8, moonHouse: 2
    });
    assert.ok(shared.body.includes(body), 'The shipped shared reader must preserve the published passage opening and ending.');
    reader.installContentPublications([{ content_key: row.content_key, state: 'retired', revision: 3,
      row_id: null, row_updated_at: null, updated_at: live.updated_at }]);
    assert.throws(() => reader.transitSynastryFallbackRendererV3.renderLunationHoroscope({
      kind: 'full-moon', sign: 'taurus', risingSign: 'aries', house: 2,
      eventDate: event.startsAt, ruler: 'venus', rulerHouse: 1, sunHouse: 8, moonHouse: 2
    }), /PUBLICATION|SOURCE_GAP|retired|unavailable/i,
    'The shared reader must not resurrect the book original after retirement.');
    const previews = relatedLunationHoroscopes([
      { id: "old", content_key: row.content_key, body: "Old copy.", updated_at: "2020-01-01T00:00:00Z" },
      { ...live, body }, { id: `package:${row.content_key}`, content_key: row.content_key, body: record.body }
    ], { kind: "full-moon", sign: "taurus", eclipse: "none" });
    assert.equal(previews[0].preview, body, "The newest saved version wins in Studio.");
  } finally { await store.close(); }
  console.log("PASS: all 288 exact RATM passages match Studio and reader, corrected source, whole-sign houses, targeted loading, draft/save/reopen/stale-write/publication/reader flow, shipped shared-renderer publication and retirement, and missing-version protection.");
} finally { rmSync(directory, { recursive: true, force: true }); }
