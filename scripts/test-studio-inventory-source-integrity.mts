import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import test from 'node:test';

const env = { NODE_ENV: 'test', CONTENT_GENERATION_SECRET: 'inventory-audit-fixture', SUPABASE_URL: 'https://inventory-audit.invalid', SUPABASE_SERVICE_ROLE_KEY: 'fixture' };
Object.assign(process.env, env);
const { default: handler } = await import('../api/admin/generated-content-inventory.ts');
const { calendarMoonIngressPackageRecords: records } = await import('../api/_lib/calendar-moon-ingress-sources.ts');
const { skyPlacementSourceRecords } = await import('../api/_lib/sky-placement-sources.ts');
const { servingPackageRecords } = await import('../api/_lib/serving-package-records.ts');
Object.assign(process.env, env);
const prefix = 'authored/calendar-moon-transition/';
const saved = records.slice(0, 2).map((record, index) => ({
  id: `00000000-0000-4000-8000-00000000000${index}`, content_key: record.contentKey,
  status: 'DRAFT', lane: 'reference', surface: 'sky', mode: 'in_depth',
  updated_at: `2026-10-0${5-index}T12:00:00.123456Z`, body: `Synthetic saved opening ${index}.\n\nComplete synthetic ending ${index}.`
}));
let storageRows: Array<Record<string, any>> = saved;
let requests: URL[] = [];
let failPresence = false;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  assert.equal(url.origin, env.SUPABASE_URL);
  assert.equal(url.pathname, '/rest/v1/generated_interpretations');
  assert.equal(init.method ?? 'GET', 'GET', 'Inventory browsing never writes.');
  requests.push(url);
  const p = url.searchParams;
  if (p.get('select') === 'content_key' && failPresence) return Response.json({ error: 'synthetic failure' }, { status: 503 });
  let rows = storageRows.filter(row => {
    for (const [field, value] of p) {
      if (['select', 'order', 'limit'].includes(field)) continue;
      if (field === 'or') {
        if (value === '(event_type.is.null,event_type.neq.studio-package-source-draft,status.neq.ARCHIVED)') {
          if (!(row.event_type == null || row.event_type !== 'studio-package-source-draft' || row.status !== 'ARCHIVED')) return false;
          continue;
        }
        if (value === '(event_type.is.null,event_type.neq.standalone-article-revision,status.neq.ARCHIVED)') {
          if (!(row.event_type == null || row.event_type !== 'standalone-article-revision' || row.status !== 'ARCHIVED')) return false;
          continue;
        }
        if (value === '(surface.eq.composite,content_key.like.*composite*,block_type.eq.composite_aspect)') {
          if (!(row.surface === 'composite' || row.content_key.includes('composite') || row.block_type === 'composite_aspect')) return false;
          continue;
        }
        const match = /^\(updated_at\.lt\.([^,]+),and\(updated_at\.eq\.[^,]+,id\.lt\.([^()]+)\)\)$/.exec(value);
        assert.ok(match, `Unexpected cursor predicate: ${value}`);
        if (!(row.updated_at < match[1] || row.updated_at === match[1] && row.id < match[2])) return false;
      } else if (field === 'and') {
        const match = /^\(content_key\.gte\."([^"]+)",content_key\.lt\."([^"]+)"\)$/.exec(value);
        assert.ok(match);
        if (!(row.content_key >= match[1] && row.content_key < match[2])) return false;
      } else if (value.startsWith('eq.')) { if (row[field] !== value.slice(3)) return false; }
      else if (value.startsWith('neq.')) { if (row[field] === value.slice(4)) return false; }
      else if (value.startsWith('lte.')) { if (row[field] > value.slice(4)) return false; }
      else if (value.startsWith('gt.')) { if (row[field] <= value.slice(3)) return false; }
      else if (field === 'content_key' && value.startsWith('in.(')) {
        if (!value.slice(4,-1).split(',').map(x => x.replaceAll('"','')).includes(row.content_key)) return false;
      } else throw new Error(`Unmodeled storage predicate ${field}=${value}`);
    }
    return true;
  });
  rows = [...rows].sort((a,b) => b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id)).slice(0, Number(p.get('limit') ?? 1000));
  return Response.json(p.get('select') === 'content_key' ? rows.map(row => ({ content_key: row.content_key })) : rows);
};
async function invoke(params: Record<string,string>) {
  const req = Object.assign(Readable.from([]), { method: 'GET', url: `/api/admin/generated-content-inventory?${new URLSearchParams(params)}`, headers: { authorization: `Bearer ${env.CONTENT_GENERATION_SECRET}` } });
  const res = { statusCode: 0, headers: {}, payload: undefined as any, setHeader(k,v) { this.headers[k] = v; }, end(raw) { this.payload = JSON.parse(raw); } };
  await handler(req, res as any);
  assert.equal(res.headers['cache-control'], 'no-store');
  return res;
}

