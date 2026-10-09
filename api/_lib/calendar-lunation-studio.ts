import {lunationArticleGuidance} from '../../src/astro-writing/lunationArticleInput.mjs';
import {AdminHttpError,adminFetchJson,adminStorageRows} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {getLunarCalendarRangeEvents} from '../../apps/web/src/services/ephemeris.js';
import {defaultLunationProfile,validateLunationProfile,LUNATION_PROFILE_KEY,LUNATION_WORKSPACE_PREFIX,emptyLunationWorkspace,lunationContentKey,LUNATION_ARGUMENT_FIELDS} from '../../src/astro-writing/lunationWritingProfile.mjs';
import {lunationDigest} from '../../src/astro-writing/lunationWritingFacts.mjs';
import {prepareLunationWriting,lunationWritingTarget} from '../../src/astro-writing/lunationWriting.mjs';
import {approveArgumentOutline} from '../../src/astro-writing/argumentGate.mjs';
import {runWritingPipeline} from '../../src/astro-writing/runWritingPipeline.mjs';
import {loadLunarSavedWriting} from './lunar-saved-writing.js';
import {LUNAR_SAVED_WRITING_GUIDANCE} from '../../src/astro-writing/lunationSavedWriting.mjs';

export const workspaceKey=(phase:string,sign:string)=>{lunationContentKey(phase,sign);return `${LUNATION_WORKSPACE_PREFIX}${phase}/${sign}`;};
export async function lunarStorage(params:URLSearchParams,options:RequestInit={}) {
  const {url,headers}=studioStorage();
  const result=await adminFetchJson(`${url}?${params}`,{...options,headers:{...headers,prefer:'return=representation'}});
  if(!result.ok)throw new AdminHttpError(result.status===409?409:503,'The lunar workspace could not be saved or loaded. Reload to check its saved version.');
  return adminStorageRows<any>(result.payload);
}
export async function readLunarRow(key:string) {
  const rows=await lunarStorage(new URLSearchParams({content_key:`eq.${key}`,mode:'eq.article',target_date:'is.null',select:'*',limit:'2'}));
  if(rows.length>1)throw new AdminHttpError(409,'Conflicting lunar workspace records need review.');
  const row=rows[0];
  if(row && (row.status!=='DRAFT'||row.lane!=='reference'||row.body!==''||!Number.isFinite(Date.parse(row.updated_at))))throw new AdminHttpError(409,'This editor-only workspace has an invalid saved state.');
  return row??null;
}
export async function saveLunarRow(key:string,expectedUpdatedAt:unknown,sections:any,existing:any,actor:string) {
  if(expectedUpdatedAt!== (existing?.updated_at??null))throw new AdminHttpError(409,'This workspace changed. Your edits are preserved; reload before saving.');
  const row={content_key:key,surface:'sky',mode:'article',target_date:null,status:'DRAFT',lane:'reference',event_type:'studio-writing-profile',provider:'manual-admin',prompt_version:'calendar-lunation-studio-v1',headline:key===LUNATION_PROFILE_KEY?'New & Full Moon writing guidance':'Lunar writing workspace',body:'',summary:'',sections,
    source_snapshot:{revision:(existing?.source_snapshot?.revision??0)+1,updatedBy:actor},updated_at:new Date(Math.max(Date.now(),Date.parse(existing?.updated_at??'')+1||0)).toISOString()};
  const params=existing?new URLSearchParams({id:`eq.${existing.id}`,updated_at:`eq.${existing.updated_at}`,status:'eq.DRAFT',lane:'eq.reference'}):new URLSearchParams();
  const rows=await lunarStorage(params,{method:existing?'PATCH':'POST',body:JSON.stringify(row)});
  if(rows.length!==1 || existing&&rows[0].id!==existing.id || rows[0].updated_at===existing?.updated_at)throw new AdminHttpError(409,'Another editor saved this workspace. Reload; newer edits were preserved.');
  if(lunationDigest(rows[0].sections)!==lunationDigest(sections))throw new AdminHttpError(502,'Storage did not confirm this exact edit. Reload before retrying.');
  return rows[0];
}
export async function loadLunarProfile() {
  const row=await readLunarRow(LUNATION_PROFILE_KEY);
  const profile=validateLunationProfile(row?.sections?.writingProfile??defaultLunationProfile());
  return {profile,id:row?.id??null,updatedAt:row?.updated_at??null,revision:row?.source_snapshot?.revision??0,sha256:lunationDigest(profile)};
}
export function validateWorkspace(value:any,phase:string,sign:string) {
  if(!value || Object.keys(value).some(k=>!['contentKey','phase','sign','referenceDate','timeZone','argumentInput','body','journalPrompt','preferredOwnerSourceIds'].includes(k))
    || value.contentKey!==lunationContentKey(phase,sign)||value.phase!==phase||value.sign!==sign)throw new AdminHttpError(400,'Send the selected lunar workspace.');
  const referenceInstant=Date.parse(`${value.referenceDate}T12:00:00Z`);
  if(typeof value.referenceDate!=='string'||value.referenceDate && (!/^\d{4}-\d{2}-\d{2}$/u.test(value.referenceDate)||!Number.isFinite(referenceInstant)||new Date(referenceInstant).toISOString().slice(0,10)!==value.referenceDate))throw new AdminHttpError(400,'Choose a valid reference date.');
  try {new Intl.DateTimeFormat('en',{timeZone:value.timeZone}).format();}catch{throw new AdminHttpError(400,'Choose a valid time zone.');}
  const argument=value.argumentInput;
  if(!argument||Object.keys(argument).some(k=>![...LUNATION_ARGUMENT_FIELDS,'scope_breadth'].includes(k)))throw new AdminHttpError(400,'Send the complete writing plan.');
  for(const field of LUNATION_ARGUMENT_FIELDS)if(typeof argument[field]!=='string'||argument[field].length>6000)throw new AdminHttpError(400,'Each plan field must be under 6,000 characters.');
  const scope=argument.scope_breadth;
  if(!scope||Object.keys(scope).some(k=>!['broad_mechanism','chosen_expression','other_valid_expressions'].includes(k))||typeof scope.broad_mechanism!=='string'||typeof scope.chosen_expression!=='string'||!Array.isArray(scope.other_valid_expressions)||scope.other_valid_expressions.length!==3||[scope.broad_mechanism,scope.chosen_expression,...scope.other_valid_expressions].some(v=>typeof v!=='string'||v.length>6000))throw new AdminHttpError(400,'Keep the three scope examples in the writing plan.');
  for(const field of ['body','journalPrompt'])if(typeof value[field]!=='string'||value[field].length>60000)throw new AdminHttpError(400,'Send body and journal prompt text under 60,000 characters.');
  if(value.preferredOwnerSourceIds && (!Array.isArray(value.preferredOwnerSourceIds)||value.preferredOwnerSourceIds.length>6||value.preferredOwnerSourceIds.some((id:any)=>typeof id!=='string'||id.length>200)))throw new AdminHttpError(400,'Invalid owner source selection.');
  return value;
}
export async function lunarFeedback(contentKey:string,family='lunations') {
  // This existing private store accepts explicit rejections without inventing an approved replacement.
  const {url,headers}=studioStorage();
  const params=new URLSearchParams({target_keys:`cs.{${contentKey}}`,status:'eq.active',select:'*',order:'created_at.desc,id.asc',limit:'501'});
  const result=await adminFetchJson(`${url.replace(/generated_interpretations$/u,'studio_writing_feedback')}?${params}`,{headers});
  if(!result.ok)throw new AdminHttpError(503,'Private writing feedback could not load. No writer call was started.');
  const rows=adminStorageRows<any>(result.payload);
  if(rows.length>500)throw new AdminHttpError(503,'The feedback inventory needs review before drafting.');
  for(const row of rows)if(!row.id||row.status!=='active'||!row.target_keys?.includes(contentKey)||!Number.isInteger(row.version)||!row.owner_reason||row.kind!=='rejection'||typeof row.rejected_text!=='string'||!row.rejected_text.trim())throw new AdminHttpError(503,'This target has unsupported or invalid writing feedback. Resolve its evidence before drafting.');
  return {rows,corrections:rows.map(row=>({id:`studio-writing-${row.id}`,contentKey,family,bad:row.rejected_text,owner_reason:row.owner_reason,originalSha256:lunationDigest(row.rejected_text),positive_evidence_revoked:true,source_uri:row.source_uri})),receipt:rows.map(row=>({id:row.id,version:row.version,sha256:lunationDigest(row)}))};
}
export async function calculateLunarWritingFacts(workspace:any) {
  if(!workspace.referenceDate)throw new AdminHttpError(400,'Choose the event’s date before preparing a plan.');
  const date=new Date(`${workspace.referenceDate}T12:00:00Z`),day=86400000;
  const events=await getLunarCalendarRangeEvents({label:'Geocentric reference',latitude:0,longitude:0,timeZone:workspace.timeZone},new Date(+date-(workspace.phase==='full-moon'?220:2)*day),new Date(+date+32*day));
  const kind=(event:any)=>event.glyph==='●'?'new-moon':'full-moon';
  const lunar=events.filter(e=>e.type==='lunation'&&e.primary&&e.sign);
  const event=lunar.find(e=>e.dateKey===workspace.referenceDate&&kind(e)===workspace.phase&&e.sign!.toLowerCase()===workspace.sign);
  if(!event)throw new AdminHttpError(422,'The ephemeris found no matching Moon on this date in this time zone. Check the phase, sign and date.');
  if(event.eclipseType)throw new AdminHttpError(422,'This event is an eclipse. Choose Dated articles & eclipses in this workspace.');
  const related=workspace.phase==='new-moon'?lunar.find(e=>kind(e)==='full-moon'&&e.startsAt>event.startsAt):lunar.filter(e=>kind(e)==='new-moon'&&e.sign!.toLowerCase()===workspace.sign&&e.startsAt<event.startsAt).at(-1);
  const fact=(e:any)=>({id:e.id,kind:kind(e),sign:e.sign.toLowerCase(),startsAt:e.startsAt,...(e.eclipseType?{eclipseType:e.eclipseType}:{})});
  return {source:'swiss-ephemeris',calculationSource:'apps/web/src/services/ephemeris.ts#getLunarCalendarRangeEvents',timeZone:workspace.timeZone,contentKey:workspace.contentKey,event:fact(event),relatedEvents:related?[{...fact(related),relationship:workspace.phase==='new-moon'?'next-full-moon':'previous-same-sign-new-moon'}]:[]};
}
export async function prepareStudioLunation(workspace:any,engineFacts?:any) {
  const [profile,feedback,facts]=await Promise.all([loadLunarProfile(),lunarFeedback(workspace.contentKey),engineFacts??calculateLunarWritingFacts(workspace)]);
  if(!profile.id)throw new AdminHttpError(409,'Save the writing guidance before preparing a draft.');
  const prepared=prepareLunationWriting({engineFacts:facts,argumentInput:workspace.argumentInput,preferredOwnerSourceIds:workspace.preferredOwnerSourceIds??[],privateCorrections:feedback.corrections});
  const savedWriting=await loadLunarSavedWriting(facts.event);
  prepared.receipt.feedbackStorage='private-studio/explicit-writing-feedback';
  const planHash=lunationDigest({receipt:prepared.receipt,profile:profile.sha256,feedback:feedback.receipt,approach:lunationArticleGuidance,savedWriting,savedWritingGuidance:LUNAR_SAVED_WRITING_GUIDANCE});
  return {prepared,profile,feedback,facts,planHash,savedWriting};
}
export function lunarPlanPreview(value:any) {
  return {planHash:value.planHash,outline:value.prepared.argumentOutline,facts:value.facts,profile:value.profile,
    ownerPassages:[...value.savedWriting.references.map((r:any)=>({sourceId:`${r.title} · ${r.contentKey}`,sourcePath:r.contentKey,sourceSha256:r.bodySha256,text:r.body})),...value.prepared.context.sameFamilyExamples],meaning:value.prepared.context.reviewedMeaningExamples,savedWriting:value.savedWriting,
    corrections:value.feedback.rows,receipt:value.prepared.receipt};
}
export function runStudioLunation(value:any,workspace:any,writerClient:any,approvalReference:string,approvalRuling='I approve this exact plan and one writer call.') {
  const outline=approveArgumentOutline(value.prepared.argumentOutline,{exactOwnerRuling:approvalRuling});
  return runWritingPipeline({...value.prepared.contextOptions,meaningInput:value.prepared.meaningInput,argumentInput:workspace.argumentInput,
    engineFacts:value.facts,familyContext:{savedLunarWriting:value.savedWriting},writingProfile:value.profile,family:'lunations',surface:'calendar-lunation',register:'second_person',target:lunationWritingTarget,
    task:'Write this New or Full Moon body and journal question for owner review.',approvedArgumentOutline:outline,
    argumentSource:{contentKey:approvalReference,sourcePath:approvalReference,ownerApproved:true,authority:'owner-approved-lunation-plan',opening:outline.thesis,tension:outline.sign_meaning,development:outline.recognition,close:outline.intention_or_reflection},writerClient});
}
export {emptyLunationWorkspace,LUNATION_PROFILE_KEY,validateLunationProfile};
