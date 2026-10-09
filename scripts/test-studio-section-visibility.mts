import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createApiStore } from '../tests/helpers/calendar-review-api.mjs';
import { sectionFixtures } from '../tests/helpers/studio-section-fixtures.mjs';
import { studioListingFacts, studioListingRow } from '../api/_lib/studio-listing-facts.ts';
import { studioInventoryQuery, studioInventoryRequestPath, studioInventoryPasses } from '../apps/admin/src/studioSectionInventory.ts';
import { calendarPlanetaryListIdentity, calendarPlanetaryIdentity, calendarPlanetaryTitle } from '../apps/admin/src/calendarPlanetarySources.ts';
import { isCompositionTemplateRow } from '../apps/admin/src/compositionTemplateClassifier.ts';
import { isSkyWriteupContentRow } from '../apps/admin/src/articleWorkspace.ts';
import { calendarTransitionPhraseKeys } from '../apps/web/src/features/calendar/calendarTransitionPhraseIdentity.ts';
import { isStudioCompatibilityRow, isStudioCompositeRow } from '../apps/admin/src/studioContentScope.ts';

const extra = Array.from({length:83}, (_,i) => ({...sectionFixtures[0], id:`20000000-0000-4000-8000-${String(i).padStart(12,'0')}`, content_key:`compatibility.fixture.${i}`}));
const fixtures = [...sectionFixtures, ...extra];
const original = JSON.stringify(fixtures);
const store = await createApiStore(fixtures);
try {
  for (const endpoint of ['generated-content-inventory', 'generated-content']) {
    for (const [scope, predicate] of [['compatibility', isStudioCompatibilityRow], ['composite', isStudioCompositeRow]] as const) {
      const result: any[] = [];
      let cursor: string | null = null;
      const seen = new Set<string>();
      do {
        const params = new URLSearchParams({scope, status:'all', visibility:'all', view:'inventory', limit:'2'});
        if (cursor) params.set('cursor', cursor);
        const response = await store.invoke('GET', undefined, `/api/admin/${endpoint}?${params}`);
        assert.equal(response.status, 200, JSON.stringify(response.payload));
        result.push(...response.payload.rows);
        cursor = response.payload.nextCursor;
        if (cursor) { assert.ok(!seen.has(cursor), 'Cursor must advance'); seen.add(cursor); }
      } while (cursor);
      assert.deepEqual(result.map(row=>row.id).sort(), fixtures.filter(predicate).map(row=>row.id).sort(), `${endpoint} ${scope} must return all members exactly once`);
      const denied = await store.invoke('GET', undefined, `/api/admin/${endpoint}?scope=${scope}`, 'invalid');
      assert.equal(denied.status, 401);
    }
  }
  for (const endpoint of ['generated-content-inventory', 'generated-content']) {
    for (const [route, expected] of [
      [{page:'skyWriteups'}, ['custom/sky-article']],
      [{page:'templates'}, ['custom/template-role', 'custom/template-block', 'custom/package-template', 'custom/lunar-source']],
      [{page:'vocabulary'}, ['custom/vocabulary-role']],
      [{page:'knowledge'}, ['custom/fallback-prompt']],
      [{page:'slotDictionary'}, ['custom/template-role', 'custom/vocabulary-role']]
    ] as const) {
      const query = studioInventoryQuery(route);
      const passes = studioInventoryPasses(query);
      assert.ok(passes.at(-1)?.scope.endsWith('-types'));
      const found: any[] = [];
      for (const pass of passes) {
        let cursor: string | null = null;
        const seen = new Set<string>();
        do {
          const path = studioInventoryRequestPath(pass, 2, cursor).replace('generated-content-inventory', endpoint);
          const result = await store.invoke('GET', undefined, path);
          assert.equal(result.status, 200, JSON.stringify(result.payload));
          found.push(...result.payload.rows);
          cursor = result.payload.nextCursor;
          if(cursor) {assert.ok(!seen.has(cursor));seen.add(cursor);}
        } while(cursor);
      }
      for (const key of expected) assert.equal(found.filter(row=>row.content_key===key).length, 1, `${endpoint} ${route.page}: ${key}`);
      const supplemental = await store.invoke('GET', undefined, studioInventoryRequestPath(passes.at(-1)!,80).replace('generated-content-inventory',endpoint));
      assert.ok(supplemental.payload.rows.every(row=>!query.prefixes.some(prefix=>row.content_key.startsWith(prefix))), 'Metadata pass excludes already fetched key families');
      assert.ok(!supplemental.payload.rows.some(row=>row.content_key==='unrelated/fixture'));
      const denied = await store.invoke('GET', undefined, studioInventoryRequestPath(passes.at(-1)!,80).replace('generated-content-inventory',endpoint),'invalid');
      assert.equal(denied.status,401);
    }
  }
  for (const key of calendarTransitionPhraseKeys) {
    for (const route of [{page:'templates'}, {page:'calendarWriteups'}, {page:'calendarWriteups', calendarWriteupWorkspaceView:'moon-transition-phrases'}]) {
      assert.ok(studioInventoryQuery(route).prefixes.some(prefix=>key.startsWith(prefix)), `Timing phrase coverage: ${key}`);
    }
  }
  const query = studioInventoryQuery({page:'calendarWriteups', calendarWriteupWorkspaceView:'planetary-stations'});
  const stationRows: any[] = [];
  for (const prefix of query.prefixes) {
    const result = await store.invoke('GET', undefined, studioInventoryRequestPath({...query, prefixes:[prefix]}, 80));
    assert.equal(result.status, 200);
    stationRows.push(...result.payload.rows);
  }
  for (const key of fixtures.map(row=>row.content_key).filter(key=>calendarPlanetaryListIdentity(key))) {
    assert.ok(stationRows.some(row=>row.content_key===key), key);
    const detail = await store.invoke('GET', undefined, `/api/admin/generated-content-inventory?contentKey=${encodeURIComponent(key)}`);
    assert.equal(detail.payload.rows[0].body, fixtures.find(row=>row.content_key===key)?.body);
  }
  const stationSource = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/source-rows/station-cards-week-openers-v1.json','utf8')).filter(row=>row.contentKey.startsWith('authored/station/'));
  assert.equal(stationSource.length, 18);
  for (const row of stationSource) {
    assert.ok(query.prefixes.some(prefix=>row.contentKey.startsWith(prefix)));
    assert.ok(calendarPlanetaryListIdentity(row.contentKey));
  }
  const passage = calendarPlanetaryListIdentity('sky.retrograde.venus.scorpio.retrograde_passage');
  assert.equal(calendarPlanetaryTitle(passage!), 'Venus retrograde in Scorpio');
  assert.equal(calendarPlanetaryIdentity('sky.retrograde.venus.scorpio.retrograde_passage'), null, 'Browse membership must not change Calendar serving identity');
  assert.equal(calendarPlanetaryIdentity('authored/station/venus/rx'), null);
  for (const key of ['sky/station/venus/retrograde/scorpio','authored/sky-placement/venus/scorpio']) {
    assert.ok(studioInventoryQuery({page:'skyWriteups'}).prefixes.some(prefix=>key.startsWith(prefix)));
    assert.ok(isSkyWriteupContentRow({content_key:key}));
  }
  for (const section of ['sky','you','friends']) {
    const query = studioInventoryQuery({page:'knowledge',fallbackSectionFilter:section});
    assert.ok(query.prefixes.some(prefix=>'fallback-hook/custom-ingredient'.startsWith(prefix)));
  }
  const slots = studioInventoryQuery({page:'slotDictionary'});
  for (const key of ['vocab/planet/fixture','fallback-vocab/fixture','fallback-hook/custom-ingredient','fallback-template/fixture','slot-template/fixture']) {
    assert.ok(slots.prefixes.some(prefix=>key.startsWith(prefix)), key);
  }
  const bundled = JSON.parse(readFileSync('apps/web/src/content/fallbackArchitectureV3/bundled-initial-reader-rows-v3.json','utf8'));
  const templateQuery = studioInventoryQuery({page:'templates'});
  for (const source of Object.values(bundled).flat() as any[]) {
    const row = {...source, content_key:source.contentKey, source_snapshot:source, sections:{packageRecord:source}};
    if (isCompositionTemplateRow(row)) {
      assert.ok(templateQuery.prefixes.some(prefix=>row.content_key.startsWith(prefix)), row.content_key);
      const compact = studioListingRow(row, studioListingFacts(row));
      assert.ok(isCompositionTemplateRow(compact as any), `Compact list must preserve template role: ${row.content_key}`);
    }
  }
  assert.equal(JSON.stringify([...store.rows.values()]), original, 'Browsing must preserve bodies and publication state');
} finally { store.close(); }
console.log('Studio section visibility: both real handlers, pagination, exact details, station source coverage, and read-only integrity passed.');
