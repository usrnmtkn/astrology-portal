import { calculateSkyArticleEditionFacts } from '../../api/_lib/sky-article-facts.ts';
import { buildSkyIngressWritingContext, buildIngressTemplateReference } from '../../api/_lib/sky-ingress-writing.ts';
import { loadSkySeasonMeaning } from '../../api/_lib/sky-season-meaning.ts';

/** Complete real calculation/source inputs with all HTTP intercepted. No prose. */
export async function ingressWriterFixture() {
  const fetch = globalThis.fetch;
  const previous = { SUPABASE_URL: process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY };
  Object.assign(process.env, { SUPABASE_URL: 'https://ingress-fixture.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic' });
  globalThis.fetch = async target => {
    const url = new URL(String(target));
    if (url.origin === 'https://ingress-fixture.invalid') return Response.json([]);
    if (['science.nasa.gov', 'ssd.jpl.nasa.gov'].includes(url.hostname)) return new Response('Synthetic independent check outage.', { status: 503 });
    throw new Error('Unexpected network destination while preparing ingress fixtures.');
  };
  try {
    const facts = await calculateSkyArticleEditionFacts(new Date('2026-10-21T12:00:00Z'), 'sun', 'ingress-essay-v3');
    return { facts, ingressWriting: buildSkyIngressWritingContext(facts), seasonMeaning: await loadSkySeasonMeaning('sun', 'libra'),
      ingressTemplateReference: buildIngressTemplateReference('sky/article-template/sun/libra', 'Synthetic complete saved guide reference.') };
  } finally {
    globalThis.fetch = fetch;
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
}
