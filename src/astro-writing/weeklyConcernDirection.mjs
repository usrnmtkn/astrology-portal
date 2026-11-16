export const WEEKLY_OWNER_DIRECTION='weekly-owner-direction/v1';
export const WEEKLY_DIRECTION_CHECKS=['concern','stakes','observation','ending'];

export function weeklyOwnerDirection(prepared,sign){
  if(prepared.edition.window.period!=='weekly')return null;
  const edits=(prepared.weeklyBatchPlan?.ownerEdits??prepared.weeklyConcernEdits)?.[sign];
  return edits?{version:WEEKLY_OWNER_DIRECTION,sign,coreConcern:edits.coreConcern,stakes:edits.stakes,distinctiveObservation:edits.distinctiveObservation}:null;
}

export function weeklyDirectionWriterInput(direction){
  return `CURRENT SIGN SAVED EDITORIAL DIRECTION\n${JSON.stringify(direction)}\n\nCarry all three saved fields through the complete horoscope, including its ending. The concern defines the situation being developed; the stakes explain why its outcome matters; the observation defines the particular understanding or possibility this reading develops. Each selected transit and example must advance that same thought. Mentioning the observation in one middle paragraph, then returning to a different problem or a merely practical arrangement, does not fulfill it.\nThe ending must complete this sign's saved observation or a consequence earned from it. Do not replace it with generic advice, a new concern, or logistics that leave the saved possibility behind. Before returning, read the opening, each development and the final paragraph against all three fields; revise any drift within this draft. This is a coherence check, not a required paragraph sequence, repeated wording, checklist, moral or extra summary. End when the thought is complete.\nThese fields govern editorial intent, not reader sentences to copy, personal biography or additional astrology. Keep calculated facts, licensed meanings, current owner corrections and the complete saved voice examples authoritative. Do not invent unsupported events to satisfy a direction. Return only the existing reader fields.`;
}

const string={type:'string'};
const assessment={type:'object',additionalProperties:false,required:['outcome','quote','paragraph','reason'],properties:{outcome:{type:'string',enum:['pass','fail']},quote:string,paragraph:string,reason:string}};
export const WEEKLY_DIRECTION_SCHEMA={type:'object',additionalProperties:false,required:WEEKLY_DIRECTION_CHECKS,
  properties:Object.fromEntries(WEEKLY_DIRECTION_CHECKS.map(key=>[key,assessment]))};

export const WEEKLY_DIRECTION_REVIEW_INSTRUCTIONS=`SAVED WEEKLY DIRECTION CHECK
In addition to the three rhetorical protections, assess only this sign's supplied weeklyOwnerDirection against the complete candidate. Its exact concern, stakes and distinctiveObservation are editorial requirements, not voice evidence, personal facts or text to copy. Check concern, stakes and observation across the opening, developments and ending. A passing observation requires the reading to develop its particular meaning, not merely mention an associated activity once. The ending check must decide if the actual final paragraph completes that observation or an earned consequence, rather than changing the subject, reverting to a merely practical arrangement or substituting generic advice. Do not demand repeated field wording, a prescribed structure, a moral or an extra conclusion. A quiet ending can pass when it completes the same thought. Calculated facts and current owner corrections still govern; never reward invented facts or biography as compliance.
Return weeklyDirection with one assessment for each of concern, stakes, observation and ending. Every assessment needs a pass or fail outcome, an exact candidate-body quote, its complete containing paragraph including whitespace, and a concrete reason tied to the saved field. For a missing or displaced meaning, quote the actual wording that substitutes for it. The ending assessment must quote the actual final paragraph. Evaluate meaning, not keyword overlap. This is not prose approval or permission to rewrite. Keep the existing rhetorical checks and findings separate.`;

export function validateWeeklyDirection(value,candidate){
  const fail=()=>{throw Error('invalid_weekly_direction_review');};
  if(!value||Object.keys(value).sort().join()!==[...WEEKLY_DIRECTION_CHECKS].sort().join())fail();
  const paragraphs=candidate.body.split(/\n\s*\n/u).filter(paragraph=>paragraph.trim());
  for(const key of WEEKLY_DIRECTION_CHECKS){
    const item=value[key];
    if(!item||Object.keys(item).sort().join()!=='outcome,paragraph,quote,reason'
      ||!['pass','fail'].includes(item.outcome)||['quote','paragraph','reason'].some(field=>typeof item[field]!=='string'||!item[field].trim())
      ||!paragraphs.includes(item.paragraph)||!item.paragraph.includes(item.quote)
      ||key==='ending'&&item.paragraph!==paragraphs.at(-1))fail();
  }
  return value;
}
