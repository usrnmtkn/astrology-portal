import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {createRequire} from 'node:module';

// Match Vite's automatic JSX transform without starting a browser or server.
const bundle=await build({stdin:{contents:"export {default} from './apps/admin/src/HoroscopeGenerationDetails';",resolveDir:process.cwd()},bundle:true,
  platform:'node',format:'cjs',packages:'external',jsx:'automatic',write:false});
const module={exports:{} as any};
new Function('require','module','exports',bundle.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
const HoroscopeGenerationDetails=module.exports.default;

const render=(props:any)=>renderToStaticMarkup(createElement(HoroscopeGenerationDetails,props));
const held={code:'voice_review_required',message:'Saved for review.',candidate:{body:'Complete synthetic draft.'},review:{
  rhetoric:{findings:[{label:'Synthetic rhetoric',quote:'Complete rhetorical quote.',reason:'Exact reason.',readerConsequence:'Exact consequence.'}]},
  weeklyDirection:{observation:{outcome:'fail',quote:'Complete direction quote.',reason:'Exact direction reason.'}},voiceReview:{
  author_voice:{outcome:'revise',candidateParagraphText:'Complete candidate <script>text</script>.',reason:'The observation becomes an interchangeable lesson.',referenceId:'designated-source',referenceRole:'Primary complete owner-supplied Weekly voice example; historical astrology only.',referenceParagraphText:'Complete original reference paragraph.'},
  ending:{outcome:'unassessed',reason:'No supported comparison was established.'}
}}};
const html=render({view:'reviews',holds:[['aries',held]],locked:false,active:false,canRecover:()=>false,onRecover:()=>{},onEdit:()=>{},onReject:()=>{}});
for(const text of ['Aries needs voice review','Complete candidate &lt;script&gt;text&lt;/script&gt;.','Complete original reference paragraph.','Primary complete owner-supplied','ending — not assessed','Edit saved Aries draft','Reject Aries draft'])assert(html.includes(text),text);
assert(!html.includes('<script>'));assert(!html.includes('Check saved Aries prose review'));
for(const text of ['Complete rhetorical quote.','Exact reason.','Exact consequence.','Complete direction quote.','Exact direction reason.'])assert(html.includes(text),text);
const cost=render({view:'generation',period:'daily',state:'ready',showBudget:true,available:1});
assert(cost.includes('Up to 3 paid AI requests'));
assert(cost.includes('No automatic rewrites or paid retries. You approve wording.'));
console.log('PASS voice-review UI: complete cited context, original reference roles, explicit unassessed state, escaped model text, free edit/reject actions and accurate cost scope. Synthetic evidence only.');
