import assert from "node:assert/strict";
import { createTransitSynastryRenderer as browserFactory } from "../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser";
import { createTransitSynastryRenderer as shippedFactory } from "../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js";
import fs from "node:fs";
import { connectionActivationKey, connectionBridgeTemplates, connectionSourceErrors, fillConnectionSource } from "../apps/web/src/content/connectionTransit";
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
