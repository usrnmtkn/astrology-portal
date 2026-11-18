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
for (const [planet, name, sign] of [['north-node', 'North Node', 'aquarius'], ['south-node', 'South Node', 'leo']]) {
  const instant = '2026-11-09T17:30:27.440Z';
  const response = await invoke({ planet, date: '2026-11-09', instant, timeZone: 'America/New_York', period: 'current', format: 'ingress-essay-v3' });
  assert.equal(response.statusCode, 200, JSON.stringify(response.payload));
  const facts = response.payload.facts;
  assert.equal(facts.planet, planet); assert.equal(facts.sign, sign);
  assert.equal(facts.generatedAt, instant); assert.equal(facts.articlePeriod, 'current');
  assert.equal(facts.periodLabel, 'Full sign visit');
  assert(Date.parse(facts.transitStartInstant) <= Date.parse(instant) && Date.parse(instant) < Date.parse(facts.transitEndInstant));
  assert(facts.events.length > 0, 'The node article must retain calculated events.');
  const participants = facts.events.flatMap((event: any) => event.participants).filter((point: any) => point.planet === name);
  assert(participants.length > 0, 'Calculated events must resolve the canonical node display name.');
  assert(participants.every((point: any) => Number.isFinite(point.longitude) && point.longitude >= 0 && point.longitude < 360));
}
console.log('Article-period actual API: authenticated Swiss dates across three reference dates; invalid coverage/date and anonymous requests refused.');
