import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createTransitSynastryRenderer as browser} from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts';
import {createTransitSynastryRenderer as shipped} from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import {renderLunationMacro as nodeMacro} from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs';
const root='apps/web/src/content/fallbackArchitectureV3/';
const read=(path:string)=>JSON.parse(fs.readFileSync(root+path,'utf8'));
const expected=fs.readFileSync('docs/content-management/owner-copy/virgo-new-moon-2026-09-07.txt','utf8').trimEnd();
const receipt=JSON.parse(fs.readFileSync('docs/content-management/owner-copy/virgo-new-moon-2026-09-07.json','utf8'));
assert.equal(crypto.createHash('sha256').update(expected).digest('hex'),receipt.sha256);
assert.equal(expected.split(/\s+/).length,receipt.wordCount);
const library=read('source-rows/transit-synastry-rows-v1.json');
const templates=read('templates/fallback-templates-v3.json');
const rows=read('source-rows/fallback-source-rows-v3.json');
const facts={kind:'new-moon',sign:'virgo'};
for(const render of [nodeMacro,browser(library,templates,rows).renderLunationMacro,shipped(library,templates,rows).renderLunationMacro]) assert.equal(render(facts).body,expected);
for(const file of ['bundled-sky-authored-cards-v3.json','bundled-transit-core-authored-cards-v3.json']) {
 const row=read(file).authoredCards.find((r:any)=>r.contentKey===receipt.contentKey);
 assert.equal(row.body,expected,file);
}
console.log('PASS exact saved Virgo New Moon rewrite, receipt, Node/browser/shipped resolver, and both bundled copies');
