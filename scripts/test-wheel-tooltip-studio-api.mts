import assert from "node:assert/strict";
import { studioApiStore } from "../tests/helpers/studio-api-store";
import { wheelTooltipSourceDraft } from "../apps/admin/src/wheelTooltipSources";
import { wheelTooltipFields, wheelTooltipTemplateErrors } from "../apps/web/src/content/wheelTooltipCatalog";
import { fillWheelTooltip, wheelTooltipTemplates } from "../apps/web/src/content/wheelTooltipCopy";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState";

for (const field of wheelTooltipFields) {
  assert.equal(wheelTooltipTemplates()(field.name), field.body);
  assert.deepEqual(wheelTooltipTemplateErrors(field.key, field.body), []);
  for (const invalid of ["", "{{untrusted}}", "<script>unsafe</script>", "{sign}"])
    assert.ok(wheelTooltipTemplateErrors(field.key, invalid).length);
  for (const slot of field.allowedSlots.filter(slot => field.body.includes(`{{${slot}}}`)))
    assert.ok(wheelTooltipTemplateErrors(field.key, field.body.replaceAll(`{{${slot}}}`, "")).length);
}
assert.equal(fillWheelTooltip("{{name}} {{name}}", {name:"$& <literal> {{sign}}"}), "$& <literal> {{sign}} $& <literal> {{sign}}");
assert.equal(fillWheelTooltip("{{missing}}"), null);
assert.ok(wheelTooltipTemplateErrors("cms/wheel-tooltip/unregistered", "Unknown source.").length);
const store = await studioApiStore([], { uuidIds: true });
try {
  const field = wheelTooltipFields.find(field => field.name === "ruler/title")!;
  const { id: _id, ...draft } = wheelTooltipSourceDraft(field.key);
  const created = await store.call({ method: "POST", body: { ...draft, eventType: "cms-surface-override",
    body: "Unregistered {{untrusted}}.", sourceSnapshot: { ...draft.sourceSnapshot, allowedSlots: ["untrusted"] } } });
  assert.equal(created.status, 200, JSON.stringify(created.payload));
  const invalid = await store.call({ method: "PATCH", body: {
    id: created.payload.rows[0].id, expectedUpdatedAt: created.payload.rows[0].updated_at, ownerAction: "publish-owner-content"
  } });
  assert.notEqual(invalid.status, 200, "Client metadata must not widen the canonical tooltip variable contract.");
  for (const field of wheelTooltipFields) {
    const {id: _id, ...starter}=wheelTooltipSourceDraft(field.key);
    const body=`Synthetic opening. ${field.body} Synthetic final sentence.`;
    const result=await store.call({method:"POST",body:{...starter,body,eventType:"cms-surface-override"}});
    assert.equal(result.status,200,JSON.stringify(result.payload));
    let row=result.payload.rows[0];
    assert.equal(row.status,"DRAFT");
    assert.equal((await store.call({method:"POST",url:"/api/content-reader",body:{keys:[field.key]}})).payload.rows.length,0);
    const reopened=await store.call({method:"GET",url:"/api/admin/generated-content?contentKey="+encodeURIComponent(field.key)+"&status=all"});
    assert.equal(reopened.payload.rows.find((candidate:any)=>candidate.id===row.id).body,body);
    const published=await store.call({method:"PATCH",body:{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:"publish-owner-content"}});
    assert.equal(published.status,200,JSON.stringify(published.payload));
    row=published.payload.rows[0];
    const reader=await store.call({method:"POST",url:"/api/content-reader",body:{keys:[field.key]}});
    assert.equal(reader.status,200);
    installContentPublications(reader.payload.publications);
    assert.equal(wheelTooltipTemplates(reader.payload.rows)(field.name),body);
    const invalid=await store.call({method:"PATCH",body:{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:"save-and-publish-owner-content",body:"Invalid {{untrusted}}.",sourceSnapshot:{...starter.sourceSnapshot,allowedSlots:["untrusted"]}}});
    assert.notEqual(invalid.status,200);
    assert.equal((await store.call({method:"POST",url:"/api/content-reader",body:{keys:[field.key]}})).payload.rows[0].body,body);
    assert.equal((await store.call({method:"PATCH",body:{id:row.id,expectedUpdatedAt:"2020-01-01T00:00:00Z",body:"Stale overwrite."}})).status,409);
    const revised=`Revised ${body}`;
    const updated=await store.call({method:"PATCH",body:{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:"save-and-publish-owner-content",body:revised}});
    assert.equal(updated.status,200,JSON.stringify(updated.payload));
    row=updated.payload.rows[0];
    const reread=await store.call({method:"POST",url:"/api/content-reader",body:{keys:[field.key]}});
    installContentPublications(reread.payload.publications);
    assert.equal(wheelTooltipTemplates(reread.payload.rows)(field.name),revised);
    assert.equal(wheelTooltipTemplates([{...row,updated_at:"2020-01-01T00:00:00Z"}])(field.name),null);
    assert.equal(wheelTooltipTemplates([{...row,body:"Invalid {{untrusted}}"}])(field.name),null);
    const retired=await store.call({method:"POST",url:"/api/admin/content-publication",body:{contentKey:field.key,id:row.id,expectedUpdatedAt:row.updated_at,action:"retire"}});
    assert.equal(retired.status,200,JSON.stringify(retired.payload));
    const removed=await store.call({method:"POST",url:"/api/content-reader",body:{keys:[field.key]}});
    installContentPublications(removed.payload.publications);
    assert.equal(wheelTooltipTemplates(removed.payload.rows)(field.name),null,"Retired wording cannot resurrect the baseline.");
  }
  console.log(`${wheelTooltipFields.length} wheel tooltip sources passed actual-handler draft/reopen/publish/revise/reader/retire checks, canonical variable validation and stale-write protection.`);
} finally { store.close(); }
