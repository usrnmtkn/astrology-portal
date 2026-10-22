import assert from "node:assert/strict";
import { createTransitSynastryRenderer as browserFactory } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser";
import { createTransitSynastryRenderer as shippedFactory } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import fs from "node:fs";
import { connectionActivationKey, connectionAspectWord, connectionBridgeTemplates, connectionSourceErrors, fillConnectionSource } from "../apps/web/src/content/connectionTransit";
import { publishedConnectionCopy, connectionBridgeCopy } from "../apps/web/src/features/friends/connectionTransitSources";
import { connectionSourceDraft } from "../apps/admin/src/connectionTransitSources";
import { packagePublicationAdmissionIssue } from "../api/_lib/content-studio-package-admission";
import { installContentPublications } from "../apps/web/src/content/contentPublicationState";
import { connectionTransitReading } from "../apps/web/src/features/friends/connectionTransitReading";
import type { AuthoredCard } from "../apps/web/src/content/fallbackArchitectureV3Runtime";
import type { GeneratedContentRow } from "../apps/web/src/services/generatedContent";

const key = connectionActivationKey("ascendant", "square", "saturn")!;
const makeRow = (content_key: string, body_you: string, status = "LIVE") => ({ id: content_key, content_key, status, lane: "serving", review_state: null,
  updated_at: "2026-10-15T12:00:00Z", sections: { packageRecord: { body_you, body_they: "A different direction.", review_status: "approved" } }
}) as GeneratedContentRow;
const variables = { holder1: "O'Neil $&", transitPlanet: "Saturn", transitAspectWord: "sextile", endpointPoint: "Ascendant", yourPoint: "Ascendant", theirPoint: "Saturn", synastryAspectWord: "square" };
const body = "You talk to {{holder1}}. The whole final sentence stays here.";
const exact = makeRow(key, body);
assert.equal(publishedConnectionCopy([exact], key, variables), "You talk to O'Neil $&. The whole final sentence stays here.");
for (const status of ["DRAFT", "REVIEWED", "ARCHIVED"]) assert.equal(publishedConnectionCopy([makeRow(key, body, status)], key, variables), null);
assert.equal(publishedConnectionCopy([makeRow(key, "")], key, variables), null);
assert.equal(publishedConnectionCopy([makeRow("fallback-hook/bond-effect-sextile/saturn", body), makeRow("fallback-hook/synastry-pair/saturn/ascendant/hard", body), makeRow(connectionActivationKey("saturn", "square", "ascendant")!, body)], key, variables), null);
assert.equal(publishedConnectionCopy([makeRow(key, "Hello {{holder2}}.")], key, variables), null);
assert.equal(connectionActivationKey("ascendant", "hard", "saturn"), null);
assert(connectionSourceErrors(key, "Hello {{holder2}}.").length);
assert.equal(fillConnectionSource(key, body, {}), null);
for (const template of connectionBridgeTemplates) {
 assert.equal(connectionBridgeCopy([], template.contentKey, variables), null, "Unsaved bridge starters never serve");
 const bridgeRow = makeRow(template.contentKey, "");
 (bridgeRow.sections as any).packageRecord.body = template.body;
 assert(connectionBridgeCopy([bridgeRow], template.contentKey, variables)?.includes("O'Neil $&"));
 assert.equal(connectionBridgeCopy([{...bridgeRow,status:"DRAFT"}], template.contentKey, variables), null);
 const draft = connectionSourceDraft(template.contentKey);
 assert.equal(draft.status, "DRAFT"); assert.equal(draft.sourceSnapshot?.contentType, "connection-transit-bridge");
 assert.equal(packagePublicationAdmissionIssue({ content_key: template.contentKey, status: "LIVE", facts: draft.facts, sections: draft.sections }), null);
 assert(packagePublicationAdmissionIssue({ content_key: template.contentKey, status: "LIVE", facts: draft.facts, sections: { packageRecord: { ...(draft.sections?.packageRecord as object), contentKey: key } } }), "Publication must preserve its source key");
 installContentPublications([{content_key:template.contentKey,state:"retired",revision:999999,updated_at:"2026-10-15T12:00:00Z",row_id:null,row_updated_at:null}]);
 assert.equal(connectionBridgeCopy([], template.contentKey, variables), null, "Retired templates must not resurrect defaults");
}
const starter = connectionSourceDraft(key);
assert.equal(starter.status, "DRAFT"); assert.equal(starter.sourceSnapshot?.contentType, "connection-activation");
assert.equal((starter.sections?.packageRecord as any).body_you, "");
assert(packagePublicationAdmissionIssue({content_key:key,status:"LIVE",facts:starter.facts,sections:starter.sections}));
const panel = fs.readFileSync(new URL("../apps/web/src/features/friends/ManualChartsPanel.tsx", import.meta.url), "utf8");
const detail = panel.slice(panel.indexOf("  const openBondTransitDetail ="), panel.indexOf("  const openBondTransitById ="));
const decision = panel.slice(panel.indexOf("  const selectedBondTransitSections ="), panel.indexOf("  const selectedBondTransitViewCards ="));
assert.match(decision, /connectionTransitReading/);
assert.match(detail, /const transitSections = selectedBondTransitSections\.get\(card\.id\) \?\? \[\];/);
assert.doesNotMatch(detail, /card\.effectBody|renderReaderDirectedSynastryContact|bond-effect-/);
const transitFacts = { transiting:"saturn",natal:"ascendant",aspect:"sextile",voice:"you",window:"Until November 15, 2026" };
const approved = (contentKey:string, body_you = "The whole passage. {{aspectWord}} through {{untilDate}}.", body_they = "{{Name}} has the whole passage through {{untilDate}}.") => ({contentKey,content_role:"full_copy",body_you,body_they,review_status:"approved",approval:{approvalLevel:"exact_owner_approved",recordPath:"test-only",payloadSha256:"a".repeat(64),approvedAt:"2026-10-15"}} as AuthoredCard);
const exactKey="authored/transit-aspect/saturn/ascendant/sextile";
const familyKey="authored/transit-aspect/saturn/ascendant/soft";
const lookup = (key:string) => approved(key);
for (const selected of [exactKey, familyKey, exactKey+"/pass-2", exactKey+"/variant-2", exactKey+"/aries/1/7"]) {
 assert.equal(connectionTransitReading(transitFacts,lookup,[selected])?.contentKey,selected);
}
for (const selected of ["authored/transit-return/saturn","fallback-template/transit.aspect","authored/transit-aspect/ascendant/saturn/soft","authored/transit-aspect/saturn/ascendant/any","authored/transit-aspect/saturn/ascendant/conjunction","authored/transit-aspect/any/ascendant/soft"]) {
 assert.equal(connectionTransitReading(transitFacts,()=>{throw new Error("Out-of-scope source was read");},[selected]),null);
}
assert.equal(connectionTransitReading({...transitFacts,voice:"O'Neil $&"},lookup,[familyKey])?.body,"O'Neil $& has the whole passage through November 15, 2026.");
assert.equal(connectionTransitReading({...transitFacts,voice:"Nikki {A}"},lookup,[familyKey])?.body,"Nikki {A} has the whole passage through November 15, 2026.");
assert.equal(connectionTransitReading({...transitFacts,voice:"Nikki"},key=>approved(key,"Whole passage.",""),[familyKey]),null,"No automatic friend adaptation");
assert.equal(connectionTransitReading(transitFacts,()=>null,[exactKey,familyKey]),null,"Unavailable selected source never falls through");
const moonKey="authored/transit-aspect/moon/m/soft/variant-A";
assert.equal(connectionTransitReading({...transitFacts,transiting:"moon",natal:"mercury",aspect:"trine"},lookup,[moonKey])?.contentKey,moonKey);
for (const [transiting,natal,family] of [["saturn","sun","hard"],["venus","saturn","hard"],["mercury","venus","soft"]] as const) {
 const facts={...transitFacts,transiting,natal,aspect:"conjunction",voice:"Nikki"};
 const selectedKey=`authored/transit-aspect/${transiting}/${natal}/${family}`;
 assert.equal(connectionTransitReading(facts,lookup,[selectedKey])?.contentKey,selectedKey,"Admit only the already-selected matching conjunction family");
 const opposite=`authored/transit-aspect/${transiting}/${natal}/${family==='hard'?'soft':'hard'}`;
 assert.equal(connectionTransitReading(facts,()=>{throw new Error("Opposite family was read");},[opposite]),null);
 assert.equal(connectionTransitReading(facts,()=>null,[selectedKey,opposite]),null,"Missing/retired selected family cannot shift identity");
 assert.equal(connectionTransitReading(facts,key=>approved(key,"Whole passage.",""),[selectedKey]),null,"Conjunctions require their own authored friend voice");
 for (const factory of [browserFactory,shippedFactory]) {
  const source=approved(selectedKey),other=approved(opposite);
  const render=factory({authoredCards:[source,other]},{templates:[]},{hookRows:[],vocabularyRows:[]}).renderTransitAspect;
  const selected=render({...facts,window:facts.window});
  assert.equal(selected.contentKey,selectedKey,"The canonical normalizer chooses this exact same-contact family");
  assert.equal(connectionTransitReading(facts,key=>[source,other].find(row=>row.contentKey===key)??null,[selected.contentKey!])?.contentKey,selectedKey);
  const retired=factory({authoredCards:[other]},{templates:[]},{hookRows:[],vocabularyRows:[]},{blockedContentKeys:[selectedKey]}).renderTransitAspect;
  assert.throws(()=>retired({...facts,window:facts.window}),/Publication unavailable/,"Retired matching conjunction family cannot shift to another source");
 }
}
const currentTransitCorpus=JSON.parse(fs.readFileSync(new URL("../apps/web/src/content/fallbackArchitectureV3/bundled-transit-core-authored-cards-v3.json",import.meta.url),"utf8"));
const saturnSun=currentTransitCorpus.authoredCards.find((row:AuthoredCard)=>row.contentKey==='authored/transit-aspect/saturn/sun/hard');
assert(saturnSun?.body_they,"The existing real same-contact friend voice is complete");
assert.equal(connectionTransitReading({...transitFacts,transiting:'saturn',natal:'sun',aspect:'conjunction',voice:'Nikki'},()=>saturnSun,[saturnSun.contentKey])?.contentKey,saturnSun.contentKey,"The unchanged Friends approval wrapper admits the actual first visual-contract card");
for (const planet of ["saturn","pluto","moon","venus"]) {
 const facts={...transitFacts,transiting:planet,natal:planet,aspect:"conjunction"};
 assert.equal(connectionTransitReading(facts,()=>{throw new Error("Return writing was read");},[`authored/transit-aspect/${planet}/${planet}/conjunction`,`authored/transit-aspect/${planet}/${planet}/hard`,`authored/transit-aspect/${planet}/${planet}/soft`]),null,"No return or same-point conjunction source enters A");
}
// Exercise the real browser/shipped resolver identity, rather than inventing
// selected keys. The page-level browser suite covers the actual App normalizer.
for (const factory of [browserFactory, shippedFactory]) {
 const exact = approved(exactKey), family = approved(familyKey);
 const insert = approved("authored/transit-aspect-insert/saturn/ascendant/sextile", "An appended insert must not enter A.");
 const rows = [exact, family, insert];
 const render = factory({authoredCards:rows}, {templates:[]}, {hookRows:[],vocabularyRows:[]}).renderTransitAspect;
 const selected = render({...transitFacts,window:transitFacts.window});
 assert.equal(selected.contentKey,exactKey);
 assert(selected.body.includes("An appended insert"));
 const reading = connectionTransitReading(transitFacts,key=>rows.find(row=>row.contentKey===key)??null,[selected.contentKey!]);
 assert.equal(reading?.contentKey,selected.contentKey);
 assert.equal(reading?.body,"The whole passage. sextile through November 15, 2026.");
 const retired = factory({authoredCards:[family]}, {templates:[]}, {hookRows:[],vocabularyRows:[]}, {blockedContentKeys:[exactKey]}).renderTransitAspect;
 assert.throws(()=>retired(transitFacts),/Publication unavailable/,"Retired selected exact identity cannot shift to family");
}
assert.match(decision,/normalizePersonalTransitSurface/);
console.log("Connection separation passed: exact directed sources, missing/draft/retired handling, literal names, isolated drafts and no cross-type fallback.");