test('generic source lookup inherits omitted writing across package content types without writing storage', async () => {
  for (const key of ['authored/transit-aspect/sun/north-node/conjunction', 'fallback-hook/synastry-pair/sun/moon/soft',
    'fallback-template/natal.angle-in-sign', records[0].contentKey, 'sky-lilith/article/capricorn']) {
    const baseline = servingPackageRecords.get(key)!;
    const original = { contentKey: key, content_role: baseline.content_role,
      review_status: 'needs_review', serving_enabled: false, owner_approved: false };
    const row = { ...saved[0], content_key: key, sections: { packageRecord: original,
      packageOriginalRecord: original, dashboardEditHistory: [{ versionId: 'exact-original' }] } };
    storageRows = [row]; const unchanged = structuredClone(row);
    const result = (await invoke({ contentKey: key })).payload.rows[0];
    for (const field of ['body', 'body_you', 'body_they', 'LilithArticle']) if (typeof baseline[field] === 'string') {
      assert.equal(result.sections.packageRecord[field], baseline[field], `${key}#${field}`);
    }
    assert.equal(result.sections.packageRecord.owner_approved, false);
    assert.equal(result.sections.packageRecord.serving_enabled, false);
    assert.equal(result.sections.packageRecord.review_status, 'needs_review');
    assert.equal(result.sections.packageRecord.approval, undefined);
    assert.equal(result.sections.packageRecord.protected_content, undefined);
    assert.deepEqual(result.sections.packageOriginalRecord, original);
    assert.equal(result.updated_at, row.updated_at);
    assert.deepEqual(storageRows, [unchanged]);
  }
});

test('generic inheritance preserves saved edits, explicit blanks, nulls, arrays and nested clears', async () => {
  const key = 'fallback-hook/sky-sign-copy/saturn/capricorn';
  const baseline = servingPackageRecords.get(key)!;
  for (const clear of ['', null, [], {}, false, 0]) {
    const original = { contentKey: key, opening: 'Synthetic complete saved opening. Exact final sentence.',
      tension: clear, era_layer: { frame: clear }, try_this: [], studio_editable_fields: [] };
    const draft = { development: '', close: 'Synthetic pending final sentence.' };
    const row = { ...saved[0], content_key: key, sections: { packageRecord: original, packageDraft: draft } };
    storageRows = [row];
    const result = (await invoke({ id: row.id })).payload.rows[0];
    assert.equal(result.sections.packageRecord.opening, original.opening);
    assert.deepEqual(result.sections.packageRecord.tension, clear);
    assert.deepEqual(result.sections.packageRecord.era_layer, { ...baseline.era_layer, frame: clear });
    assert.deepEqual(result.sections.packageRecord.try_this, []);
    assert.deepEqual(result.sections.packageRecord.studio_editable_fields, []);
    assert.deepEqual(result.sections.packageDraft, draft);
    assert.equal(result.sections.packageRecord.close, baseline.close);
    assert.equal(result.sections.packageRecord.owner_approved, undefined, 'Missing metadata cannot grant approval.');
    assert.equal(result.sections.packageRecord.serving_enabled, undefined);
    for (const overrides of [{ status: 'ARCHIVED' }, { sections: { packageRecord: { ...original, review_status: 'deprecated' } } },
      { sections: { packageRecord: { ...original, contentKey: 'mismatched/source' } } }]) {
      storageRows = [{ ...row, ...overrides }];
      assert.deepEqual((await invoke({ id: row.id })).payload.rows[0].sections, storageRows[0].sections);
    }
    storageRows = [{ ...row, sections: { packageRecord: { ...original, era_layer: clear } } }];
    assert.deepEqual((await invoke({ id: row.id })).payload.rows[0].sections.packageRecord.era_layer, clear);
  }
  const retired = 'fallback-hook/transit-house-event-frame/aries';
  const unknown = 'cms/synthetic/no-installed-source';
  servingPackageRecords.set(retired, { contentKey: retired, body: 'Synthetic retired package writing.' });
  try { for (const content_key of [retired, unknown]) {
    const row = { ...saved[0], content_key, sections: { packageRecord: { contentKey: content_key, body: '' } } };
    storageRows = [row];
    assert.deepEqual((await invoke({ id: row.id })).payload.rows[0].sections, row.sections);
  } } finally { servingPackageRecords.delete(retired); }
});

