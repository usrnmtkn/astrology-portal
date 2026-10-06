import {createHash} from 'node:crypto';
import {buildHoroscopePromptVariables} from './horoscopePromptVariables.mjs';
import {horoscopeSignLabel,horoscopeOverviewHeadline} from '../../apps/web/src/content/horoscopeEditions.mjs';
import {SEASONAL_PLAN_SLOT,validateSeasonalDevelopmentPlan,selectSeasonalPlanFacts} from './seasonalDevelopmentPlan.mjs';
import {seasonalContextBudget} from './seasonalContextBudget.mjs';

const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const pick = (value, keys) => Object.fromEntries(keys.filter(k => value[k] !== undefined).map(k => [k,value[k]]));

/** One fact catalog, with repeated placement meanings interned instead of copied.
 * Full briefs and retrieval packets remain in preparation/validation, unchanged.
 * Numbers and timestamps are never rounded or inferred in this projection.
 */
export function seasonalWriterFacts(facts) {
  const d = facts.developments;
  if (!d || !Array.isArray(d.events) || !Array.isArray(d.background)) throw new Error('Seasonal writing requires governed developments.');
  const meanings = {}, placements = {};
  const meaningRef = meaning => {
    if (!meaning) return undefined;
    const id = meaning.sourceId;
    if (!id) throw new Error('Seasonal meaning requires source identity.');
    if (meanings[id] && hash(meanings[id]) !== hash(meaning)) throw new Error(`Conflicting Seasonal meaning: ${id}`);
    meanings[id] = meaning;
    return id;
  };
  const binding = p => {
    const id = `${String(p.planet).toLowerCase()}/${String(p.sign).toLowerCase()}/${p.house ?? 'shared'}`;
    const value = {...pick(p,['planet','sign','house','domain']),meaningRef:meaningRef(p.meaning)};
    if (placements[id] && hash(placements[id]) !== hash(value)) throw new Error(`Conflicting Seasonal placement: ${id}`);
    placements[id] = value;
    return id;
  };
  const events = d.events.map(e => ({...pick(e,['id','type','startsAt','localTiming','title','fromSign','direction','planets','aspect','timingScope']),
    ...(e.placements ? {placementRefs:e.placements.map(binding),meaningRef:meaningRef(e.meaning)} : {placementRef:binding(e)})}));
  const background = d.background.map(p => ({...pick(p,['id','type','referenceDate','motion','timingScope']),placementRef:binding(p)}));
  const relationships = d.relationships ? {
    coverage:d.relationships.coverage,
    snapshots:d.relationships.snapshots.map(s => ({...pick(s,['at','eventIds','localDate','aspects','configurations','rulers']),
      positions:s.positions.map(p => pick(p,['planet','sign','degree','motion','house']))}))
  } : null;
  return {window:facts.window,referenceDate:facts.referenceDate,provenance:facts.provenance,coverage:facts.coverage,
    audience:facts.risingSign,placements,meanings,events,background,relationships,
    uninterpretedEventIds:d.uninterpretedEventIds,
    seasonalMeaning:facts.seasonalMeaning};
}

export function selectSeasonalDraftPassages(context,argumentOutline={}) {
  const primary = context.primaryRegisterPassages ?? [];
  if (primary.length < 3 || primary.length > 5) throw new Error('Select three to five complete primary Seasonal owner passages before drafting.');
  const unique = new Map();
  for (const p of primary) {
    if (!p.text?.trim() || !p.sourcePath) throw new Error('Seasonal owner passages require complete text and provenance.');
    unique.set(hash(p.text),{...p,draftingRole:'primary owner voice'});
  }
  if (unique.size < 3) throw new Error('Seasonal primary passages must be distinct.');
  // Retrieval already ranks the eligible same-audience passages. Choose a whole
  // unit; never extract a shorter span to fit a context budget.
  const ignored=new Set('about after again also another because before between could every from have into just more only other over same some than that their them then there these they this through what when where which while with would your sun moon mercury venus mars jupiter saturn uranus neptune pluto aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces house season'.split(' '));
  const words=text=>new Set((String(text).toLowerCase().match(/[a-z]{4,}/g)??[]).filter(w=>!ignored.has(w)));
  const concern=words([argumentOutline.thesis,argumentOutline.recognition,argumentOutline.complication,argumentOutline.response].filter(Boolean).join(' '));
  const supportingPool=(context.sameFamilyExamples??[]).filter(p=>!unique.has(hash(p.text)));
  const ranked=supportingPool.map(p=>({p,score:[...words(p.text)].filter(w=>concern.has(w)).length})).sort((a,b)=>b.score-a.score||a.p.id.localeCompare(b.p.id));
  for(const {p:supporting} of ranked){
    if(unique.size>=5)break;
    if(!unique.has(hash(supporting.text)))unique.set(hash(supporting.text),{...supporting,draftingRole:'supporting same-audience forecast'});
  }
  return [...unique.values()].map(p => ({id:p.id,sourcePath:p.sourcePath,textSha256:hash(p.text),
    role:p.draftingRole,text:p.text}));
}

