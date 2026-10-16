import assert from 'node:assert/strict';
import {store,invokeHoroscopeWriting} from '../tests/helpers/sky-article-save-api.mts';
import {createMonthlyAspectPublicationFixture} from '../tests/helpers/horoscope-publication-fixture.mts';
import {horoscopeEditionBody, emptyHoroscopeEdition, horoscopeEditionKey} from '../apps/web/src/content/horoscopeEditions.mjs';
import {hasExactStudioOwnerApproval} from '../api/_lib/studio-owner-publication.js';

const created=await createMonthlyAspectPublicationFixture(m=>store.invoke(m.method,m.body,m.url));
assert.equal(created.status,200,JSON.stringify(created.payload));let row=created.payload.rows[0];
const edition=structuredClone(row.sections.horoscopeEdition);
edition.passages[0].body='You can keep your own wording — including its punctuation. This complete synthetic reading belongs to the author. There is time to consider the question carefully. A second paragraph does not need a model’s permission. The complete owner final sentence remains intact.';
const saved=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'DRAFT',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition}});
assert.equal(saved.status,200,JSON.stringify(saved.payload));row=saved.payload.rows[0];
const check=await invokeHoroscopeWriting({action:'validate-publication',id:row.id,expectedUpdatedAt:row.updated_at});
assert.equal(check.status,200,JSON.stringify(check.payload));assert.equal(check.payload.publication.ready,true,JSON.stringify(check.payload));
const oldPath=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'LIVE',lane:'serving',reviewState:null});
assert.equal(oldPath.status,422,'Automatic publication without the explicit owner action retains its editorial policy.');
const published=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'});
assert.equal(published.status,200,JSON.stringify(published.payload));row=published.payload.rows[0];
assert.equal(row.status,'LIVE');assert.deepEqual(row.sections.horoscopeEdition,edition);assert(hasExactStudioOwnerApproval(row));
const before=structuredClone(row);
const invalid=structuredClone(edition);invalid.window.endsAt='2030-01-01T00:00:00.000Z';
const wrongWindow=await store.invoke('PATCH',{id:row.id,expectedUpdatedAt:row.updated_at,status:'DRAFT',body:horoscopeEditionBody(invalid),sections:{horoscopeEdition:invalid}});
assert.equal(wrongWindow.status,422);assert.deepEqual(store.rows.get(row.id),before);
for(const period of ['daily','weekly','monthly','seasonal']) {
  const prepared=await store.invoke('GET',undefined,`/api/admin/generated-content?horoscopeBrief=true&period=${period}&date=2026-11-05&timeZone=America%2FNew_York`);
  assert.equal(prepared.status,200,JSON.stringify(prepared.payload));
  const edition=emptyHoroscopeEdition(prepared.payload.brief.window);
  for(const passage of edition.passages) {passage.headline='Synthetic author reading';passage.body='You can keep the wording you chose — complete and uncompressed. This synthetic paragraph is the author’s final version. Another sentence develops the same observation. There is time to consider the answer carefully. The final sentence remains present.';}
  const created=await store.invoke('POST',{contentKey:horoscopeEditionKey(edition.window),surface:'sky',mode:'article',eventType:'horoscope-edition',provider:'manual-admin',status:'DRAFT',lane:'serving',headline:'Synthetic owner edition',summary:'',body:horoscopeEditionBody(edition),sections:{horoscopeEdition:edition},facts:{horoscopeBrief:{brief:prepared.payload.brief,signature:prepared.payload.signature}}});
  assert.equal(created.status,200,period+JSON.stringify(created.payload));const saved=created.payload.rows[0];
  const published=await store.invoke('PATCH',{id:saved.id,expectedUpdatedAt:saved.updated_at,ownerAction:'publish-owner-content'},'/api/admin/generated-content?horoscopeEditor=true');
  assert.equal(published.status,200,period+JSON.stringify(published.payload));
  assert.deepEqual(published.payload.rows[0].sections.horoscopeEdition,edition,period+' preserves all signs and complete exact author copy');
  assert(hasExactStudioOwnerApproval(published.payload.rows[0]),period);
}
console.log('PASS daily/weekly/monthly/seasonal horoscope owner publication: saved author punctuation, technical preflight, explicit exact approval, unchanged complete copy and signed window integrity. No paid calls.');
await store.close();
