import { SKY_INGRESS_ARTICLE_FORMAT, skyIngressTemplateForFormat } from '../../web/src/content/skyIngressEssay.mjs';
import { adminCredentialHeaders } from './adminSecret';
import { loadOwnerSessionAccessToken } from './ownerSession';

export const ingressPreviewModel = 'gpt-5.6-sol';
export class PreviewOwnerAccessError extends Error {}

type IngressFacts = { planet: string; sign: string; articleFormat: string; slotValues: Record<string, string> };
type Generation = {
  model: string;
  responseId?: string;
  providerCalls?: number;
  slotValues?: Record<string, string>;
  ingressValidation?: unknown;
  generationMetadata?: { evidencePacket?: { approvedVoiceStyle?: unknown } };
  generation_metadata?: { evidencePacket?: { approvedVoiceStyle?: unknown } };
};

export type UnsavedIngressPreview = {
  draft: string;
  warning: string;
  missingFields: string[];
  generation: Pick<Generation, 'model' | 'responseId' | 'providerCalls' | 'ingressValidation'> & { voiceBenchmark?: unknown };
};

export type IngressInputInspection = { writerContract: unknown; voiceBenchmark: unknown; correctionDelivery: unknown;
  providerCalls: number; saved: boolean; published: boolean; placement: { planet: string; sign: string; when: string } };

export function renderUnsavedIngress(facts: IngressFacts, slotValues: Record<string, string>) {
  const values: Record<string, string> = { priorOccurrenceSection: '', otherDatesSection: '', ...facts.slotValues, ...slotValues };
  const missingFields: string[] = [];
  const draft = skyIngressTemplateForFormat(facts.articleFormat).replace(/\{\{([A-Za-z][A-Za-z0-9]*)\}\}/gu, (_match, key: string) => {
    if (typeof values[key] !== 'string') { missingFields.push(key); return ''; }
    return values[key];
  }).replace(/\n{3,}/gu, '\n\n').trim();
  return { draft, missingFields };
}

// This path has no editor callbacks, content mutations, persistence, or request retries.
async function prepareIngressRequest(planet: string, referenceDate: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const credential = await loadOwnerSessionAccessToken(undefined, true);
  signal.throwIfAborted();
  if (!credential) throw new PreviewOwnerAccessError('Sign in with your Content Studio owner account before generating a preview.');
  const request = async (path: string, body?: unknown) => {
    signal.throwIfAborted();
    const response = await fetch(path, {
      method: body ? 'POST' : 'GET', cache: 'no-store', signal,
      headers: { 'content-type': 'application/json', ...adminCredentialHeaders(credential) },
      ...(body ? { body: JSON.stringify(body) } : {})
    });
    const payload = await response.json().catch(() => null);
    if (response.status === 401) throw new PreviewOwnerAccessError('Your owner sign-in could not be verified. Sign in again before starting a new preview.');
    if ((!response.ok || payload?.ok !== true) && !(response.status === 422 && payload?.rejectedGeneration)) {
      throw new Error(typeof payload?.error === 'string' ? payload.error : `Preview request failed (${response.status}). No automatic retry was sent.`);
    }
    return { status: response.status, payload };
  };
  const { payload: calculated } = await request(`/api/admin/sky-article-facts?${new URLSearchParams({ planet, date: referenceDate, format: SKY_INGRESS_ARTICLE_FORMAT })}`);
  const facts = calculated.facts as IngressFacts;
  if (facts?.planet !== planet || !facts.sign || facts.articleFormat !== SKY_INGRESS_ARTICLE_FORMAT) throw new Error('The calculated ingress could not be verified. No generation was sent.');
  for (const contentKey of [`sky/article-template/${facts.planet}/${facts.sign}`, `sky/article-template/${facts.planet}/ingress`]) {
    const { payload: inventory } = await request(`/api/admin/generated-content-inventory?${new URLSearchParams({ contentKey, status: 'all', visibility: 'all', limit: '2' })}`);
    const matches = Array.isArray(inventory.rows) ? inventory.rows.filter((row: any) => row.content_key === contentKey
      && typeof row.id === 'string' && row.event_type === 'sky-article-template' && ['REVIEWED', 'LIVE'].includes(row.status)
      && (row.lane ?? 'reference') === 'reference' && !row.review_state
      && ['approved', 'approved_reuse', 'reviewed'].includes(String(row.source_snapshot?.review_status ?? '').toLowerCase())) : [];
    if (matches.length === 1) return { request, facts, destination: { templateId: matches[0].id as string } };
  }
  if (planet === 'moon') return { request, facts, destination: { visit: { planet: facts.planet, sign: facts.sign } } };
  throw new Error('No approved ingress article template is available for this placement. No generation was sent.');
}

export async function inspectIngressInputs(planet: string, referenceDate: string, signal: AbortSignal): Promise<IngressInputInspection> {
  const {request,facts,destination} = await prepareIngressRequest(planet,referenceDate,signal);
  const params = new URLSearchParams({ inspect: 'ingress-voice' });
  if ('templateId' in destination && destination.templateId) params.set('templateId', destination.templateId);
  else { params.set('planet', facts.planet); params.set('sign', facts.sign); }
  const {payload} = await request(`/api/admin/sky-article-template-slots?${params}`);
  if (!payload.correctionDelivery || payload.providerCalls !== 0 || payload.saved !== false || payload.published !== false)
    throw new Error('The read-only writer input check could not be verified.');
  return {writerContract:payload.writerContract,voiceBenchmark:payload.voiceBenchmark,correctionDelivery:payload.correctionDelivery,
    providerCalls:0,saved:false,published:false,placement:{planet:facts.planet,sign:facts.sign,when:facts.slotValues.when}};
}

export async function generateUnsavedIngress(planet: string, referenceDate: string, signal: AbortSignal, articleScope: 'visit' | 'day' = 'visit'): Promise<UnsavedIngressPreview> {
  if (articleScope !== 'visit') throw new Error('New generation uses the full calculated visit. Existing day drafts remain editable in Content Studio.');
  const {request,facts,destination} = await prepareIngressRequest(planet,referenceDate,signal);
  const { status, payload } = await request('/api/admin/sky-article-template-slots', {
    ...destination, referenceDate, format: SKY_INGRESS_ARTICLE_FORMAT,
    provider: 'openai', expectedModel: ingressPreviewModel, existingSlotValues: {}, includeRetrogradeHistory: false
  });
  const generation = (payload.generation ?? payload.rejectedGeneration) as Generation | undefined;
  const slotValues = payload.slotValues ?? generation?.slotValues;
  if (!generation || !slotValues) throw new Error('The writer did not return a recoverable draft. No automatic retry was sent.');
  const metadata = generation.generationMetadata ?? generation.generation_metadata;
  return {
    ...renderUnsavedIngress(payload.facts ?? facts, slotValues),
    warning: status === 422 ? payload.error ?? 'The returned draft needs review.' : '',
    generation: { model: generation.model, responseId: generation.responseId, providerCalls: generation.providerCalls,
      ingressValidation: generation.ingressValidation, voiceBenchmark: metadata?.evidencePacket?.approvedVoiceStyle }
  };
}
