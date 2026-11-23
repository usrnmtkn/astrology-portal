import type { IncomingMessage, ServerResponse } from 'node:http';
import { requireContentAdmin } from '../_lib/admin-auth.js';
import { sendAdminJson, sendAdminMethodNotAllowed } from '../_lib/admin-http.js';
import { withApprovedSynastryVoice, synastryVoicePromptReferences } from '../_lib/synastry-approved-voice.cjs';
import { withSynastryKnowledgeSources } from '../_lib/synastry-knowledge-sources.cjs';
import { loadExplicitWritingFeedback } from '../_lib/studio-explicit-writing-feedback.js';
import { SYNASTRY_EDITORIAL_VERSION } from '../../src/astro-writing/synastryEditorialAuthority.cjs';
import { prepareSynastrySourceInput } from '../../src/astro-writing/synastrySourceContext.cjs';

// Fixed repaired source coverage only. This endpoint cannot accept a passage,
// file path or provider request, and returns no source text or private receipts.
const contacts = [
  ['mercury', 'mars', 'hard'], ['mars', 'mercury', 'hard'],
  ...['hard', 'soft'].flatMap(aspect => [
    ['mars', 'saturn', aspect], ['saturn', 'mars', aspect],
    ['venus', 'jupiter', aspect], ['jupiter', 'venus', aspect]
  ])
];

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Vary', 'Authorization, x-content-admin-session, x-content-generation-secret');
  if (req.method !== 'GET') { sendAdminMethodNotAllowed(res, ['GET']); return; }
  const credential = ['authorization', 'x-content-admin-session', 'x-content-generation-secret']
    .some(name => Boolean(String(req.headers[name] ?? '').trim()));
  const configuredAuth = process.env.CONTENT_GENERATION_SECRET?.trim()
    || String(req.headers['x-content-admin-session'] ?? '').trim();
  if (!credential || !configuredAuth) { sendAdminJson(res, 401, { ok: false, error: 'Unauthorized.' }); return; }
  if (!await requireContentAdmin(req, res)) return;
  try {
    let knowledgeSourceCount = 0;
    let voice: ReturnType<typeof synastryVoicePromptReferences> | undefined;
    for (const [planetA, planetB, aspect] of contacts) {
      const input = withApprovedSynastryVoice(withSynastryKnowledgeSources({
        contentKey: `fallback-hook/synastry-pair/${planetA}/${planetB}/${aspect}`,
        surface: 'synastry', eventType: 'synastry-aspect', mode: 'in_depth',
        facts: { planetA, planetB, aspect, personA: '{{holder2}}', personB: 'you', readerPerson: 'B' }
      }));
      prepareSynastrySourceInput(input);
      knowledgeSourceCount += input.sourceSnapshot.knowledgeSources.length;
      voice ??= synastryVoicePromptReferences(input.sourceSnapshot);
    }
    const feedback = await loadExplicitWritingFeedback({ surface: 'synastry', eventType: 'synastry-aspect' });
    if (!voice || voice.primaryNatalStyleBenchmarks.length !== 4 || voice.supportingSynastryExamples.length !== 28
      || knowledgeSourceCount !== 20 || feedback.receipt.enabled !== true || !process.env.OPENAI_API_KEY?.trim()) {
      throw new Error('Writer prerequisites unavailable');
    }
    sendAdminJson(res, 200, { ok: true, status: 'ready', editorialVersion: SYNASTRY_EDITORIAL_VERSION,
      revision: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      primaryStyleReferenceCount: 4, supportingReferenceCount: 28, detailedKnowledgeSourceCount: 20,
      currentFeedback: 'verified', providerConfigured: true, generationPerformed: false });
  } catch {
    sendAdminJson(res, 503, { ok: false, status: 'held', error: 'Synastry writer prerequisites could not be verified. No generation was started.' });
  }
}
