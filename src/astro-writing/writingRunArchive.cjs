"use strict";
const {createHash, randomUUID} = require('node:crypto');
const {AsyncLocalStorage} = require('node:async_hooks');
const scope = new AsyncLocalStorage();
const sha256 = text => createHash('sha256').update(text, 'utf8').digest('hex');
const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const digest = v => sha256(JSON.stringify(canonical(v)));
const endpoints = Object.freeze({
  openai: 'https://api.openai.com/v1/responses',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/interactions'
});
const contextKeys = ['surface','family','role','stage','contentKey','editionId','operationId','reportId','jobId','checkpointId','attempt','step','period','sign','schemaName','reportDomain','reportHorizon','unitId'];
const snapshotKeys = ['id','version','provider','model','role','surface','family','context','request_body','request_sha256','evidence'];

class WritingRunArchiveError extends Error {
  constructor(phase) {
    super(phase === 'before_dispatch'
      ? 'Private writing-run storage could not confirm the exact request. No provider call was started.'
      : 'The writing request was archived but its dispatch outcome could not be recorded. Do not replay this call automatically.');
    this.name = 'WritingRunArchiveError';
    this.phase = phase;
  }
}

function withWritingRunContext(context, run) {
  return scope.run({...scope.getStore(), context: {...scope.getStore()?.context, ...context}}, run);
}
// Dependency injection for isolated fixture storage; never inferred from NODE_ENV.
function withWritingRunStore(store, run) {
  return scope.run({...scope.getStore(), store}, run);
}
function verifyArchivedRun(row) {
  if (!row || row.version !== 1 || typeof row.request_body !== 'string'
    || sha256(row.request_body) !== row.request_sha256
    || digest(Object.fromEntries(snapshotKeys.map(k => [k,row[k]]))) !== row.snapshot_sha256) {
    throw new Error('Writing-run archive integrity check failed.');
  }
  JSON.parse(row.request_body);
  return row;
}
function writingRunStorage(fetchImpl = globalThis.fetch) {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new WritingRunArchiveError('before_dispatch');
  const endpoint = `${url.replace(/\/$/u,'')}/rest/v1/writing_run_archives`;
  const request = async (query, init={}) => {
    const response = await fetchImpl(`${endpoint}?${query}`, {...init,
      headers: {apikey:key, authorization:`Bearer ${key}`, 'content-type':'application/json', prefer:'return=representation'},
      signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Private writing-run storage unavailable.');
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('Invalid writing-run storage response.');
    return rows;
  };
  return {
    async create(row) {
      const rows = await request('', {method:'POST',body:JSON.stringify(row)});
      if (rows.length !== 1 || rows[0].id !== row.id || rows[0].snapshot_sha256 !== row.snapshot_sha256) throw new Error('Archive write unconfirmed.');
      verifyArchivedRun(rows[0]);
    },
    async finish(id, result) {
      const rows = await request(new URLSearchParams({id:`eq.${id}`,state:'eq.dispatch_reserved'}), {method:'PATCH',body:JSON.stringify(result)});
      if (rows.length !== 1 || rows[0].id !== id || rows[0].state !== result.state) throw new Error('Archive outcome unconfirmed.');
      verifyArchivedRun(rows[0]);
    },
    async list(params) { return request(params); }
  };
}

/** Capture the serialized final body, after all instruction/feedback assembly.
 * No auth headers, provider credentials or unselected source stores enter the archive.
 * This is an audit boundary, not a billing/checkpoint/retry controller. */
async function archivedWritingFetch(url, init, {provider,role='WRITER',surface='',family='',context={},fetchImpl=globalThis.fetch}={}) {
  if (url !== endpoints[provider] || init?.method !== 'POST' || typeof init.body !== 'string') throw new Error('Unsupported writing dispatch.');
  const body = init.body;
  const sendInit = {...init,body};
  if (Buffer.byteLength(body,'utf8') > 32*1024*1024) throw new WritingRunArchiveError('before_dispatch');
  const request = JSON.parse(body);
  const merged = {...scope.getStore()?.context,...context};
  const selectedContext = Object.fromEntries(contextKeys.filter(k=>merged[k]!==undefined).map(k=>[k,merged[k]]));
  const inputFields = ['instructions','system','system_instruction','input','messages'].filter(k=>Object.hasOwn(request,k));
  const row = JSON.parse(JSON.stringify({id:randomUUID(),version:1,provider,model:request.model??'unknown',role,
    surface:merged.surface||surface||'unclassified',family:merged.family||family||'unclassified',context:selectedContext,
    request_body:body,request_sha256:sha256(body),evidence:{version:1,scope:'Exact provider input; includes only what this call actually received. Fields may contain instructions, selected sources, feedback, facts, and candidate text in their original roles.',
      fields:inputFields.map(k=>({pointer:`/${k}`,value:request[k],sha256:digest(request[k])}))}}));
  row.snapshot_sha256=digest(row);
  row.state='dispatch_reserved';
  let store;
  try { store=scope.getStore()?.store??writingRunStorage(); await store.create(row); }
  catch { throw new WritingRunArchiveError('before_dispatch'); }
  let response;
  try { response=await fetchImpl(url,sendInit); }
  catch (error) {
    try { await store.finish(row.id,{state:'outcome_unknown',recorded_at:new Date().toISOString()}); }
    catch { throw new WritingRunArchiveError('after_dispatch'); }
    throw error;
  }
  // Never consume or buffer a native stream. Its request is already durable and
  // its existing operation checkpoint owns completion/recovery.
  const streaming=request.stream===true || response.headers?.get('content-type')?.includes('text/event-stream');
  let payload=null;
  if (!streaming && typeof response.clone==='function') {
    try { payload=await response.clone().json(); } catch { /* Preserve malformed-response outcome without copying provider diagnostics. */ }
  }
  const result={state:response.ok?'response_received':'provider_rejected',http_status:response.status,
    response_id:typeof (payload?.id??payload?.interaction_id)==='string'?(payload.id??payload.interaction_id):null,
    provider_status:typeof payload?.status==='string'?payload.status:null,
    recorded_at:new Date().toISOString()};
  try { await store.finish(row.id,result); }
  catch { throw new WritingRunArchiveError('after_dispatch'); }
  return response;
}

module.exports={archivedWritingFetch,writingRunStorage,verifyArchivedRun,withWritingRunContext,withWritingRunStore,WritingRunArchiveError};