test('saved shared-copy aliases and pending edits cannot be shadowed by inherited audience copy', async () => {
  const key = 'fallback-hook/planet-best/sun';
  for (const alias of ['body', 'body_you', 'Body', 'text']) for (const copy of ['Complete synthetic saved alias.', '', null]) {
    for (const pending of [false, true]) {
      const original = { contentKey: key, ...(pending ? {} : { [alias]: copy }) };
      const draft = pending ? { [alias]: copy } : undefined;
      const row = { ...saved[0], content_key: key, sections: { packageRecord: original, ...(draft ? { packageDraft: draft } : {}) } };
      const unchanged = structuredClone(row);
      storageRows = [row];
      const result = (await invoke({ id: row.id })).payload.rows[0].sections;
      for (const inherited of ['body', 'body_you', 'Body', 'text']) {
        if (inherited !== alias) assert.equal(result.packageRecord[inherited], undefined);
      }
      assert.equal(result.packageRecord.body_they, servingPackageRecords.get(key)!.body_they, 'Independent Friend copy still inherits.');
      assert.deepEqual(result.packageDraft, draft);
      if (!pending) assert.equal(result.packageRecord[alias], copy);
      assert.deepEqual(storageRows, [unchanged]);
    }
  }
});

test('editing primary copy preserves independently inherited Friend copy and explicit Friend clears', async () => {
  const key = 'cms/synthetic/independent-audiences';
  servingPackageRecords.set(key, { contentKey: key, body: 'Synthetic package primary.', body_you: 'Synthetic package You.', body_they: 'Synthetic package Friend.' });
  try { for (const clear of [undefined, '', null]) {
    const original = { contentKey: key, body: 'Exact synthetic saved primary.', ...(clear === undefined ? {} : { body_they: clear }) };
    const row = { ...saved[0], content_key: key, sections: { packageRecord: original } };
    storageRows = [row];
    const document = (await invoke({ id: row.id })).payload.rows[0];
    assert.equal(document.sections.packageRecord.body, original.body);
    assert.equal(document.sections.packageRecord.body_you, undefined, 'Inherited alias cannot hide the saved primary.');
    assert.equal(document.sections.packageRecord.body_they, clear === undefined ? 'Synthetic package Friend.' : clear);
    assert.deepEqual(storageRows, [row]);
  } } finally { servingPackageRecords.delete(key); }
});

test('registered future reader fields inherit without importing source approval or integrity metadata', async () => {
  const key = 'cms/synthetic/registered-package';
  servingPackageRecords.set(key, { contentKey: key, customReading: { opening: 'Synthetic original opening.', ending: 'Synthetic original ending.', internalApproval: 'Do not inherit unregistered siblings.' },
    studio_editable_fields: [{ path: 'customReading.opening' }, { path: 'customReading.ending' }, { path: 'owner_approved' }],
    owner_approved: true, serving_enabled: true, review_status: 'approved', studio_version_status: 'approved-serving-baseline',
    protected_content: { body_sha256: 'synthetic-not-an-approval' }, source_baseline_sha256: 'synthetic-integrity-metadata' });
  try {
    const row = { ...saved[0], content_key: key, sections: { packageRecord: { customReading: { opening: '' } } } };
    storageRows = [row];
    const result = (await invoke({ id: row.id })).payload.rows[0].sections.packageRecord;
    assert.equal(result.customReading.opening, '');
    assert.equal(result.customReading.ending, 'Synthetic original ending.');
    assert.equal(result.customReading.internalApproval, undefined);
    for (const field of ['owner_approved', 'serving_enabled', 'review_status', 'studio_version_status', 'protected_content', 'source_baseline_sha256']) {
      assert.equal(result[field], undefined, field);
    }
    assert.deepEqual(storageRows, [row]);
  } finally { servingPackageRecords.delete(key); }
});

