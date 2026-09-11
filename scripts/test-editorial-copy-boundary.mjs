import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assertCleanReaderCopy, readerCopyIssues, separateOwnerArticle } from '../apps/web/src/content/editorialCopyBoundary.mjs';
const source=`# Templated article — Example (layer two evergreen, needs_review)

Third batch. Sources: source pack.

---

# Example Article

Keep this complete opening paragraph, exactly.

{{eventSection: Use {{eventDate}} only after calculation.}}

## Horoscopes
*(Block architecture per the structure spec. {{threads}} fill from the engine.)*
### Example Rising
Keep the entire final paragraph, exactly.

---
## Status
needs_review. On approval: imports as example.
`;
const clean=separateOwnerArticle(source);
assert.equal(clean.headline,'Example Article');
assert(clean.body.includes('Keep this complete opening paragraph, exactly.'));
assert(clean.body.includes('Keep the entire final paragraph, exactly.'));
assert(clean.body.includes('{{eventSection}}'));
assert.equal(clean.originalText,source);
assert.equal(clean.slotDescriptions.eventSection[0],'Use {{eventDate}} only after calculation.');
assert.equal(clean.notes.length,4);
assert.deepEqual(separateOwnerArticle(clean.body).body,clean.body,'already clean imports are idempotent');
assert.equal(separateOwnerArticle(source,{editorOnly:true}).body,'');
for(const field of ['headline','summary','body','body_you','body_they','Article','Copy']){
  assert.throws(()=>assertCleanReaderCopy({sections:{packageDraft:{[field]:'needs_review'}}}),/Internal drafting notes/);
}
assert.throws(()=>assertCleanReaderCopy({body:'Keep this.\n## Status\nOn approval: imports as example.'}),/Internal drafting notes/);
assert.throws(()=>assertCleanReaderCopy({summary:'REVIEWED · authored-content · composite'}),/workflow summary/);
assert.throws(()=>assertCleanReaderCopy({body:"Here's your revised article: Welcome."}),/AI response wrapper/);
assert.doesNotThrow(()=>assertCleanReaderCopy({body:'Review your plans. Draw on external sources: mentors and friends.',source_snapshot:{notes:'needs_review'},sections:{packageRecord:{review_status:'needs_review',editorial_notes:'Drafting notes: preserve.'}}}));
assert.deepEqual(readerCopyIssues({sections:{paragraphs:[{text:'Internal note.\n## Status\nneeds_review'}]}}).map(x=>x.path),['sections.paragraphs[0].text','sections.paragraphs[0].text']);
assert.throws(()=>separateOwnerArticle('# Templated article — missing reader heading'),/no reader article heading/);
assert.throws(()=>separateOwnerArticle('# Article\n{{unfinished'),/Unclosed/);
const edition=separateOwnerArticle('# Article\nKeep all prose. {{aspectHits placed per house}}');
assert.equal(edition.body,'# Article\nKeep all prose. {{aspectHits}}');
assert.deepEqual(edition.slotDescriptions.aspectHits,['placed per house']);
assert.deepEqual(edition.notes,['{{aspectHits placed per house}}']);
assert.throws(()=>assertCleanReaderCopy({body:'{{aspectHits placed per house}}'}),/instruction inside template variable/);
assert.throws(()=>separateOwnerArticle('# Article\n{{unknown write something here}}'),/instruction inside template variable/);
assert.doesNotThrow(()=>assertCleanReaderCopy({body:'{{Name}} {{ entryDate }} {{aspectHits}}'}));
for(const file of ['scripts/apply-tldr-astro-authored-library-complete.mjs','scripts/prepare-tldr-astro-store-import.mjs']){
 const text=fs.readFileSync(file,'utf8');
 assert.doesNotMatch(text,/summary:[^\n]*\[.*join\(" · "\)/u);
}
assert(fs.readFileSync('AGENTS.md','utf8').includes('No internal drafting notes in reader copy'));
console.log('PASS import separation, exact prose preservation, balanced slots, nested reader fields, metadata exclusions and import rules');

const materializer = fs.readFileSync('scripts/materialize-fallback-architecture-v3-dashboard-rows.mjs','utf8');
assert.doesNotMatch(materializer.match(/function rowSummary[\s\S]*?\n\}/u)[0], /record\.notes?/u);
assert.match(materializer,/importSummary: String\(record\.note/u);

for (const mode of ['feed', 'in_depth']) {
  for (const status of ['REVIEWED', 'CONFIRMED']) {
    assert.throws(() => assertCleanReaderCopy({sections:{byMode:{[mode]:{summary:`${status} · internal-batch`}}}}), /workflow summary/);
  }
}

for (const note of ['Your published blocks, aspect threads moved to slots, per the owner ruling.', 'Twelve rising blocks, authored per edition. {{transitThreads}} fill from the engine.']) {
  const imported=separateOwnerArticle(`# Article\nKeep this paragraph.\n*(${note})*\nKeep the ending.`);
  assert.equal(imported.body,'# Article\nKeep this paragraph.\nKeep the ending.');
  assert.deepEqual(imported.notes,[`*(${note})*\n`]);
  assert.throws(()=>assertCleanReaderCopy({body:note}),/editorial instruction/);
}
