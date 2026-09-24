import { skyDashboardScopeFilter, skyListDashboardScopeFilter } from "../apps/web/src/services/skyDashboardScope.js";
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadLocalWebEnv } from './_lib/local-env.js';
import { readAdminJsonBody, AdminHttpError } from './_lib/admin-http.js';
import { projectReaderRow, READER_ROW_SCHEMA } from '../apps/web/src/content/readerRowProjection.mjs';
import { generatedRowPackageRole, isReaderServableGeneratedContentRow, isGeneratedContentReaderBoundaryAllowed } from '../apps/web/src/content/generatedContentEligibility.js';
import { isGovernedReaderEligible } from '../apps/web/src/content/fallbackArchitectureV3/resolver/readerEligibility.mjs';
import { publicationAllowsContent, publicationLedgerKey, validContentPublication } from '../apps/web/src/content/contentPublicationState.js';
import type { ContentPublication } from '../apps/web/src/content/contentPublicationState.js';
import type { GeneratedContentRow } from '../apps/web/src/services/generatedContent.js';
import { astro101IsLiveOnLearn, isAstro101ContentKey } from '../apps/web/src/content/astro101.js';
import { HOROSCOPE_PERIODS, horoscopeEditionFromRow } from '../apps/web/src/content/horoscopeEditions.mjs';

loadLocalWebEnv();
const pageSize = 250;
const select = 'id,content_key,surface,mode,status,lane,review_state,event_type,target_date,facts,source_snapshot,headline,summary,body,sections,block_type,flags,provider,model,updated_at,judge_score,judge_gate';
const providers = new Set(['tldrastro-fallback-architecture-v3', 'tldrastro-fallback-architecture-v3-sky-placement']);
const surfaces = new Set(['sky', 'you', 'natal', 'synastry', 'composite', 'relationship', 'modifier', 'year_ahead', 'education']);
type Query = { provider?: string; keys?: string[]; ids?: string[]; prefix?: string; surfaces?: string[]; targetDate?: string; afterId?: string; scope?: "sky" | "sky-list"; vocabularyOnly?: boolean; latestVersion?: boolean; horoscope?: {period:string; at:string} };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/iu;
const key = /^[a-zA-Z0-9_./:| -]{1,500}$/u;
class QueryError extends Error {}

async function readQuery(req: IncomingMessage): Promise<Query> {
  const value = await readAdminJsonBody<Record<string, unknown>>(req, 40_000);
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new QueryError('Invalid request.');
  if (Object.keys(value).some(name => !['provider', 'keys', 'ids', 'prefix', 'surfaces', 'targetDate', 'afterId', 'latestVersion', 'scope', 'vocabularyOnly', 'horoscope'].includes(name))) throw new QueryError('Unsupported reader query.');
  if (value.horoscope !== undefined) {
    const input = value.horoscope as Record<string,unknown>;
    if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !['period','at'].includes(key))
      || !HOROSCOPE_PERIODS.includes(input.period as any) || typeof input.at !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(input.at) || !Number.isFinite(Date.parse(input.at))
      || Object.keys(value).some(key => !['horoscope','afterId'].includes(key))) throw new QueryError('Invalid horoscope query.');
  }
  for (const name of ['keys', 'ids', 'surfaces'] as const) {
    const items = value[name];
    if (items === undefined) continue;
    if (!Array.isArray(items) || !items.length || items.length > (name === 'surfaces' ? 10 : 200)
      || items.some(item => typeof item !== 'string' || (name === 'ids' ? !uuid.test(item) : name === 'surfaces' ? !surfaces.has(item) : !key.test(item)))) throw new QueryError(`Invalid ${name}.`);
  }
  if (value.scope !== undefined && !['sky', 'sky-list'].includes(String(value.scope))) throw new QueryError('Invalid scope.');
  if (value.vocabularyOnly !== undefined && value.vocabularyOnly !== true) throw new QueryError('Invalid vocabulary scope.');
  if (value.provider !== undefined && !providers.has(String(value.provider))) throw new QueryError('Invalid provider.');
  if (value.prefix !== undefined && !['authored/compat-pair/', 'education/astro-101/'].includes(String(value.prefix))) throw new QueryError('Invalid prefix.');
  if (value.afterId !== undefined && (typeof value.afterId !== 'string' || !uuid.test(value.afterId))) throw new QueryError('Invalid cursor.');
  if (value.targetDate !== undefined && (typeof value.targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value.targetDate) || !Number.isFinite(Date.parse(value.targetDate)))) throw new QueryError('Invalid target date.');
  if (value.latestVersion !== undefined && (value.latestVersion !== true || !value.provider)) throw new QueryError('Invalid version query.');
  return value as Query;
}