test('all canonical placement documents retain approved evergreen writing behind sparse saved records', async () => {
  const sources = [...skyPlacementSourceRecords.values()].filter(source => source.studio_content_type === 'continuous-placement');
  assert.equal(sources.length, 120);
  for (const [index, source] of sources.entries()) {
    const original = { contentKey: source.contentKey, planet: source.planet, sign: source.sign,
      studio_content_type: 'continuous-placement', serving_enabled: false, owner_approved: false };
    const row = { ...saved[0], id: `placement-${index}`, content_key: source.contentKey,
      status: 'LIVE', body: '', sections: { packageRecord: original,
        packageOriginalRecord: original, dashboardEditHistory: [{ versionId: 'retained-history' }] } };
    storageRows = [row];
    const unchanged = structuredClone(row);
    for (const params of [{ contentKey: source.contentKey }, { id: row.id }]) {
      const response = await invoke(params);
      assert.equal(response.statusCode, 200);
      const document = response.payload.rows[0];
      assert.deepEqual(document.sections.packageRecord.fallback, source.fallback, source.contentKey);
      assert.deepEqual(document.sections.packageRecord.studio_editable_fields, source.studio_editable_fields.filter(field => field.path.startsWith('fallback.')));
      assert.equal(document.sections.packageRecord.serving_enabled, false);
      assert.equal(document.sections.packageRecord.owner_approved, false);
      assert.equal(document.sections.packageRecord.placementArticle, undefined, 'Fallback recovery does not install an article.');
      assert.deepEqual(document.sections.packageOriginalRecord, original);
      assert.deepEqual(document.sections.dashboardEditHistory, row.sections.dashboardEditHistory);
      assert.equal(document.updated_at, row.updated_at);
    }
    assert.deepEqual(storageRows, [unchanged], 'Reading never changes saved writing or history.');
  }
});

test('placement inheritance preserves explicit blanks, custom layouts, motion articles and pending edits', async () => {
  const baseline = skyPlacementSourceRecords.get('sky-placement/article/mercury/scorpio')!;
  for (const fallback of [{ hook: '' }, { hook: 'Synthetic saved opening.', sections: [] }, null]) {
    const source = { contentKey: baseline.contentKey, planet: baseline.planet, sign: baseline.sign,
      studio_content_type: 'continuous-placement', placementArticleDirect: 'Synthetic saved direct article.',
      placementArticleRetrograde: 'Synthetic saved retrograde article.', serving_enabled: true, fallback };
    const draft = { fallback: { lived: '' }, placementArticleDirect: 'Synthetic pending article.' };
    const row = { ...saved[0], content_key: baseline.contentKey, sections: { packageRecord: source, packageDraft: draft } };
    storageRows = [row];
    const document = (await invoke({ id: row.id })).payload.rows[0];
    assert.deepEqual(document.sections.packageRecord.fallback, fallback === null ? null : { ...baseline.fallback, ...fallback });
    assert.equal(document.sections.packageRecord.placementArticleDirect, source.placementArticleDirect);
    assert.equal(document.sections.packageRecord.placementArticleRetrograde, source.placementArticleRetrograde);
    assert.equal(document.sections.packageRecord.serving_enabled, true);
    assert.deepEqual(document.sections.packageDraft, draft);
    storageRows = [{ ...row, status: 'ARCHIVED' }];
    assert.deepEqual((await invoke({ id: row.id })).payload.rows[0].sections, row.sections, 'Archive detail remains exact saved history.');
    storageRows = [{ ...row, sections: { packageRecord: { ...source, contentKey: 'sky-placement/article/mars/scorpio' } } }];
    assert.deepEqual((await invoke({ id: row.id })).payload.rows[0].sections, storageRows[0].sections, 'Mismatched identity cannot inherit writing.');
  }
});

