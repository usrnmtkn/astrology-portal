import assert from 'node:assert/strict';
process.env.CONTENT_GENERATION_SECRET = 'sky-period-isolated-api-fixture';
const { default: handler } = await import('../api/admin/sky-article-facts');
async function invoke(query: Record<string, string>, authorized = true) {
  const response = { statusCode: 0, payload: {} as any, setHeader() {}, end(body: string) { this.payload = JSON.parse(body); } };
  await handler({ method: 'GET', url: `/api/admin/sky-article-facts?${new URLSearchParams(query)}`,
    headers: authorized ? { 'x-content-generation-secret': process.env.CONTENT_GENERATION_SECRET } : {} } as any, response as any);
  return response;
}
assert.equal((await invoke({ planet: 'mercury', period: 'today' })).statusCode, 400);
assert.equal((await invoke({ planet: 'mercury', period: 'current', date: '2026-02-30' })).statusCode, 400);
assert.equal((await invoke({ planet: 'mercury', period: 'current', date: '2026-10-31' }, false)).statusCode, 401);
for (const date of ['2026-10-25', '2026-10-31', '2026-11-10']) {
  // The existing saved-template format omits external NASA evidence. This still
  // executes the real handler, Swiss calculation and current-period adapter.
  const response = await invoke({ planet: 'mercury', date, period: 'current' });
  assert.equal(response.statusCode, 200, JSON.stringify(response.payload));
  const facts = response.payload.facts;
  assert.equal(facts.sign, 'scorpio'); assert.equal(facts.motion, 'retrograde');
  assert.equal(facts.validFrom, '2026-10-24'); assert.equal(facts.validTo, '2026-11-13');
  assert.equal(facts.transitStartInstant, '2026-10-24T07:12:42.999Z');
  assert.equal(facts.transitEndInstant, '2026-11-13T15:53:52.999Z');
}
console.log('Article-period actual API: authenticated Swiss dates across three reference dates; invalid coverage/date and anonymous requests refused.');
