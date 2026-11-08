import {AdminHttpError,adminFetchJson,adminStorageRows} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {assertCompiledSkyArticleEdition} from '../../apps/web/src/content/skyArticleTemplateCompiler.js';
import {skyArticleCompiledHashMatches} from './sky-article-reader-integrity.js';
import {WRITEUP_HOROSCOPE_SIGNS} from '../../src/shared/skyWriteupHoroscopes.js';
import {generateSkyArticleTemplateSlots,skyArticleTemplateSlotsExport,type GenerateSkyArticleTemplateSlotsInput} from './content-generation.js';
import {personalTransitWritingMemory} from './personal-transit-writing.js';
import {isSkyIngressEssay} from '../../apps/web/src/content/skyIngressEssay.mjs';

/** Draft one saved write-up field through the existing governed house writer.
 * The caller supplies direction, never replacement astrology or publication. */
export async function writeSkyWriteupHoroscope(body:Record<string,any>) {
  if(Object.keys(body).some(k=>!['writeupHoroscope','preview','provider','voiceNotes'].includes(k)))throw new AdminHttpError(400,'Choose a saved write-up and one horoscope sign.');
  const input=body.writeupHoroscope;
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['id','expectedUpdatedAt','sign','currentText'].includes(k))
    ||typeof input.id!=='string'||!input.id||typeof input.expectedUpdatedAt!=='string'||!input.expectedUpdatedAt
    ||!WRITEUP_HOROSCOPE_SIGNS.includes(input.sign)||typeof input.currentText!=='string'||input.currentText.length>50000
    ||body.voiceNotes!==undefined&&(typeof body.voiceNotes!=='string'||body.voiceNotes.length>6000)
    ||body.provider!==undefined&&!['openai','claude','anthropic'].includes(body.provider))throw new AdminHttpError(400,'Choose one sign and a current saved write-up version.');
  const {url,headers}=studioStorage();
  const result=await adminFetchJson(`${url}?${new URLSearchParams({id:`eq.${input.id}`,select:'*',limit:'1'})}`,{headers});
  if(!result.ok)throw new AdminHttpError(502,'The saved write-up could not be verified. No generation was started.');
  const row:any=adminStorageRows(result.payload)[0];
  if(!row||!['DRAFT','LIVE'].includes(row.status)||!['sky-article-edition','sky-article-edition-revision'].includes(row.event_type))throw new AdminHttpError(409,'Save and open a dated planetary write-up before generating its horoscopes.');
  if(row.updated_at!==input.expectedUpdatedAt)throw new AdminHttpError(409,'This write-up changed. Reopen its saved version before generating.');
  let edition:ReturnType<typeof assertCompiledSkyArticleEdition>;
  try { edition=assertCompiledSkyArticleEdition(row.sections?.skyArticleEdition); }
  catch { throw new AdminHttpError(409,'The saved write-up needs to be recompiled before generation.'); }
  if(!isSkyIngressEssay(edition.format)||!WRITEUP_HOROSCOPE_SIGNS.includes(edition.sign)||!skyArticleCompiledHashMatches(edition)
    ||row.headline!==edition.headline||row.summary!==edition.tldr||row.body!==edition.body
    ||(row.event_type==='sky-article-edition'?row.content_key!==edition.contentKey:row.source_snapshot?.targetContentKey!==edition.contentKey))throw new AdminHttpError(409,'The saved write-up needs to be recompiled before generation.');
  const house=(WRITEUP_HOROSCOPE_SIGNS.indexOf(edition.sign)-WRITEUP_HOROSCOPE_SIGNS.indexOf(input.sign)+12)%12+1;
  const contact={family:'house-complete' as const,contentKey:`authored/transit-house/${edition.planet}/${house}`,planet:edition.planet,house:String(house),sign:edition.sign};
  const engine=row.source_snapshot?.engineFacts;
  const source={id:row.id,updatedAt:row.updated_at,compiledHash:edition.compiledHash,sign:input.sign,startsAt:edition.transitStartInstant,endsAt:edition.transitEndInstant};
  const generationInput:GenerateSkyArticleTemplateSlotsInput={
    templateKey:`${edition.contentKey}/horoscopes/${input.sign}`,templateContextRole:'existing-draft',
    templateBody:`CURRENT ${input.sign.toUpperCase()} SIGN READING\n${input.currentText||'(empty)'}`,
    planet:edition.planet,sign:edition.sign,surface:'you',eventType:'transit-house',
    facts:{schema:'planetary-horoscope-writing/v1',family:'house-complete',planet:edition.planet,transiting:edition.planet,
      sign:edition.sign,house:String(house),risingSign:input.sign,houseSystem:'whole-sign',
      transitStartInstant:edition.transitStartInstant,transitEndInstant:edition.transitEndInstant,
      ...(engine?.articlePeriod==='current'&&['direct','retrograde'].includes(engine.motion)?{motion:engine.motion}:{}),
      placementScope:`One current-sky planetary horoscope for ${input.sign} Sun or Rising: ${edition.planet} in ${edition.sign}, whole-sign house ${house}. Use only the saved calculated coverage. No natal planets, personal chart or aspect hits were supplied.`,
      housesExcluded:false,signsExcluded:false,contentKey:contact.contentKey},
    requestedSlots:[{name:'horoscopeBody',description:`Write one complete second-person planetary horoscope for ${input.sign} Sun or Rising, for the supplied planet, sign, whole-sign house and calculated period. Develop only source-supported transit meaning. Treat current text as revision context; do not change any other sign or the article. Return reader prose only, without a heading or drafting notes.`}],
    knowledgeIds:[`transit-house/${edition.planet}/${house}`],
    writingMemory:await personalTransitWritingMemory(contact),provider:body.provider,voiceNotes:body.voiceNotes
  };
  if(body.preview)return {ok:true,writingExport:await skyArticleTemplateSlotsExport(generationInput),source,saved:false,published:false};
  const generation=await generateSkyArticleTemplateSlots(generationInput);
  return {ok:true,body:generation.slotValues.horoscopeBody,source,generation:{provider:generation.provider,model:generation.model,
    responseId:generation.responseId??null,generatedAt:generation.generatedAt,memoryReceipt:generation.memoryReceipt??null,
    generationMetadata:generation.generation_metadata??null},saved:false,published:false};
}
