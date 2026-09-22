import assert from 'node:assert/strict';
import fs from 'node:fs';
import { build } from 'esbuild';

// Real publication guard, package installer and shipped renderer; only network
// source loading is substituted. No database writes or model calls.
const built = await build({ stdin: { resolveDir: process.cwd(), contents: `
  export { preparePersonalReportSources } from './apps/web/src/services/personalReportSources.ts';
  export { installContentPublications } from './apps/web/src/content/contentPublicationState.ts';
  export { loadDeferredFallbackArchitectureV3Bundle, transitSynastryFallbackRendererV3 } from './apps/web/src/content/fallbackArchitectureV3Runtime.ts';
  export { fullDetailReaderFacingCopy } from './apps/web/src/content/readerSafety.ts';` },
  bundle: true, write: false, format: 'esm', platform: 'node', define: {'import.meta.env':'{}'},
  plugins: [{ name: 'source-network-fixture', setup(b) {
    b.onResolve({filter:/\/(generatedContent|contentPublications)$/}, args => {
      if (!args.importer.endsWith('personalReportSources.ts')) return;
      return { path: args.path.endsWith('generatedContent') ? 'rows' : 'ledger', namespace: 'fixture' };
    });
    b.onLoad({filter:/.*/,namespace:'fixture'}, ({path}) => ({contents:path==='rows'
      ? 'export async function loadFallbackArchitectureV3DashboardBundle(){return globalThis.reportSourceFixture.load();}'
      : 'export async function refreshContentPublications(){globalThis.reportSourceFixture.refreshed++;} export function contentPublicationsResolved(){return globalThis.reportSourceFixture.resolved;}'}));
  } }]
});
const api = await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
const original = globalThis.reportSourceFixture;
try {
  const key='authored/transit-aspect/north-node/sun/conjunction';
  const card=JSON.parse(fs.readFileSync('apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json')).authoredCards.find(row=>row.contentKey===key);
  const stamp='2026-09-20T12:00:00.000Z';
  const publication={content_key:key,state:'live',revision:90001,row_id:'synthetic-row',row_updated_at:stamp,updated_at:stamp};
  const bundle={transitLib:{authoredCards:[{...card,publicationRowId:publication.row_id,publicationRowUpdatedAt:stamp}]},templatesFile:{templates:[]},rowsFile:{hookRows:[],vocabularyRows:[]}};
  let loads=0, reads=0;
  globalThis.reportSourceFixture={resolved:true,refreshed:0,load:async()=>{loads++;await Promise.resolve();return bundle;}};
  const read=()=>{reads++;return api.fullDetailReaderFacingCopy(api.transitSynastryFallbackRendererV3.renderTransitAspect({transiting:'north-node',natal:'sun',aspect:'conjunction',voice:'you',window:'through September 30'}).parts);};
  await api.loadDeferredFallbackArchitectureV3Bundle();
  api.installContentPublications([publication]);
  assert.throws(read, /SOURCE_GAP/u, 'An unversioned bundled passage cannot override a current published row.');
  const body=await api.preparePersonalReportSources(read);
  assert.equal(loads,1);
  assert.ok(body.startsWith(card.body.split('\n\n')[0]));
  assert.ok(body.endsWith('than from defending a version that mainly exists to keep approval coming.'));
  globalThis.reportSourceFixture.load=async()=>{throw Error('synthetic row outage');};
  const before=reads;
  await assert.rejects(()=>api.preparePersonalReportSources(read),/synthetic row outage/u);
  assert.equal(reads,before,'Do not rebuild or submit on failed source loading.');
  globalThis.reportSourceFixture.resolved=false;
  await assert.rejects(()=>api.preparePersonalReportSources(read),/could not load/u);
  globalThis.reportSourceFixture.resolved=true;
  let revision=publication.revision;
  globalThis.reportSourceFixture.load=async()=>{api.installContentPublications([{...publication,revision:++revision}]);return bundle;};
  await assert.rejects(()=>api.preparePersonalReportSources(read),/changed while loading/u);
  assert.equal(reads,before,'A continuously changing publication cannot be submitted.');
  console.log('Personal report source preparation: exact published passage recovered before assembly; outage, unresolved ledger and changing publication fail before submission.');
} finally { if(original===undefined)delete globalThis.reportSourceFixture;else globalThis.reportSourceFixture=original; }
