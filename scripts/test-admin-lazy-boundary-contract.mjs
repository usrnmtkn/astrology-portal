import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {build, loadConfigFromFile} from 'vite';
import {fileURLToPath} from 'node:url';
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
  const config = await loadConfigFromFile({ command: 'build', mode: 'production' },
    fileURLToPath(new URL('../apps/admin/vite.config.ts', import.meta.url)), undefined, 'silent');
  const startupGuard = config.config.plugins.flat(Infinity).find(plugin => plugin.name === 'studio-startup-partition');
  assert(startupGuard, 'The real Studio build must enforce deferred source membership.');
  const guardEntry = path.join(src, 'guard-entry.ts');
  const guarded = path.join(src, 'skyPlacementAspectBridge.ts');
  fs.writeFileSync(guarded, `export const label='Synthetic bridge source';`);
  const guardBuild = (source, manualChunks) => {
    fs.writeFileSync(guardEntry, source);
    return build({ configFile: false, envFile: false, root: admin, logLevel: 'silent', plugins: [startupGuard],
      build: { write: false, minify: false, rollupOptions: { input: guardEntry, output: { manualChunks, onlyExplicitManualChunks: true } } } });
  };
  await guardBuild(`globalThis.openBridge=async()=>(await import('./skyPlacementAspectBridge')).label;`,
    id => id === guarded ? 'bridge' : undefined);
  await assert.rejects(() => guardBuild(`import {label} from './skyPlacementAspectBridge';globalThis.label=label;`,
    () => 'index'), /Deferred Studio module entered startup/u);
  fs.writeFileSync(path.join(src, 'guard-middle.ts'), `import {label} from './skyPlacementAspectBridge';export function wrapper(){return label;}`);
  await assert.rejects(() => guardBuild(`import {wrapper} from './guard-middle';globalThis.readBridge=wrapper;`,
    id => id === guarded ? 'bridge' : id.endsWith('/guard-middle.ts') ? 'middle' : undefined),
  /Deferred Studio module entered startup/u);
  console.log('PASS real Studio startup guard: deferred source allowed; direct and transitive eager source rejected.');
} finally {fs.rmSync(root,{recursive:true,force:true});}
