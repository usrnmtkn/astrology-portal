import {adminFetchJson} from './admin-http.js';
import {studioStorage} from './sky-studio-sources.js';
import {activeStudioFeedback, studioFeedbackEnabled} from './studio-memory-feedback.js';
import {explicitWritingFeedbackRows} from './studio-explicit-writing-feedback.js';
import {listStudioWritingProfiles} from './studio-writing-profiles.js';
import {explicitFeedbackContentHash} from '../../src/astro-writing/explicitWritingFeedback.mjs';
import {createHash} from 'node:crypto';
import {HOROSCOPE_PROFILE_FIELDS} from '../../src/astro-writing/horoscopeWritingProfiles.mjs';
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');

/** Existing owner-only readers only. No draft, activation, save or paid call. */
export async function readLiveWritingRulebook() {
  const checkedAt = new Date().toISOString();
  const [profiles, feedback] = await Promise.allSettled([
    (async () => {
      const {url,headers} = studioStorage();
      return listStudioWritingProfiles(params => adminFetchJson(`${url}?${params}`,{headers}));
    })(),
    Promise.all([explicitWritingFeedbackRows(),activeStudioFeedback()]).then(([writing,edits]) => ({
      enabledForWriting: studioFeedbackEnabled(),
      writing: writing.filter(row => row.status === 'active').map(row => ({
        id: row.id, version: row.version, kind: row.kind, scope: row.target_keys,
        reason: row.owner_reason, rejected: row.kind === 'rejection' ? row.rejected_text : null,
        reasonSha256: hash(row.owner_reason), rejectedSha256: row.kind === 'rejection' ? hash(row.rejected_text) : null,
        sourceUri: row.source_uri, sourceDate: row.source_date, sha256: explicitFeedbackContentHash(row),
      })),
      edits: edits.filter(row => row.status === 'active').map(row => ({
        id: row.id, version: row.version, family: row.family, scope: row.scope, contentKey: row.content_key,
        before: row.before_text, after: row.after_text, reason: row.reason, updatedAt: row.updated_at,
        fieldHashes: {owner_reason:hash(row.reason),bad:hash(row.before_text),corrected:hash(row.after_text)},
      })),
    })),
  ]);
  const result = {checkedAt, complete: profiles.status === 'fulfilled' && feedback.status === 'fulfilled',
    profiles: profiles.status === 'fulfilled' ? {status:'current' as const, rows:profiles.value.map(row=>({...row,
      fieldHashes:Object.fromEntries(HOROSCOPE_PROFILE_FIELDS.map(field=>[field,hash(row.profile[field])]))}))}
      : {status:'unavailable' as const, error:'Saved horoscope instructions could not be loaded. Retry to review their current wording.'},
    feedback: feedback.status === 'fulfilled' ? {status:'current' as const, ...feedback.value}
      : {status:'unavailable' as const, error:'Active Studio corrections could not be loaded. Retry to review their current wording.'}};
  if (Buffer.byteLength(JSON.stringify(result))>3500000) return {checkedAt,complete:false,
    profiles:{status:'unavailable' as const,error:'The complete Studio reference exceeds its response limit. Maintenance is required; no wording was truncated.'},
    feedback:{status:'unavailable' as const,error:'The complete Studio reference exceeds its response limit. Maintenance is required; no wording was truncated.'}};
  return result;
}
