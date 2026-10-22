import assert from "node:assert/strict";
import { natalEditorialDraftForKey, natalEditorialIdentity, natalEditorialSelection, natalSectPlanets, type NatalEditorialSelection } from "../apps/admin/src/natalEditorialLibrary.ts";
import { createApiStore } from "../tests/helpers/calendar-review-api.mjs";

const selections: NatalEditorialSelection[] = [];
for (const audience of ["you", "they"] as const) {
  for (const passage of ["introduction", ...Array.from({ length: 12 }, (_, i) => String(i + 1))]) selections.push({ area: "rulership", audience, passage, sect: "day" });
  for (const sect of ["day", "night"] as const) for (const passage of ["overview", ...natalSectPlanets]) selections.push({ area: "day-night", audience, passage, sect });
}
assert.equal(selections.length, 46);
const keys = selections.map(selection => natalEditorialIdentity(selection).contentKey);
assert.equal(new Set(keys).size, 46);
const api = await createApiStore([]);
for (const [index, selection] of selections.entries()) {
  const identity = natalEditorialIdentity(selection);
  const draft = natalEditorialDraftForKey(identity.contentKey)!;
  assert(draft);
  assert.equal(draft.headline, identity.title);
  assert.equal(draft.body, "");
  assert.equal(draft.summary, "");
  assert.equal(draft.sourceSnapshot.ownerApproved, false);
  assert.equal(draft.sourceSnapshot.promotionAuthorized, false);
  assert.deepEqual(draft.sourceSnapshot.allowedSlots, selection.audience === "they" ? ["ownerName"] : []);
  const body = `${selection.audience === "they" ? "{{ownerName}}" : "You"} opening fixture ${index}.\n\nFinal fixture ${index}.`;
  const { id: _id, ...fields } = draft;
  const created = await api.invoke("POST", { ...fields, body });
  assert.equal(created.status, 200, JSON.stringify(created.payload));
  const saved = created.payload.rows[0];
  assert.equal(saved.body, body);
  assert.equal(saved.status, "DRAFT");
  assert.equal(saved.published_at ?? null, null);
  const revised = await api.invoke("PATCH", { id: saved.id, expectedUpdatedAt: saved.updated_at, body: `${body}\n\nRetained revision.`, status: "DRAFT" });
  assert.equal(revised.status, 200, JSON.stringify(revised.payload));
  const stale = await api.invoke("PATCH", { id: saved.id, expectedUpdatedAt: saved.updated_at, body: "Stale overwrite.", status: "DRAFT" });
  assert.equal(stale.status, 409);
  const stored = api.rows.get(saved.id);
  assert.equal(stored.body, `${body}\n\nRetained revision.`);
}
for (const key of ["cms/natal-twelfth-ruler/you/ruler-house/0", "cms/natal-twelfth-ruler/you/ruler-house/13", "cms/natal-planet-sect/you/neptune/night", "cms/natal-planet-sect/friend/saturn/night", "cms/natal-chart-context/you/sect/any"]) assert.equal(natalEditorialDraftForKey(key), null);
assert.equal(natalEditorialSelection("rulership", "#exact-content?natalPassage=bogus").passage, "introduction");
assert.equal(natalEditorialSelection("day-night", "#exact-content?natalAudience=they&natalPassage=saturn&natalSect=night").passage, "saturn");
api.close();
console.log("PASS natal editorial library: 46 independent identities; actual create/edit persistence, stale-write protection, exact paragraphs, Friend slots and draft holds. No provider or live storage calls.");
