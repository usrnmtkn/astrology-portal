import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { normalizeTransitNatalPreviewInput, renderTransitNatalPreviewState } from '../api/admin/transit-natal-preview.ts';
import { transitNatalPlanets, transitNatalPoints, transitNatalAspects, transitNatalExactContentKey } from '../apps/admin/src/transitNatalSources.ts';

const sourcePath='apps/web/src/content/fallbackArchitectureV3/source-rows/transit-synastry-rows-v1.json';
const source=JSON.parse(fs.readFileSync(sourcePath,'utf8')).authoredCards;
const bundledPath='apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json';
const bundled=JSON.parse(fs.readFileSync(bundledPath,'utf8')).authoredCards;
const byKey=new Map(source.map((r:any)=>[r.contentKey,r]));
const readerNatalPoints=new Set([...transitNatalPlanets.filter(p=>p!=='south-node'),'ascendant']);
const results:any[]=[];
for(const planet of transitNatalPlanets)for(const natalPoint of transitNatalPoints)for(const aspect of transitNatalAspects){
 const identity={planet,natalPoint,aspect};
 const targetKey=transitNatalExactContentKey(identity);
 if(!targetKey)continue;
 let rendered:any;let error:string|undefined;
 try { rendered=renderTransitNatalPreviewState(normalizeTransitNatalPreviewInput({...identity,sign:'virgo',voice:'you'})); }
 catch(e){error=(e as Error).message;}
 const selectedKey=rendered?.sourceKeys[0]??null;
 const tier=error?'gap':selectedKey.startsWith('authored/transit-return/')?'return':selectedKey.startsWith('authored/transit-aspect/')?'authored':'fallback';
 results.push({...identity,targetKey,selectedKey,tier,error,readerAuditScope:readerNatalPoints.has(natalPoint)});
}
const counts=(rows:any[])=>rows.reduce((s,r)=>(s[r.tier]=(s[r.tier]??0)+1,s),{});
const pending=results.filter(r=>['fallback','gap'].includes(r.tier)).map(r=>{
 const candidatePath=`packages/astro-knowledge/data/transits/${r.planet}-${r.aspect}-${r.natalPoint}.json`;
 const candidate=fs.existsSync(candidatePath)?JSON.parse(fs.readFileSync(candidatePath,'utf8')):null;
 return {...r,existingPersonalSource:byKey.has(r.targetKey),bundledPersonalSource:bundled.some((b:any)=>b.contentKey===r.targetKey),status:'needs-owner-approved-personal-transit-copy',priority:r.planet==='sun'&&['north-node','south-node'].includes(r.natalPoint)?1:r.tier==='gap'?2:r.readerAuditScope?3:4,crossSurfaceReference:candidate?{path:candidatePath,status:candidate.status,hasReaderBody:!!candidate.readerCopy?.body,servingReuseAuthorized:false,reason:'Calendar/collective identity is not a personal transit-to-natal approval.'}:null};
}).sort((a,b)=>a.priority-b.priority||a.targetKey.localeCompare(b.targetKey));
const output={schema:'personal-transit-retirement-inventory-v1',sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourcePath,bundledPath,scope:'All supported Personal Transits Studio identities, base You voice. Signs, motion, dates, and repeat variants are not separate articles.',studio:{identities:results.length,counts:counts(results)},readerAudit:{identities:results.filter(r=>r.readerAuditScope).length,counts:counts(results.filter(r=>r.readerAuditScope)),scope:'Matches audit-you-transit-detail-coverage natal-axis scope; not an assertion that all fixtures are simultaneous or physically reachable.'},sourceBundleAspectDrift:bundled.filter((r:any)=>r.contentKey.startsWith('authored/transit-aspect/')&&JSON.stringify(r)!==JSON.stringify(byKey.get(r.contentKey))).map((r:any)=>r.contentKey),pending};
const dir='docs/content-review/transit-natal-retirement-2026-09-10';fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'inventory.json'),JSON.stringify(output,null,2)+'\n');
fs.writeFileSync(path.join(dir,'replacement-queue.csv'),['priority,content_key,current_source,reader_audit_scope,status',...pending.map(r=>[r.priority,r.targetKey,r.selectedKey||'SOURCE_GAP',r.readerAuditScope,r.status].join(','))].join('\n')+'\n');
console.log(JSON.stringify({studio:output.studio,readerAudit:output.readerAudit,pending:pending.length,existingPersonalSources:pending.filter(r=>r.existingPersonalSource).length,crossSurfaceReferences:pending.filter(r=>r.crossSurfaceReference).length,drift:output.sourceBundleAspectDrift}));
