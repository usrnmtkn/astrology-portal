import assert from "node:assert/strict";
import { transitNatalExactActionLabel, transitSourceEditScope, transitExactPassageState } from "../apps/admin/src/transitNatalEditorScope.ts";

assert.equal(transitNatalExactActionLabel(false, "Sun trine your Sun"), "Write Sun trine your Sun");
assert.equal(transitNatalExactActionLabel(true, "Sun sextile your Sun"), "Edit Sun sextile your Sun");
assert.throws(() => transitNatalExactActionLabel(false, "  "), /transit title/);

// Identity-shaped synthetic keys only. This tests editing scope, not chart support
// or availability of approved reader copy for every combination.
const planets = ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "uranus", "neptune", "pluto", "chiron", "north-node", "south-node", "lilith"];
const points = [...planets, "ascendant", "midheaven", "descendant", "imum-coeli"];
const aspects = ["conjunction", "opposition", "square", "trine", "sextile"];
let contacts = 0;
for (const planet of planets) for (const natal of points) for (const aspect of aspects) {
  const exact = `authored/transit-aspect/${planet}/${natal}/${aspect}`;
  for (const audience of ["you", "they"]) {
    assert.equal(transitSourceEditScope(exact, exact).kind, "exact", audience);
    assert.equal(transitSourceEditScope(exact, `${exact}/2`).kind, "exact-variant");
    assert.equal(transitSourceEditScope(exact, `${exact}-other`).kind, "shared");
    for (const other of aspects.filter(candidate => candidate !== aspect)) {
      assert.equal(transitSourceEditScope(exact, `authored/transit-aspect/${planet}/${natal}/${other}`).kind, "shared");
    }
    for (const group of ["soft", "hard", "any"]) {
      assert.equal(transitSourceEditScope(exact, `authored/transit-aspect/${planet}/${natal}/${group}`).kind, "shared");
      assert.equal(transitSourceEditScope(exact, `authored/transit-aspect/${planet}/${natal}/${group}/2`).kind, "shared");
    }
    contacts++;
  }
}
const key = "authored/transit-aspect/sun/sun/sextile";
assert.match(transitSourceEditScope(key, "authored/transit-aspect/sun/sun/soft").explanation, /trines and sextiles/);
const situation = "authored/transit-aspect/sun/sun/sextile/virgo/3/3";
assert.equal(transitSourceEditScope(situation, situation).kind, "exact");
assert.equal(transitSourceEditScope(situation, key).kind, "shared");
assert.match(transitSourceEditScope(situation, key).explanation, /six-part situation is saved separately/);
assert.match(transitSourceEditScope(key, "authored/transit-aspect/sun/sun/hard").explanation, /squares and oppositions/);
assert.equal(transitSourceEditScope(null, key).kind, "shared");
assert.equal(transitSourceEditScope(key, "fallback-hook/transit-effect-soft/sun").kind, "shared");
assert.equal(transitSourceEditScope("authored/transit-return/mars", "authored/transit-return/mars").kind, "exact");
assert.equal(transitSourceEditScope("authored/transit-return/mars", "authored/transit-return/venus").kind, "shared");

assert.equal(transitExactPassageState(key, { rows: [] }).exists, false);
assert.equal(transitExactPassageState(key, { rows: [], packageSource: { contentKey: key, body_you: "Synthetic package passage." } }).exists, true);
for (const status of ["DRAFT", "LIVE", "REVIEWED", "ARCHIVED", "RETIRED", "ERROR", "unknown"]) {
  const payload = { rows: [{ id: "synthetic-row", content_key: key, status, updated_at: "2026-01-01T00:00:00Z" }], packageSource: null };
  const before = structuredClone(payload);
  const state = transitExactPassageState(key, payload);
  assert.equal(state.exists, true);
  assert.equal(state.savedStatus, status.toUpperCase());
  assert.deepEqual(payload, before, "Reading editor state must not mutate any saved data");
  if (status === "DRAFT") assert.match(state.detail, /does not appear in the reader preview until reviewed and published/);
  if (status === "LIVE") assert.match(state.detail, /source actually in use/);
}
for (const payload of [null, [], {}, { rows: "bad" }, { rows: [null] }, { rows: [{ id: "x", content_key: `${key}/wrong` }] }, { rows: [{ id: "", content_key: key }] }, { rows: [], packageSource: { contentKey: "wrong", body: "Synthetic" } }, { rows: [], packageSource: { contentKey: key, body: " " } }, { rows: [{ id: "x", content_key: key }, { id: "y", content_key: key }] }]) {
  assert.throws(() => transitExactPassageState(key, payload), /could not be verified/);
}
console.log(`Transit editor scope passed: ${contacts} identity/audience cases; exact/variant/shared boundaries; saved-state validation; no data mutations.`);
