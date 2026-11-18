import assert from 'node:assert/strict';
import {studioApiStore} from '../tests/helpers/studio-api-store';
import {wheelTooltipSourceDraft} from '../apps/admin/src/wheelTooltipSources';
import {wheelTooltipFields,wheelTooltipTemplateErrors} from '../apps/web/src/content/wheelTooltipCatalog';
import {fillWheelTooltip,wheelTooltipHouseWording,wheelTooltipTemplates} from '../apps/web/src/content/wheelTooltipCopy';
import {installContentPublications} from '../apps/web/src/content/contentPublicationState';
const store=await studioApiStore([],{uuidIds:true});
try {
  const fields=wheelTooltipFields.filter(field=>field.group==='Variable wording');
  assert.equal(fields.length,10);
  for(const field of fields){
    const {id:_id,...draft}=wheelTooltipSourceDraft(field.key);
    const body=field.name==='variables/owner-friend'?'Chart of {{ownerName}}'
      :field.name==='variables/house-ordinal'?'House {{house}}'
      :field.name==='variables/ruler-house-ordinal'?'{{houseOrdinal}} place'
      :`Custom ${field.body}`;
    const created=await store.call({method:'POST',body:{...draft,body,eventType:'cms-surface-override'}});
    assert.equal(created.status,200,JSON.stringify(created.payload));
    let row=created.payload.rows[0];
    const published=await store.call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'publish-owner-content'}});
    assert.equal(published.status,200,'Owner-editable variable wording must publish through the actual Studio handler: '+JSON.stringify(published.payload));
    row=published.payload.rows[0];
    const read=await store.call({method:'POST',url:'/api/content-reader',body:{keys:[field.key]}});
    installContentPublications(read.payload.publications);
    const templates=wheelTooltipTemplates(read.payload.rows);
    assert.equal(templates(field.name),body);
    if(field.name==='variables/owner-friend')assert.equal(fillWheelTooltip(templates(field.name),{ownerName:"$& {{house}} <literal>"}),"Chart of $& {{house}} <literal>");
    if(field.name==='variables/house-ordinal'){
      assert.equal(wheelTooltipHouseWording(templates,1,'1st'),'House 1');
      assert.equal(wheelTooltipHouseWording(templates,11,'11th'),'House 11');
      assert.equal(wheelTooltipHouseWording(templates,0,'0th'),null);
      assert.equal(wheelTooltipHouseWording(templates,13,'13th'),null);
      assert.deepEqual(wheelTooltipTemplateErrors(field.key,'{{house}} / {{houseOrdinal}}'),[]);
      const omitted=await store.call({method:'PATCH',body:{id:row.id,expectedUpdatedAt:row.updated_at,ownerAction:'save-and-publish-owner-content',body:'Fixed incorrect house.',sourceSnapshot:{...draft.sourceSnapshot,allowedSlots:[]}}});
      assert.notEqual(omitted.status,200,'Removing calculated house variables cannot be disguised by client metadata.');
    }
    if(field.name==='variables/ruler-house-ordinal')assert.equal(wheelTooltipHouseWording(templates,7,'7th',true),'7th place');
  }
  console.log('10 variable wording sources: actual owner publication and reader retrieval; name text remains literal; house formats follow calculated numbers/ordinals and reject missing facts.');
}finally{store.close();}
