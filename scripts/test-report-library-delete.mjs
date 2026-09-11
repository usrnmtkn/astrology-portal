import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';
const result = await build({
  stdin: { contents: `export * from './apps/web/src/services/reportLibrary.ts'; export { default as shareHandler } from './api/report-share.ts'; export { default as deliveryHandler } from './api/report-delivery.ts';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
  plugins: [{ name: 'isolated-report-storage', setup(b) {
    b.onResolve({ filter: /\/auth$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
    b.onResolve({ filter: /supabase-report-admin\.js$/ }, () => ({ path: 'admin', namespace: 'fixture' }));
    b.onResolve({ filter: /report-http\.js$/ }, () => ({ path: 'http', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, ({path}) => ({ contents: path === 'auth'
      ? 'export const getSupabaseClient = async () => globalThis.deleteFixture.client;'
      : path === 'admin' ? 'export const createSupabaseReportAdmin = () => globalThis.deleteFixture.admin;'
      : `export const requireReportUser = async () => ({id: 'owner'}); export const jsonRequestBody = async req => req.body; export const reportUrl = path => path; export const sendJson = (res, status, body) => {res.status=status; res.body=body;};` }));
  }}]
});
const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
const id = '00000000-0000-4000-8000-000000000001';
const states = [];
const generated = {id, subject_type:'you_day_reading', status:'DRAFT', body:'Saved report.', headline:'Daily report', target_date:'2026-09-11', created_at:'2026-09-11', updated_at:'2026-09-11'};
let failWrite = false;
const tables = {user_generated_interpretations:[generated], user_reports:[], user_report_library_state:states, report_share_links:[]};
globalThis.deleteFixture = {
  client: {
    auth: {getSession:async () => ({data:{session:{user:{id:'owner'}}}})},
    from(table) {
      const filters = [];
      const query = {
        select(){return query;}, eq(k,v){filters.push([k,v]);return query;}, in(){return query;}, order(){return query;},
        returns: async () => ({data:tables[table]}),
        maybeSingle:async () => ({data:states.find(s => filters.every(([k,v])=>s[k]===v)) ?? null}),
        upsert:async row => { if(failWrite)return {error:new Error('write failed')}; const existing=states.find(s=>s.source_id===row.source_id && s.source_kind===row.source_kind); if(existing)Object.assign(existing,row);else states.push(row);return {error:null}; }
      };return query;
    }
  },
  admin:{selectOne:async(table, params) => table==='user_report_library_state' ? states.find(s => ['user_id','source_kind','source_id'].every(k => `eq.${s[k]}` === params.get(k))) : table==='report_share_links' ? {user_id:'owner',source_id:id,source_kind:'generated_interpretation'} : { ...generated, status:'live', fulfillment_status:'live' }}
};
try {
  const [item] = await api.listReportLibrary();
  assert.equal(item.title,'Daily report');
  await api.markReportArchived(item,true);
  assert.equal((await api.listReportLibrary()).length,1,'archive retains the report');
  await api.deleteReport(item);
  assert.equal((await api.listReportLibrary()).length,0,'deleted archived reports disappear');
  await api.markReportArchived(item,false);
  await api.markReportSeen(item);
  assert.equal((await api.listReportLibrary()).length,0,'archive/seen updates never clear deletion');
  assert.equal(await api.loadGeneratedReportById(id),null,'legacy direct route cannot reopen deleted report');
  const response=()=>({setHeader(){}});
  let res=response();await api.shareHandler({method:'GET',url:'/api/report-share?share=K7m4q9W2xP8vR3tN5cY6Zg'},res);assert.equal(res.status,404);
  res=response();await api.shareHandler({method:'POST',body:{sourceKind:'generated_interpretation',sourceId:id,vanitySlug:'2026-09-11-your-day'}},res);assert.equal(res.status,400);assert.match(res.body.error,/deleted/);
  tables.user_reports.push({id,report_type:'year_ahead',fulfillment_status:'live',period_start:'2026-09-11',period_end:'2027-09-11',created_at:'2026-09-11',updated_at:'2026-09-11'});
  assert.equal((await api.listReportLibrary()).length,1,'premium reports remain independently visible');
  await api.deleteReport({sourceKind:'premium_report',sourceId:id});
  assert.equal((await api.listReportLibrary()).length,0,'premium reports also disappear after deletion');
  res=response();await api.deliveryHandler({method:'GET',url:`/api/report-delivery?reportId=${id}`},res);assert.equal(res.status,404);
  states.length=0;tables.user_reports.length=0;
  failWrite=true;await assert.rejects(api.deleteReport(item),/write failed/);assert.equal((await api.listReportLibrary()).length,1);
  const view=fs.readFileSync('apps/web/src/components/reports/ReportLibraryView.tsx','utf8');
  assert.ok(view.indexOf('<span>Delete</span>') > view.indexOf('<span>{archived ? "Restore" : "Archive"}</span>'));
  console.log('Report delete service and actual share/delivery handler checks passed.');
} finally {delete globalThis.deleteFixture;}
