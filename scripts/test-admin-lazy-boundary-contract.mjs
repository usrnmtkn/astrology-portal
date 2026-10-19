import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {build} from 'vite';
import {adminLazyBoundaryManifestPlugin} from './admin-lazy-boundary-manifest-plugin.mjs';
import {calendarLazyEntries, calendarLazyBoundaryFailures} from './admin-lazy-boundary-contract.mjs';

const root = fs.realpathSync(fs.mkdtempSync(path.join(tmpdir(), 'admin-lazy-boundary-')));
try {
  const admin = path.join(root, 'apps/admin');
  const src = path.join(admin, 'src');
  fs.mkdirSync(src, {recursive:true});
  fs.writeFileSync(path.join(src, 'GeneratedContentAdminDashboard.tsx'), `globalThis.openCalendar=async()=>[(await import('./SkyForecastTemplateStudio')).default(),(await import('./CalendarOverviewEditor')).default()];`);
  fs.writeFileSync(path.join(src, 'SkyForecastTemplateStudio.tsx'), `export default async function workspace(){return (await import('./CalendarTemplatePreview')).default();}`);
  fs.writeFileSync(path.join(src, 'CalendarTemplatePreview.tsx'), `export default function preview(){return 'Synthetic preview';}`);
  fs.writeFileSync(path.join(src, 'CalendarOverviewEditor.tsx'), `export default function overview(){return 'Synthetic overview';}`);
  const dist = path.join(root, 'dist');
  await build({configFile:false,envFile:false,root:admin,logLevel:'silent',plugins:[adminLazyBoundaryManifestPlugin(root)],
    build:{outDir:dist,manifest:true,minify:false,rollupOptions:{input:path.join(src,'GeneratedContentAdminDashboard.tsx'),output:{onlyExplicitManualChunks:true,manualChunks:id=>calendarLazyEntries.some(key=>id===path.join(admin,key))?'admin-calendar-workspace':undefined}}}});
  const manifest = JSON.parse(fs.readFileSync(path.join(dist,'.vite/manifest.json'),'utf8'));
  const proof = JSON.parse(fs.readFileSync(path.join(dist,'.vite/admin-lazy-boundaries.json'),'utf8'));
  const entryKey = Object.keys(manifest).find(key=>manifest[key].isEntry);
  const inputs = {manifest,entryKey,proof,sourceBytes:key=>fs.readFileSync(path.join(admin,key)),chunkBytes:file=>fs.readFileSync(path.join(dist,file))};
  const positiveFailures=calendarLazyBoundaryFailures(inputs);
  assert.deepEqual(positiveFailures,[],'Actual bundled sibling sources retain dynamic boundaries');
  let negatives=0;
  function rejects(change) {
    const next={...inputs,manifest:structuredClone(manifest),proof:structuredClone(proof)};
    change(next);
    assert(calendarLazyBoundaryFailures(next).length>0);
    negatives++;
  }
  const key=calendarLazyEntries[0];
  const groupKey=Object.keys(manifest).find(k=>manifest[k].name==='admin-calendar-workspace');
  rejects(x=>{x.proof=undefined;});
  rejects(x=>{x.proof.schema='wrong';});
  rejects(x=>{delete x.proof.entries[key];});
  rejects(x=>{x.proof.entries[key].dynamicImporters=[];});
  rejects(x=>{x.proof.entries[key].dynamicImporters=['../../private'];});
  rejects(x=>{x.proof.entries[key].renderedLength=0;});
  rejects(x=>{x.proof.entries[key].file='assets/nonexistent.js';});
  rejects(x=>{delete x.manifest[groupKey];});
  rejects(x=>{x.manifest[groupKey].isDynamicEntry=false;});
  rejects(x=>{x.manifest[entryKey].imports=[groupKey];});
  rejects(x=>{x.manifest[entryKey].imports=['intermediate'];x.manifest.intermediate={file:'assets/intermediate.js',imports:[groupKey]};});
  rejects(x=>{x.proof.entries[key].sourceSha256='0'.repeat(64);});
  rejects(x=>{x.proof.entries[key].chunkSha256='0'.repeat(64);});
  rejects(x=>{x.chunkBytes=()=>{throw new Error('Missing emitted chunk');};});
  assert(!JSON.stringify(proof).includes(root),'Metadata contains no absolute fixture paths');
  console.log(`PASS actual Rollup lazy membership plus ${negatives} fail-closed boundary checks`);
} finally {fs.rmSync(root,{recursive:true,force:true});}