export function buildSeasonalDraftInput({context,task,engineFacts,argumentOutline,writingProfile,evidenceManifest=null}) {
  if (engineFacts.window?.period !== 'seasonal' || writingProfile.profile.period !== 'seasonal') throw new Error('Seasonal drafting requires a matching profile and window.');
  const overview = engineFacts.risingSign === 'overview';
  const candidates = evidenceManifest ? evidenceManifest.entries.filter(e=>e.role==='approved').map(e=>({id:e.id,sourcePath:e.source.locator,textSha256:e.textHash,text:e.text,role:'primary owner voice'})) : selectSeasonalDraftPassages(context,argumentOutline);
  const catalog = seasonalWriterFacts(engineFacts);
  const developmentPlan = engineFacts.seasonalDevelopmentPlan;
  if(developmentPlan&&!evidenceManifest)validateSeasonalDevelopmentPlan(developmentPlan,catalog,candidates);
  const passages = developmentPlan ? developmentPlan.passageSelections.map(s=>({...candidates.find(p=>p.id===s.id),selectionReason:s.why})) : candidates;
  const primary = passages.filter(p => p.role === 'primary owner voice');
  const supporting = passages.filter(p => p.role !== 'primary owner voice');
  const factsText = `GOVERNED SEASONAL FACTS\n${JSON.stringify(developmentPlan?selectSeasonalPlanFacts(catalog,developmentPlan):catalog)}`;
  const variables = buildHoroscopePromptVariables({writingProfile,context,primaryPassages:primary,supportingPassages:supporting,factsText});
  const label = overview ? horoscopeOverviewHeadline(engineFacts.window) : `${horoscopeSignLabel(engineFacts.risingSign)} & ${horoscopeSignLabel(engineFacts.risingSign)} Rising`;
  return [
    'SURFACE\nhoroscopes\nCONTENT FAMILY\nhoroscope\nREGISTER\nsecond_person',
    `TASK\n${task}\nREADING HEADLINE\n${label}`,
    `CURRENT SEASONAL WRITING INSTRUCTIONS\n${variables.prompt}`,
    `AUDIENCE\n${overview ? 'One shared introduction for all signs. No personal houses or biography.' : `One ${engineFacts.risingSign} rising forecast using the supplied whole-sign houses.`}`,
    developmentPlan ? `COMPACT SEASONAL DEVELOPMENT PLAN\n${JSON.stringify(developmentPlan)}` : `OWNER-APPROVED WRITING PLAN\n${JSON.stringify(argumentOutline)}\n\nCOMPACT SEASONAL DEVELOPMENT PLAN\n${SEASONAL_PLAN_SLOT}`,
    ...(!variables.uses('primaryOwnerVoiceSources') ? [`SELECTED COMPLETE OWNER PASSAGES\n${JSON.stringify(primary)}`] : []),
    ...(!variables.uses('supportingOwnerVoiceSources') && supporting.length ? [`SELECTED SUPPORTING OWNER PASSAGE\n${JSON.stringify(supporting)}`] : []),
    ...(!variables.uses('governedFacts') ? [factsText] : []),
    ...(evidenceManifest ? [`SCOPED REJECTED OWNER EVIDENCE\n${JSON.stringify(evidenceManifest.entries.filter(e=>e.role==='rejected'))}`] : []),
    'FACT BOUNDARIES\nChoose from this catalog; it is not an event checklist. Every house belongs to its attached planet or lunation. Exact events and sampled relationships are separate: samples establish only the stated instant, orb and phase. Configurations require their supplied simultaneous aspects. Rulership and the symbolic season axis are meaning, not extra events. A reference position does not establish an ingress, duration or earlier cycle. Unknown circumstances remain possible, never guaranteed. Do not invent history or outcomes. Include the supplied local date when first mentioning a selected event; keep exact times outside prose.'
  ].join('\n\n');
}

/** Rebuild from pinned inputs after the separate planning response. The complete
 * input history stays private; only the chosen facts and whole passages dispatch.
 */
export function completeSeasonalDraftRequest(template,developmentPlan,evidenceManifest=null) {
  if(!template.seasonalPreparation)throw new Error('Missing pinned Seasonal preparation.');
  const preparation=template.seasonalPreparation;
  const input=buildSeasonalDraftInput({...preparation,evidenceManifest,engineFacts:{...preparation.engineFacts,seasonalDevelopmentPlan:developmentPlan}});
  if(input.includes(SEASONAL_PLAN_SLOT))throw new Error('Seasonal planning is incomplete.');
  const request={...template,stage:'draft',input};
  return {...request,contextBudget:seasonalContextBudget(request),contextReceipt:{version:'seasonal-composition/v1',
    fullFactsSha256:hash(preparation.engineFacts),fullEvidenceSha256:hash(preparation.context.sharedEvidencePacket),
    fullProfileSha256:preparation.writingProfile.sha256??hash(preparation.writingProfile.profile),
    approvedOutlineHash:preparation.argumentOutline.approvedOutlineHash,
    auditOnly:{correctionCount:preparation.context.corrections.length,sharedEvidenceEntryCount:preparation.context.sharedEvidencePacket.entries.length}}};
}
