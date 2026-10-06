import {createHash} from 'node:crypto';

export const canonical = value => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key,item[key]])) : item);
export const digest = value => createHash('sha256').update(typeof value === 'string' ? value : canonical(value)).digest('hex');
export function immutable(value) {
  if(value && typeof value==='object'){Object.values(value).forEach(immutable);Object.freeze(value);}
  return value;
}

/** Source adapters return exact units, never reconstructed summaries. Retrieval
 * relevance is explicit adapter data; this interface never pads an evidence quota. */
export function evidenceManifest({surface,target,query,entries,excluded=[],previousHash=null}) {
  const ids=new Set();
  const selected=entries.map(entry=>{
    if(!entry.id||ids.has(entry.id)||!entry.text?.trim()||!entry.source?.locator||!entry.source?.version
      ||!entry.scope||!entry.relevance?.reason||entry.relevance.score<=0)throw new Error('invalid_editorial_evidence');
    if(!['approved','rejected'].includes(entry.role))throw new Error('invalid_editorial_evidence_role');
    if(entry.role==='approved'&&!['owner_authored_final','exact_owner_approved'].includes(entry.authority))throw new Error('serving_approval_is_not_owner_evidence');
    if(entry.role==='rejected'&&(!entry.ownerReason?.trim()||!entry.rejectedSpans?.length
      ||entry.rejectedSpans.some(span=>!span||!entry.text.includes(span))))throw new Error('rejection_scope_missing');
    if(entry.textHash&&entry.textHash!==digest(entry.text))throw new Error('evidence_hash_mismatch');
    ids.add(entry.id);return {...entry,textHash:digest(entry.text)};
  });
  if(!selected.some(e=>e.role==='approved')||!selected.some(e=>e.role==='rejected'))throw new Error('relevant_approved_and_rejected_evidence_required');
  const body={schema:'editorial-evidence-manifest/v1',surface,target,query,entries:selected,excluded,previousHash};
  return immutable({...body,hash:digest(body)});
}
export function assertManifest(value) {
  const {hash,...body}=value;
  if(hash!==digest(body))throw new Error('immutable_evidence_manifest_changed');
  const rebuilt=evidenceManifest(body);
  if(rebuilt.hash!==hash)throw new Error('invalid_evidence_manifest');
  return value;
}

/** Adapter contract: retrieve(query, diagnostic) -> exact evidence entries. */
export function createEvidenceRegistry(adapters) {
  return {async retrieve(surface,query,diagnostic=null,previousHash=null){
    const adapter=adapters[surface];if(!adapter)throw new Error('editorial_surface_not_enabled');
    const {entries,excluded=[]}=await adapter.retrieve(query,diagnostic);
    return evidenceManifest({surface,target:query.target,query,entries,excluded,previousHash});
  }};
}
