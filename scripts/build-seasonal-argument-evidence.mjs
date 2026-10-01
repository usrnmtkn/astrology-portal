import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {SEASONAL_SOURCE_ROOT} from '../src/astro-writing/seasonalHoroscopeEvidence.mjs';
import {SEASONAL_ARGUMENT_MANIFEST,SEASONAL_ARGUMENT_SOURCES,loadSeasonalArgumentEvidence} from '../src/astro-writing/seasonalArgumentEvidence.mjs';
const read=file=>fs.readFileSync(file,'utf8');
const corpus=JSON.parse(read(`${SEASONAL_SOURCE_ROOT}manifest.json`));
const sources=SEASONAL_ARGUMENT_SOURCES.map(({slug,heading})=>{
  const source=Object.values(corpus.cohorts).flat().find(s=>s.sourceSlug===slug);
  const article=read(`${SEASONAL_SOURCE_ROOT}${source.file}`),boundary=article.indexOf(`\n${heading}\n`);
  if(boundary<1)throw new Error('Review the complete seasonal essay boundary.');
  const text=article.slice(0,boundary).trimEnd();
  return {sourceSlug:slug,file:source.file,sha256:source.sha256,essay:{start:0,end:text.length,
    sha256:createHash('sha256').update(text).digest('hex'),wordCount:text.split(/\s+/u).length}};
});
const manifest={schema:'seasonal-argument-evidence/v1',assignment:{date:'2026-10-01',
  reference:'codex-task:01a0ce6e-69e0-7100-bdba-ad413d5c7804',
  scope:'Owner selected these three complete essays as preferred seasonal voice evidence. They guide argument, emotional reasoning and sentence movement, not current facts or reader publication.'},sources};
const serialized=JSON.stringify(manifest,null,2)+'\n';
if(process.argv.includes('--check')){if(read(SEASONAL_ARGUMENT_MANIFEST)!==serialized)throw new Error('Seasonal argument manifest is stale.');}
else fs.writeFileSync(SEASONAL_ARGUMENT_MANIFEST,serialized);
console.log(`Verified ${loadSeasonalArgumentEvidence(read).length} complete preferred essays in the unchanged owner corpus.`);
