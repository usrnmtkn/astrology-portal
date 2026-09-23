import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import handler from '../../api/content-reader';
import { fixturePublications } from './content-reader-route.mjs';

export const privateCanary = 'PRIVATE_EDUCATION_IMPORT_DRAFT';
export const lessonRows = Array.from({ length: 10 }, (_, index) => {
  const kind = index === 9 ? 'house' : 'chapter';
  const slug = kind === 'house' ? '/learn/houses/11' : `/learn/astro-101/qa-chapter-${index + 1}`;
  const content_key = `education/astro-101/${kind}/${kind === 'house' ? '11' : `qa-chapter-${index + 1}`}`;
  return {
    id: `aaaaaaaa-aaaa-aaaa-aaaa-${String(index + 1).padStart(12, '0')}`,
    content_key, surface: 'education', mode: 'all', status: 'LIVE', lane: 'serving', review_state: null,
    target_date: null, updated_at: '2026-09-19T17:04:51.356470+00:00', provider: 'claude',
    headline: kind === 'house' ? 'QA eleventh house' : `QA chapter ${index + 1}`, summary: '',
    body: `QA complete body ${index + 1}.`, flags: [], source_snapshot: {},
    facts: { slug, related: [{ label: 'QA chapter 1', content_key: 'education/astro-101/chapter/qa-chapter-1', slug: '/learn/astro-101/qa-chapter-1' }] },
    sections: { kind, intro: `QA opening ${index + 1}.`,
      blocks: [{ heading: 'QA section', level: 2, body: `QA final sentence ${index + 1}.` },
        { heading: 'QA list', level: 2, list: [{ ordered: false, items: ['QA list item.'] }] }],
      // This is the original import descriptor, not the published article.
      packageRecord: { contentKey: content_key, content_role: 'education_article', review_status: 'needs_review', body: privateCanary },
      packageDraft: { body: privateCanary }, internalNotes: privateCanary }
  };
});

/** Invoke the real reader handler; only its database transport is isolated. */
export async function educationReaderResponse(query: unknown, rows: any[] = lessonRows,
  publications = fixturePublications(rows), fail = false) {
  const previousFetch = globalThis.fetch;
  const previousURL = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = 'https://education-reader.invalid';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'education-fixture-only';
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    assert.equal(url.origin, 'https://education-reader.invalid');
    if (fail) return new Response('fixture storage unavailable', { status: 503 });
    if (url.pathname.endsWith('/content_publications')) return Response.json(publications);
    assert.equal(url.pathname, '/rest/v1/generated_interpretations');
    assert.equal(url.searchParams.get('content_key'), 'like.education/astro-101/*');
    assert.equal(url.searchParams.get('surface'), 'in.(education)');
    return Response.json(rows);
  };
  try {
    const req: any = Readable.from([JSON.stringify(query)]);
    Object.assign(req, { method: 'POST', headers: {} });
    let body = '';
    const res: any = { statusCode: 200, setHeader() {}, end(value: string) { body = value; } };
    await handler(req, res);
    return new Response(body, { status: res.statusCode, headers: { 'Content-Type': 'application/json' } });
  } finally {
    globalThis.fetch = previousFetch;
    if (previousURL === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousURL;
    if (previousKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousKey;
  }
}