test('malformed and unsafe cursors fail as input errors before storage', async () => {
  for (const value of ['not-base64-json', ...[null, {}, {id:'x',updatedAt:'not-a-date'}, {id:'x),status.eq.LIVE',updatedAt:'2026-10-05T00:00:00Z'}].map(x => Buffer.from(JSON.stringify(x)).toString('base64url'))]) {
    requests = [];
    assert.equal((await invoke({ cursor: value })).statusCode, 400);
    assert.equal(requests.length, 0);
  }
});

test('all pages contain one source per ingress and preserve complete saved copy', async () => {
  for (const limit of [1, 2, 3, 80]) {
    storageRows = saved; requests = [];
    let cursor: string | null = null;
    const all: any[] = [];
    const seen = new Set<string>();
    do {
      const result = await invoke({ contentKeyPrefix: prefix, limit: String(limit), status: 'all', visibility: 'all', ...(cursor ? {cursor} : {}) });
      assert.equal(result.statusCode, 200);
      all.push(...result.payload.rows);
      cursor = result.payload.nextCursor;
      if (cursor) { assert.ok(!seen.has(cursor)); seen.add(cursor); }
    } while (cursor);
    assert.equal(all.length, 12, 'A later page must not resurrect bundled originals for earlier saved rows.');
    for (const row of saved) {
      const matching = all.filter(candidate => candidate.content_key === row.content_key);
      assert.equal(matching.length, 1);
      assert.equal(matching[0].id, row.id);
      const detail = await invoke({ contentKey: row.content_key, limit: '1' });
      assert.equal(detail.payload.rows[0].body, row.body);
    }
  }
});

test('filters do not leak draft starters or replace an archived saved source', async () => {
  storageRows = [{...saved[0], status:'ARCHIVED'}, {...saved[1], status:'LIVE', lane:'serving'}];
  for (const params of [{status:'LIVE'}, {visibility:'editorial'}, {surface:'natal'}, {mode:'card'}]) {
    const result = await invoke({contentKeyPrefix:prefix, ...params});
    assert.equal(result.statusCode, 200);
    assert.ok(result.payload.rows.every(row => !row.package_starter));
  }
  const result = await invoke({contentKey:saved[0].content_key, status:'DRAFT'});
  assert.deepEqual(result.payload.rows, [], 'A filtered-out saved row must not be presented as its original unsaved source.');
});

test('unconfirmed source absence cannot become a successful fallback inventory', async () => {
  storageRows = saved; failPresence = true;
  try {
    const cursor = Buffer.from(JSON.stringify({id:saved[1].id,updatedAt:saved[1].updated_at})).toString('base64url');
    const result = await invoke({contentKeyPrefix:prefix, cursor});
    assert.equal(result.statusCode, 502);
    assert.equal(result.payload.rows, undefined);
  } finally { failPresence = false; }
});

test('season lookups exclude archived revisions before limiting while preserving original articles and archive history', async () => {
  const target = { ...saved[0], content_key: 'article/manual/scorpio-season-2026', event_type: null, status: 'LIVE', lane: 'serving' };
  const revision = { ...target, id: 'revision', event_type: 'standalone-article-revision', status: 'DRAFT', lane: 'reference', updated_at: '2026-10-06T12:00:00Z' };
  const lookup = { contentKeys: target.content_key, limit: '1', excludeArchivedArticleRevisions: 'true' };
  storageRows = [target, revision];
  assert.deepEqual((await invoke(lookup)).payload.rows.map(row => row.id), ['revision'], 'Pending private changes remain editable.');
  storageRows = [target, { ...revision, status: 'ARCHIVED' }];
  assert.deepEqual((await invoke(lookup)).payload.rows.map(row => row.id), [target.id], 'The archived proposal cannot displace the live target.');
  assert.deepEqual((await invoke({ contentKeys: target.content_key, limit: '1' })).payload.rows.map(row => row.id), ['revision'], 'Unfiltered inventory still includes archive history.');
  assert.equal((await invoke({ id: revision.id, excludeArchivedArticleRevisions: 'true' })).payload.rows[0].id, revision.id, 'Explicit archive detail remains accessible.');
  for (const event_type of [null, 'manual-article']) for (const status of ['DRAFT', 'REVIEWED', 'ARCHIVED']) {
    storageRows = [{ ...target, status, event_type }, { ...revision, status: 'ARCHIVED' }];
    assert.equal((await invoke(lookup)).payload.rows[0].id, target.id, `Original ${status} articles are still discoverable, including NULL event types.`);
  }
});

