import assert from "node:assert/strict";
import { createApiStore } from "../tests/helpers/calendar-review-api.mjs";
import { connectionSourceDraft } from "../apps/admin/src/connectionTransitSources";
import { connectionActivationKey, connectionBridgeTemplates } from "../apps/web/src/content/connectionTransit";
import { publishedConnectionCopy } from "../apps/web/src/features/friends/connectionTransitSources";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState";
const store = await createApiStore([]);
for (const key of [connectionActivationKey("ascendant", "square", "saturn")!, ...connectionBridgeTemplates.map(t => t.contentKey)]) {
  const draft = connectionSourceDraft(key);
  const { id, ...input } = draft;
  const created = await store.invoke("POST", { ...input, eventType: "connection-source", reviewStatus: "needs_review" });
  assert.equal(created.status, 200, JSON.stringify(created.payload));
  let row = created.payload.rows[0];
  assert.equal(row.status, "DRAFT");
  const read = async () => {
    const result = await fetch("/api/content-reader", {method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({keys:[key]})});
    assert.equal(result.status,200);return result.json();
  };
  assert.equal((await read()).rows.length,0,"Drafts must stay out of the actual public API");
  const activation = key.startsWith("authored/");
  const proposed = activation ? {body_you:"You speak to {{holder1}}. The final sentence stays complete.",body_they:""} : {body:"{{transitPlanet}} is {{transitAspectWord}} {{holder1}}'s {{endpointPoint}}."};
  const saved = await store.invoke("PATCH", {id:row.id,expectedUpdatedAt:row.updated_at,sections:{...row.sections,packageDraft:proposed},reviewStatus:"needs_review"});
  assert.equal(saved.status,200,JSON.stringify(saved.payload));row=saved.payload.rows[0];
  assert.equal((await read()).rows.length,0);
  const published=await store.invoke("PATCH",{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:"approve-package-revision"});
  assert.equal(published.status,200,JSON.stringify(published.payload));row=published.payload.rows[0];
  const publicResult=await read();assert.equal(publicResult.rows.length,1,"Published connection content must reach the real reader projection");
  installContentPublications(publicResult.publications);
  const variables={holder1:"River $&",transitPlanet:"Saturn",transitAspectWord:"sextile",endpointPoint:"Ascendant"};
  const expected=(activation?proposed.body_you:proposed.body)!.replace(/\{\{(\w+)\}\}/gu,(_,name)=>variables[name]);
  assert.equal(publishedConnectionCopy(publicResult.rows,key,variables),expected);
  const retired=await store.publication('https://calendar-api.invalid/rest/v1/rpc/retire_content_everywhere',{
    method:'POST',body:JSON.stringify({p_content_key:key,p_row_id:row.id,p_expected_updated_at:row.updated_at})
  });
  assert(retired?.ok,await retired?.text());
  assert.equal((await read()).rows.length,0);
}
await store.close();
console.log("Connection publication passed: real handler draft/reopen/publication, actual public API projection, literal variables, retirement and no production writes.");
