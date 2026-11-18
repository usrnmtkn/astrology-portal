import { createHash } from 'node:crypto';

export const natalProfileDigest = value => createHash('sha256').update(
  typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');

/** A private, natal-specific profile. Horoscope/lunar profiles are not reused. */
export function resolveNatalWritingProfile(value) {
  const profile = value?.profile;
  if (!profile || profile.schema !== 'natal-writing-profile/v1'
    || typeof value.id !== 'string' || !value.id
    || !Number.isInteger(value.revision) || value.revision < 1
    || !Number.isFinite(Date.parse(value.updatedAt))
    || typeof profile.sourceUri !== 'string' || !profile.sourceUri
    || !Array.isArray(profile.surfaces) || profile.surfaces.length !== 2
    || !['you-natal', 'friends-natal'].every(surface => profile.surfaces.includes(surface))
    || typeof profile.guidance !== 'string' || !profile.guidance.trim()
    || !Array.isArray(profile.voiceReferences) || !profile.voiceReferences.length
    || !Array.isArray(profile.comparisons) || !profile.comparisons.length) {
    throw new Error('NATAL_WRITING_PROFILE: use the current private natal guidance and complete correction context.');
  }
  if (value.sha256 !== natalProfileDigest(profile)) throw new Error('NATAL_WRITING_PROFILE: profile changed after preparation.');
  for (const row of profile.voiceReferences) {
    if (row.role !== 'owner-selected-style' || typeof row.id !== 'string' || !row.id
      || typeof row.text !== 'string' || !row.text.trim() || row.sha256 !== natalProfileDigest(row.text)
      || typeof row.sourceUri !== 'string' || !row.sourceUri
      || row.factUseAuthorized !== false || row.ownerAuthored !== false || row.readerServing !== false) {
      throw new Error('NATAL_WRITING_PROFILE: complete selected style references failed integrity.');
    }
  }
  for (const row of profile.comparisons) {
    if (!['owner-preferred-revision', 'owner-rejected-draft'].includes(row.role)
      || typeof row.id !== 'string' || !row.id || typeof row.text !== 'string' || !row.text.trim()
      || row.sha256 !== natalProfileDigest(row.text)
      || typeof row.ownerReason !== 'string' || !row.ownerReason.trim()
      || typeof row.sourceUri !== 'string' || !row.sourceUri
      || row.useAsPositiveVoiceEvidence !== false || row.ownerApproved !== false) {
      throw new Error('NATAL_WRITING_PROFILE: correction context failed its role or exact-text check.');
    }
  }
  return { guidance: profile.guidance, comparisons: profile.comparisons, voiceReferences: profile.voiceReferences,
    receipt: { schema: profile.schema, id: value.id, revision: value.revision,
      updatedAt: value.updatedAt, sha256: value.sha256, sourceUri: profile.sourceUri } };
}
