/** Dated, owner-approved reuse of complete Moon and point readings. */
export const SKY_SEASON_FALLBACK_PREFIX = 'sky-season-fallback/';
const identity = /^sky-season-fallback\/[a-z]+-\d{4}\/(moon|lilith|north-node|south-node)\/([a-z]+)\/\d{4}-\d{2}-\d{2}$/u;
const signs = new Set('aries taurus gemini cancer leo virgo libra scorpio sagittarius capricorn aquarius pisces'.split(' '));
const object = (v: unknown): Record<string, any> | null => v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, any> : null;
const slug = (v: unknown) => typeof v === 'string' ? v.toLowerCase().replaceAll(' ', '-') : '';
export function skySeasonFallbackIdentity(key: string) {
  const match = identity.exec(key);
  return match && signs.has(match[2]) ? { planet: match[1], sign: match[2] } : null;
}
export function approvedSkySeasonFallback(row: {
  content_key: string; status?: string | null; lane?: string | null; review_state?: string | null;
  sections?: unknown; source_snapshot?: Record<string, unknown> | null;
}) {
  const key = skySeasonFallbackIdentity(row.content_key);
  const visit = object(object(row.sections)?.seasonFallback);
  const approval = object(row.source_snapshot?.ownerApproval);
  if (!key || row.status !== 'LIVE' || row.lane !== 'serving' || row.review_state
    || !visit || visit.schema !== 'libra-season-2026-placement-fallback/v1'
    || slug(visit.body) !== key.planet || slug(visit.sign) !== key.sign
    || approval?.approved !== true || approval.action !== 'approve-sky-season-fallback'
    || approval.contentKey !== row.content_key || approval.activeStart !== visit.seasonStart
    || approval.activeEnd !== visit.seasonEnd) return null;
  const start = Date.parse(visit.seasonStart), end = Date.parse(visit.seasonEnd);
  const entry = Date.parse(visit.entry), exit = Date.parse(visit.exit);
  return Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(entry) && Number.isFinite(exit)
    && entry <= start && start < end && end <= exit ? { ...key, start, end } : null;
}
