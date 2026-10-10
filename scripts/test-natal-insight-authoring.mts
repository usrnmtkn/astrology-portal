import assert from "node:assert/strict";
import { studioApiStore } from "../tests/helpers/studio-api-store.ts";
import { natalAuthoringUser, natalAuthoringChart, natalAuthoringVersion, natalAuthoringSky, natalAuthoringFixtures } from "../tests/helpers/natal-authoring-fixture.ts";
import { natalInsightTopics } from "../apps/web/src/content/natalInsightCatalog.ts";
import { natalInsightReadingKey } from "../apps/web/src/services/natalInsightReading.ts";
import { natalSnapshotWithBirthTimeReliability } from "../apps/web/src/services/birthTimeReliability.ts";
const store = await studioApiStore([], { personalized: true, chartFixtures: natalAuthoringFixtures });
const endpoint = "/api/admin/user-generated-content";
try {
  const search = await store.call({ method: "GET", url: `${endpoint}?view=readers&query=Synthetic` });
  assert.equal(search.status, 200); assert.equal(search.payload.readers[0].userId, natalAuthoringUser);
  assert.equal(Object.hasOwn(search.payload.readers[0], "data"), false);
  const charts = await store.call({ method: "GET", url: `${endpoint}?view=charts&userId=${natalAuthoringUser}` });
  assert.equal(charts.payload.charts.length, 2);
  const input = { userId: natalAuthoringUser, subjectId: natalAuthoringChart, audience: "friend", topic: "emotional-needs", chartVersion: natalAuthoringVersion, sky: natalAuthoringSky };
  assert.equal((await store.call({ method: "POST", body: { ...input, chartVersion: "old" }, url: endpoint })).status, 409);
  assert.equal((await store.call({ method: "POST", body: { ...input, subjectId: "another-chart" }, url: endpoint })).status, 404);
  assert.equal((await store.call({ method: "POST", body: { ...input, sky: {} }, url: endpoint })).status, 400);
  for (const audience of ["you", "friend"] as const) for (const topic of natalInsightTopics) {
    const request = { ...input, audience, topic: topic.id, subjectId: audience === "you" ? natalAuthoringUser : natalAuthoringChart };
    const created = await store.call({ method: "POST", body: request, url: endpoint });
    assert.equal(created.status, 200, JSON.stringify(created.payload));
    const row = created.payload.rows[0];
    assert.equal(row.content_key, await natalInsightReadingKey(topic.id, natalAuthoringSky as any, true, audience));
    assert.equal(row.status, "DRAFT"); assert.equal(row.body, ""); assert.equal(row.user_id, natalAuthoringUser);
    assert.equal(row.facts.topic, topic.id);
    assert.equal((await store.call({ method: "PATCH", body: { id: row.id, expectedUpdatedAt: row.updated_at, status: "LIVE" }, url: endpoint })).status, 400);
    const body = `Synthetic ${topic.id} opening.\n\nA full passage with **formatting**, café and an exact final sentence.`;
    const saved = await store.call({ method: "PATCH", body: { id: row.id, expectedUpdatedAt: row.updated_at, body, status: "LIVE" }, url: endpoint });
    assert.equal(saved.status, 200); assert.equal(saved.payload.rows[0].body, body);
    const reopened = await store.call({ method: "POST", body: request, url: endpoint });
    assert.equal(reopened.payload.rows[0].id, row.id); assert.equal(reopened.payload.rows[0].body, body); assert.equal(reopened.payload.rows[0].status, "LIVE");
    const stale = await store.call({ method: "PATCH", body: { id: row.id, expectedUpdatedAt: row.updated_at, body: "stale" }, url: endpoint });
    assert.equal(stale.status, 409);
  }
  assert.equal((await store.call({ method: "GET", url: `${endpoint}?status=all&limit=100` })).payload.rows.length, 14);
  console.log("PASS manual natal authoring: reader/chart discovery, seven topics × two audiences, reader-identical keys, blank draft creation, idempotent reopen, complete published text, stale-edit and changed-chart protection.");
} finally { store.close(); }

// Saved birth-time metadata takes precedence over a stale calculated snapshot,
// exactly as it does when the Friends reader loads a manual chart.
const unknownFixtures = structuredClone(natalAuthoringFixtures);
unknownFixtures.manual_charts[0].birth_time_unknown = true;
const unknownStore = await studioApiStore([], { personalized: true, chartFixtures: unknownFixtures });
try {
  const charts = await unknownStore.call({ method: "GET", url: `${endpoint}?view=charts&userId=${natalAuthoringUser}` });
  assert.equal(charts.payload.charts.find((chart: any) => chart.subjectId === natalAuthoringChart).birthTimeKnown, false);
  const sky = natalSnapshotWithBirthTimeReliability(natalAuthoringSky as any, false)!;
  const created = await unknownStore.call({ method: "POST", url: endpoint, body: {
    userId: natalAuthoringUser, subjectId: natalAuthoringChart, audience: "friend", topic: "home-belonging", chartVersion: natalAuthoringVersion, sky
  } });
  assert.equal(created.status, 200, JSON.stringify(created.payload));
  assert.equal(created.payload.rows[0].content_key, await natalInsightReadingKey("home-belonging", sky, false, "friend"));
  assert.equal(created.payload.rows[0].facts.birthTimeKnown, false);
  assert.deepEqual(created.payload.rows[0].facts.houses, []);
  console.log("PASS saved birth-time metadata overrides stale snapshot reliability for private authoring and reader identity.");
} finally { unknownStore.close(); }