test('revision exclusion composes with cursor, prefix and scope filters', async () => {
  const target = { ...saved[0], content_key: 'article/manual/scorpio-season-2026', event_type: null, surface: 'composite' };
  const newer = { ...target, id: 'newer', updated_at: '2026-10-07T12:00:00Z' };
  storageRows = [target, newer,
    { ...target, id: 'revision', event_type: 'standalone-article-revision', status: 'ARCHIVED', updated_at: '2026-10-06T12:00:00Z' },
    { ...target, id: 'unrelated', content_key: 'article/unrelated', surface: 'sky' }];
  const cursor = Buffer.from(JSON.stringify({ id: newer.id, updatedAt: newer.updated_at })).toString('base64url');
  const result = await invoke({ contentKeyPrefix: 'article/manual/', cursor, excludeArchivedArticleRevisions: 'true', limit: '1' });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.payload.rows.map(row => row.id), [target.id], 'Both the page boundary and prefix still constrain selection.');
  const scoped = await invoke({ scope: 'composite', cursor: target.id, excludeArchivedArticleRevisions: 'true' });
  assert.equal(scoped.statusCode, 200);
  assert.deepEqual(scoped.payload.rows.map(row => row.id), ['newer'], 'Scope and its id cursor survive the added exclusion.');
});

test('malformed revision exclusion fails before storage', async () => {
  for (const flag of ['excludeArchivedArticleRevisions', 'excludeArchivedPackageRevisions']) for (const value of ['false', '', 'TRUE', 'true,status.eq.LIVE']) {
    requests = [];
    assert.equal((await invoke({ [flag]: value })).statusCode, 400);
    assert.equal(requests.length, 0);
  }
});

test('source-card document reads skip archived private revisions but retain pending edits and original archives', async () => {
  const { readStudioContentDocument } = await import('../apps/admin/src/generatedContentClient.ts');
  const storageFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    if (String(input).startsWith('/api/admin/generated-content-inventory?')) {
      const result = await invoke(Object.fromEntries(new URL(String(input), 'https://studio.invalid').searchParams));
      return Response.json(result.payload, { status: result.statusCode });
    }
    return storageFetch(input, init);
  };
  try {
    for (const [content_key, event_type] of [
      ['fallback-hook/natal-you-placement-sign-final/uranus/scorpio', 'studio-package-source-draft'],
      ['cms/natal-planet-sect/you/jupiter/day', 'standalone-article-revision']
    ]) {
      const target = { ...saved[0], content_key, event_type: null, status: 'LIVE', lane: 'serving' };
      const revision = { ...target, id: 'private-revision', event_type, status: 'ARCHIVED', lane: 'reference', updated_at: '2026-10-06T12:00:00Z' };
      storageRows = [target, revision];
      assert.deepEqual((await readStudioContentDocument(content_key, env.CONTENT_GENERATION_SECRET)).rows.map(row => row.id), [target.id], 'Edit source must open its canonical saved row, not a newer archived private revision.');
      storageRows = [target, { ...revision, status: 'DRAFT' }];
      assert.deepEqual((await readStudioContentDocument(content_key, env.CONTENT_GENERATION_SECRET)).rows.map(row => row.id), [revision.id], 'An active private edit must still reopen.');
      storageRows = [{ ...target, status: 'ARCHIVED' }, revision];
      assert.deepEqual((await readStudioContentDocument(content_key, env.CONTENT_GENERATION_SECRET)).rows.map(row => row.id), [target.id], 'The original source archive remains available for restoration.');
      assert.equal((await invoke({ id: revision.id })).payload.rows[0].id, revision.id, 'An explicit archive-history selection remains accessible.');
    }
  } finally { globalThis.fetch = storageFetch; }
});