// Direct transits must be independently calculated for the other chart. A
// synastry aspect alone never manufactures one, even when its planet matches.
const { connectionTransitContext } = await import('../apps/web/src/services/connectionTransitContext');
const factTransit = (natalPoint: string, aspect = 'conjunction', transitPlanet = 'Mars', orb = "0° 30'") => ({
 id: `${transitPlanet}-${aspect}-${natalPoint}`, transitPlanet, transitSign: 'Leo', natalPoint, aspect, orb
}) as import('../apps/web/src/App').TransitItem;
const factContact = (yourPoint: string, friendPoint: string, aspect: string) => ({
 id: `${yourPoint}-${aspect}-${friendPoint}`, yourPoint: {name:yourPoint}, friendPoint:{name:friendPoint}, aspect, orb:0.4
}) as import('../apps/web/src/App').SynastryContact;
const contextOptions = {
 activation:factTransit('Moon','square'), endpointOwner:'reader' as const,
 contacts:[factContact('Moon','Mercury','square'),factContact('Moon','Chiron','opposition'),factContact('Moon','Venus','trine')],
 friendName:'Nikki', windowLabel:'Until October 30, 2026',
 titleOf:(transit:import('../apps/web/src/App').TransitItem,owner:string)=>`${transit.transitPlanet} in ${transit.transitSign} ${connectionAspectWord(transit.aspect)} ${owner==='you'?'your':`${owner}'s`} natal ${transit.natalPoint}`,
 orbOf:(transit:import('../apps/web/src/App').TransitItem)=>{
 const parts=transit.orb.match(/^(\d+)° (\d+)'$/);return parts?Number(parts[1])+Number(parts[2])/60:NaN;
 },
 aspectWord:connectionAspectWord
};
const snapshot=JSON.stringify(contextOptions);
const factsText = (context: ReturnType<typeof connectionTransitContext>) => context.facts?.groups.map(group => [group.heading, ...group.rows.map(row => `${row.title} · Orb ${row.orb}`)].join('\n')).join('\n') ?? '';
const mixed=connectionTransitContext({...contextOptions,counterpartTransits:[
 factTransit('Mercury','conjunction','Mars',"2° 30'"),factTransit('Chiron','square'),
 factTransit('Venus','conjunction','Jupiter'),factTransit('Sun'),factTransit('Venus','quincunx'),
 factTransit('Venus','conjunction','Mars','unknown')
]});
assert.equal(mixed.directTransits.length,2,'Match the moving planet, exact opposite natal endpoint and a supported calculated aspect, including beyond the one-degree bond-card cutoff');
assert.match(mixed.cardBody,/Direct transits to both charts:/);
assert.match(mixed.cardBody,/Other connections through your natal Moon: Nikki's natal Venus\./);
assert.match(mixed.cardBody,/Until October 30, 2026/,'Retain the primary transit date');
assert.match(factsText(mixed),/Mars in Leo conjunct Nikki's natal Mercury · Orb 2° 30′/);
assert.match(factsText(mixed),/Your natal Moon opposite Nikki's natal Chiron · Orb 0° 24′/);
assert.match(factsText(mixed),/Your natal Moon trine Nikki's natal Venus · Orb 0° 24′/);
assert.doesNotMatch(factsText(mixed),/Mars in Leo quincunx/);
assert.deepEqual(mixed.facts?.groups.map(group => [group.key, group.rows.length]), [['primary',1],['direct',2],['shared',2],['through',1]]);
assert.equal(mixed.facts?.groups[1].heading, "Mars is also touching two of Nikki's natal points");
assert.equal(mixed.facts?.groups[2].heading, 'Your Moon already connects to those same two natal points');
assert.deepEqual(mixed.facts?.groups[1].rows[0], {key:'Nikki:Mercury:conjunction',title:"Mars in Leo conjunct Nikki's natal Mercury",aspect:'conjunction',orb:'2° 30′'});
assert.equal(JSON.stringify(contextOptions),snapshot,'Context formatting cannot mutate source facts');
const indirect=connectionTransitContext({...contextOptions,counterpartTransits:[]});
assert.equal(indirect.directTransits.length,0);
assert.doesNotMatch(indirect.cardBody,/Direct transits to both charts/);
assert.match(indirect.cardBody,/This transit may bring your existing Moon connections with Nikki into focus\./);
assert.match(factsText(indirect),/Mars is touching your Moon/);
assert.match(factsText(indirect),/Connections through your natal Moon:/);
const allDirect=connectionTransitContext({...contextOptions,contacts:[contextOptions.contacts[0]],counterpartTransits:[factTransit('Mercury')]});
assert.match(allDirect.cardBody,/Direct transits to both charts:/);
assert.equal(allDirect.facts?.groups[1].heading, "Mars is also touching one of Nikki's natal points");
assert.equal(allDirect.facts?.groups[2].heading, 'Your Moon already connects to that same natal point');
assert.deepEqual(allDirect.facts?.groups.map(group => group.key), ['primary','direct','shared']);
assert.doesNotMatch(allDirect.cardBody,/Other connections through/,'An all-direct group has no empty indirect section');
const reversed=connectionTransitContext({...contextOptions,endpointOwner:'friend',contacts:[factContact('Venus','Moon','trine'),factContact('Saturn','Moon','sextile')],counterpartTransits:[factTransit('Venus','opposition')]});
assert.match(reversed.cardBody,/This transit may bring Nikki's existing Moon connections with you into focus\./);
assert.match(reversed.cardBody,/Mars in Leo opposite your natal Venus/);
assert.match(reversed.cardBody,/Other connections through Nikki's natal Moon: your natal Saturn\./);
assert.equal(reversed.facts?.groups[0].heading, "Mars is touching Nikki's Moon");
assert.equal(reversed.facts?.groups[1].heading, 'Mars is also touching one of your natal points');
assert.match(factsText(reversed),/Your natal Saturn sextile Nikki's natal Moon · Orb 0° 24′/);
assert.equal(connectionTransitContext({...contextOptions,contacts:[],counterpartTransits:[factTransit('Mercury')]}).cardBody,'');
console.log('Connection context passed: independent direct transits, mixed and indirect groups, both endpoint owners, complete orbs, dates, empty groups and immutable facts.');

assert.equal(connectionTransitContext({...contextOptions,contacts:[],counterpartTransits:[]}).facts,null);
assert.deepEqual(indirect.facts?.groups.map(group => group.key), ['primary','through']);
assert.equal(allDirect.facts?.caution,'');