export function readerRowIsEligible(row: GeneratedContentRow) {
  if (row.status !== 'LIVE' || row.lane !== 'serving' || row.review_state != null) return false;
  if (row.content_key.startsWith('sample-') || row.facts?.sampleOnly || row.source_snapshot?.sampleOnly) return false;
  if (row.flags?.some(flag => ['REFERENCE_ONLY_NEVER_SERVE_VERBATIM', 'PARAPHRASE_PENDING', 'BLOCKLIST_MATCH'].includes(flag))) return false;
  if (row.content_key.startsWith('horoscope/')) return Boolean(horoscopeEditionFromRow(row));
  // Education publishes its saved article fields. Its packageRecord is the
  // original import descriptor, whose review label is not the Studio decision.
  // The exact publication ledger is still required by the handler below.
  if (isAstro101ContentKey(row.content_key) && row.surface === 'education') return astro101IsLiveOnLearn(row);
  const record = (row.sections as Record<string, unknown> | null)?.packageRecord;
  if (record && typeof record === 'object' && !Array.isArray(record)) {
    const value = record as Record<string, unknown>;
    const approvedReviews = new Set(['approved', 'approved_reuse', 'reviewed']);
    const declaredReviews = [value.review_status, value.body_you_review_status, value.body_they_review_status,
      row.source_snapshot?.review_status];
    if (declaredReviews.some(review => typeof review === 'string' && !approvedReviews.has(review.trim().toLowerCase()))) return false;
    const declaredRoles = [value.content_role, row.source_snapshot?.content_role, row.facts?.content_role];
    if (declaredRoles.some(role => ['source_material', 'fallback_source'].includes(String(role ?? '').replaceAll('-', '_')))) return false;
    const { role, reviewStatus } = generatedRowPackageRole(row);
    if (!['full_copy', 'authored_card', 'fallback_hook', 'vocabulary', 'template'].includes(role)) return false;
    if (!isGovernedReaderEligible({ ...record, contentKey: row.content_key, content_role: role, review_status: reviewStatus })) return false;
    if ((record as Record<string, unknown>).render_policy === 'sky-placement-continuous-v2'
      || row.content_key.startsWith('fallback-hook/sky-sign-copy/')) {
      if ((row.source_snapshot?.distributionState ?? row.source_snapshot?.distribution_state ?? row.facts?.distributionState ?? row.facts?.distribution_state) !== 'serving') return false;
    }
    return true;
  }
  // This table contains shared writing only. User-generated reports stay behind
  // their existing authenticated report endpoint and never enter this route.
  return isReaderServableGeneratedContentRow(row) && isGeneratedContentReaderBoundaryAllowed(row);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.statusCode = 405; res.end(JSON.stringify({ error: 'Method not allowed.' })); return; }
  try {
    const query = await readQuery(req);
    const base = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL)?.replace(/\/$/u, '');
    const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!base || !secret) throw new Error('Reader storage is unavailable.');
    const signal = AbortSignal.timeout(8000);
    const headers = { apikey: secret, Authorization: `Bearer ${secret}` };
    const get = async (table: string, params: URLSearchParams): Promise<unknown[]> => {
      const response = await fetch(`${base}/rest/v1/${table}?${params}`, { headers, signal });
      if (!response.ok) throw new Error('Reader storage request failed.');
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error('Invalid reader storage response.');
      return data;
    };
    const params = new URLSearchParams({ select, status: 'eq.LIVE', lane: 'eq.serving', review_state: 'is.null', order: 'id.asc', limit: String(pageSize) });
    if (query.provider) params.set('provider', `eq.${query.provider}`);
    if (query.horoscope) {
      params.set('content_key', `like.horoscope/${query.horoscope.period}/*`);
      params.set('sections->horoscopeEdition->window->>startsAt', `lte.${query.horoscope.at}`);
      params.set('sections->horoscopeEdition->window->>endsAt', `gt.${query.horoscope.at}`);
    }
    if (query.prefix) params.set('content_key', `like.${query.prefix}*`);
    if (query.keys) params.set('content_key', `in.(${query.keys.map(item => `"${item}"`).join(',')})`);
    if (query.ids) params.set('id', `in.(${query.ids.join(',')})`);
    if (query.surfaces) params.set('surface', `in.(${query.surfaces.join(',')})`);
    if (query.afterId) params.append('id', `gt.${query.afterId}`);
    if (query.targetDate) params.set('or', `(target_date.is.null,target_date.eq.${query.targetDate})`);
    if (query.scope) params.append('or', `(${query.scope === 'sky' ? skyDashboardScopeFilter : skyListDashboardScopeFilter})`);
    if (query.vocabularyOnly) params.append('or', '(content_key.like.fallback-vocab/%,content_key.like.cc/planet/%,content_key.like.cc/sign/%)');
    if (query.latestVersion) { params.set('select', 'updated_at'); params.set('order', 'updated_at.desc'); params.set('limit', '1'); }
    const raw = await get('generated_interpretations', params);
    if (query.latestVersion) { res.end(JSON.stringify({ schema: READER_ROW_SCHEMA, rows: raw.map(row => ({ updated_at: (row as { updated_at: string }).updated_at })), nextCursor: null })); return; }
    const rows = raw as GeneratedContentRow[];
    const keys = [...new Set([publicationLedgerKey, ...rows.map(row => row.content_key)])];
    const ledger = await get('content_publications', new URLSearchParams({ select: 'content_key,state,revision,row_id,row_updated_at,updated_at', content_key: `in.(${keys.map(item => `"${item.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`).join(',')})`, limit: String(pageSize + 1) }));
    if (!ledger.every(validContentPublication)) throw new Error('Invalid publication state.');
    const publications = new Map((ledger as ContentPublication[]).map(item => [item.content_key, item]));
    // A missing ledger is a configuration error, never permission to serve old writing.
    if (!publications.has(publicationLedgerKey)) throw new Error('Publication state is unavailable.');
    const admitted = rows.filter(row => readerRowIsEligible(row)
      && publicationAllowsContent(row.content_key, row.id, row.updated_at, row.target_date, publications));
    res.end(JSON.stringify({ schema: READER_ROW_SCHEMA, rows: admitted.map(projectReaderRow).filter(Boolean), publications: ledger,
      nextCursor: rows.length === pageSize ? rows.at(-1)!.id : null }));
  } catch (error) {
    res.statusCode = error instanceof QueryError ? 400 : error instanceof AdminHttpError && [400, 413].includes(error.statusCode) ? error.statusCode : 503;
    res.end(JSON.stringify({ error: error instanceof QueryError ? error.message : 'Published content is temporarily unavailable.' }));
  }
}
