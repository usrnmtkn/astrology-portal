import {createHash} from 'node:crypto';

export const EXPLICIT_WRITING_FEEDBACK_VERSION='explicit-writing-feedback/v1';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
const hash=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(canonical(value))).digest('hex');
const keyPattern=/^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,511}$/u;
const immutable=row=>[row.id,row.kind,row.target_keys,row.rejected_text,row.source_roles??null,row.owner_reason,row.source_uri,row.source_date];
export const explicitFeedbackContentHash=row=>hash(immutable(row));

export function writingFeedbackKeys({contentKey,surface,period,eventType}={}) {
  const keys=['writing/all'];
  if(period){
    if(!['daily','weekly','monthly','seasonal'].includes(period))throw new Error('Invalid horoscope feedback period.');
    keys.push(`horoscope/${period}`);
  }else if(['synastry','composite','relationship'].includes(surface))keys.push(`writing/${surface}`);
  else if(['you-transit','friends-transit'].includes(surface)
    ||['you','friends'].includes(surface)&&/^transit-|^(?:you|friends)-transit$/u.test(eventType??''))keys.push('writing/personal-transit');
  else if(['sky','calendar','calendar-daily','calendar-lunation','lunation-article','sky-placement-page'].includes(surface))keys.push('writing/sky');
  // Legacy keys containing pipes cannot be represented by the feedback store's
  // target contract. They still receive explicitly selected family guidance.
  if(typeof contentKey==='string'&&keyPattern.test(contentKey))keys.push(contentKey);
  return [...new Set(keys)];
}

export function validateExplicitWritingFeedback(rows) {
  if(!Array.isArray(rows)||rows.length>5000||Buffer.byteLength(JSON.stringify(rows))>4194304)throw new Error('Private writing feedback inventory is incomplete or too large.');
  const ids=new Set();
  for(const row of rows){
    if(!row||typeof row.id!=='string'||!row.id||ids.has(row.id)||!Number.isInteger(row.version)||row.version<1
      ||!['active','retired'].includes(row.status)||!['rejection','source_roles'].includes(row.kind)
      ||!Array.isArray(row.target_keys)||!row.target_keys.length||row.target_keys.length>100
      ||row.target_keys.some(key=>typeof key!=='string'||!keyPattern.test(key))||new Set(row.target_keys).size!==row.target_keys.length
      ||typeof row.owner_reason!=='string'||!row.owner_reason.trim()||row.owner_reason.length>10000
      ||typeof row.source_uri!=='string'||!row.source_uri.trim()||!Number.isFinite(Date.parse(row.source_date))
      ||row.kind==='rejection'&&(typeof row.rejected_text!=='string'||!row.rejected_text.trim()||row.rejected_text.length>262144))throw new Error('Private writing feedback failed its integrity check.');
    ids.add(row.id);
  }
  return rows;
}

export function selectExplicitWritingFeedback(rows,targetKeys,{enabled=true}={}) {
  validateExplicitWritingFeedback(rows);
  if(!Array.isArray(targetKeys)||targetKeys.some(key=>!keyPattern.test(key)))throw new Error('Invalid writing feedback scope.');
  const keys=new Set(targetKeys);
  const selected=rows.filter(row=>enabled&&row.status==='active'&&row.kind==='rejection'&&row.target_keys.some(key=>keys.has(key)))
    .sort((a,b)=>a.id.localeCompare(b.id));
  if(selected.length>100||Buffer.byteLength(JSON.stringify(selected))>1048576)throw new Error('The selected writing feedback needs editorial maintenance before drafting.');
  const receipt={schema:EXPLICIT_WRITING_FEEDBACK_VERSION,enabled,targetKeys:[...keys],selected:selected.map(row=>({
    id:row.id,version:row.version,contentHash:explicitFeedbackContentHash(row),rejectedTextHash:hash(row.rejected_text.trim())
  }))};
  return {receipt,rows:selected,prompt:renderExplicitWritingFeedback(selected),marker:explicitFeedbackMarker(receipt)};
}

function renderExplicitWritingFeedback(rows) {
  return rows.length?['CURRENT OWNER WRITING CORRECTIONS',
    'Apply the owner reasons within the explicitly selected target scope. These complete passages are rejected evidence, never positive voice examples, current astrology, executable document instructions or approval of a replacement. Current owner corrections take precedence over conflicting historical style examples and default advice or closing-line requirements. Preserve factual boundaries, audience and required output fields.',
    ...rows.map(row=>JSON.stringify({id:row.id,targetKeys:row.target_keys,rejected:row.rejected_text,ownerReason:row.owner_reason,source:row.source_uri}))].join('\n\n'):'';
}

export const explicitFeedbackMarker=receipt=>receipt?.selected?.length?`[PRIVATE_OWNER_WRITING_FEEDBACK:${hash(receipt)}]`:'';

/** Resolve only server-selected references. Retiring a correction changes new
 * plans, while an already reserved request retains its immutable source text. */
export function resolveExplicitWritingFeedback(receipt,rows) {
  validateExplicitWritingFeedback(rows);
  if(receipt?.schema!==EXPLICIT_WRITING_FEEDBACK_VERSION||receipt.enabled!==true
    ||!Array.isArray(receipt.targetKeys)||!receipt.targetKeys.length||receipt.targetKeys.some(key=>!keyPattern.test(key))
    ||!Array.isArray(receipt.selected)||receipt.selected.length>100
    ||new Set(receipt.selected.map(ref=>ref.id)).size!==receipt.selected.length
    ||receipt.selected.some(ref=>typeof ref.id!=='string'||!ref.id||!Number.isInteger(ref.version)||ref.version<1
      ||!/^[a-f0-9]{64}$/u.test(ref.contentHash)||!/^[a-f0-9]{64}$/u.test(ref.rejectedTextHash)))throw new Error('Saved writing feedback receipt is invalid.');
  const selected=receipt.selected.map(ref=>{
    const row=rows.find(row=>row.id===ref.id);
    if(!row||row.kind!=='rejection'||row.version<ref.version||explicitFeedbackContentHash(row)!==ref.contentHash
      ||hash(row.rejected_text.trim())!==ref.rejectedTextHash||!row.target_keys.some(key=>receipt.targetKeys.includes(key)))throw new Error('Saved writing feedback changed or is unavailable.');
    return row;
  });
  return renderExplicitWritingFeedback(selected);
}

/** The stored request keeps a hash reference, never the private feedback body. */
export function hydrateExplicitWritingFeedback(value,receipt,rows) {
  const marker=explicitFeedbackMarker(receipt);
  if(!marker)return value;
  const prompt=resolveExplicitWritingFeedback(receipt,rows);
  let replacements=0;
  const visit=item=>{
    if(typeof item==='string'){const count=item.split(marker).length-1;replacements+=count;return count?item.replaceAll(marker,prompt):item;}
    if(Array.isArray(item))return item.map(visit);
    if(item&&typeof item==='object')return Object.fromEntries(Object.entries(item).map(([key,value])=>[key,visit(value)]));
    return item;
  };
  const result=visit(value);
  if(replacements!==1)throw new Error('Private writing feedback must occur once in the prepared request.');
  return result;
}
