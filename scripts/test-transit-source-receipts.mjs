import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { createTransitSynastryRenderer as shippedFactory } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
import * as nodeRenderer from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs';
import { isEligibleTransitReturn } from '../apps/web/src/content/fallbackArchitectureV3/resolver/transitReturns.mjs';

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'transit-receipts-'));
try {
  const bundle = path.join(temp, 'browser-source.mjs');
  await build({ entryPoints: ['apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts'], outfile: bundle, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { createTransitSynastryRenderer: sourceFactory } = await import(pathToFileURL(bundle));
  const base = 'apps/web/src/content/fallbackArchitectureV3/';
  const read = file => JSON.parse(fs.readFileSync(base + file, 'utf8'));
  const partitions = ['bundled-sky-core-rows-v3.json', 'bundled-initial-reader-rows-v3.json', 'bundled-deferred-core-rows-v3.json', 'bundled-shared-placement-rows-v3.json'].map(read);
  const authored = read('bundled-transit-core-authored-cards-v3.json');
  const rows = { hookRows: partitions.flatMap(p => p.hookRows ?? []), vocabularyRows: partitions.flatMap(p => p.vocabularyRows ?? []) };
  const templates = { templates: partitions[1].templates };
  const catalog = new Map([...authored.authoredCards, ...rows.hookRows, ...rows.vocabularyRows, ...templates.templates].map(row => [row.contentKey, row]));
  const shipped = shippedFactory(authored, templates, rows);
  const source = sourceFactory(authored, templates, rows);
  const planets = ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','pluto','chiron','north-node','south-node','lilith'];
  const points = [...planets,'ascendant','midheaven','descendant','imum-coeli'];
  const aspects = ['conjunction','opposition','square','trine','sextile'];
  const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
  const run = (renderer, facts) => isEligibleTransitReturn(facts.transiting, facts.natal, facts.aspect)
    ? renderer.renderTransitReturn({ planet: facts.transiting }) : renderer.renderTransitAspect(facts);
  const receipt = result => ({ body: result.body, paragraphs: result.paragraphSources, keys: result.sourceKeys, headlineSources: result.headlineSources });
  let rendered = 0, gaps = 0;
  for (const transiting of planets) for (const natal of points) for (const aspect of aspects) for (const sign of signs) for (const voice of ['you', 'Audit Friend']) {
    const facts = { transiting, natal, aspect, sign, voice };
    let actual;
    try { actual = run(shipped, facts); }
    catch (error) {
      assert.match(String(error), /SOURCE_GAP/);
      assert.throws(() => run(source, facts), /SOURCE_GAP/);
      assert.throws(() => run(nodeRenderer, facts), /SOURCE_GAP/);
      gaps++; continue;
    }
    assert.deepEqual(receipt(run(source, facts)), receipt(actual), JSON.stringify(facts));
    assert.deepEqual(receipt(run(nodeRenderer, facts)), receipt(actual), JSON.stringify(facts));
    assert.equal(actual.paragraphSources.map(p => p.text).join('\n\n'), actual.body);
    for (const paragraph of actual.paragraphSources) {
      assert.ok(paragraph.sources.length, JSON.stringify(facts));
      for (const ref of paragraph.sources) assert.equal(typeof catalog.get(ref.contentKey)?.[ref.field], 'string', JSON.stringify(ref));
    }
    assert.deepEqual(actual.sourceKeys, [...new Set(actual.paragraphSources.flatMap(p => p.sources.map(ref => ref.contentKey)))]);
    assert.ok(!actual.sourceKeys.includes('fallback-template/transit.aspect'), JSON.stringify(facts));
    rendered++;
  }
  assert.equal(rendered + gaps, 30240);
  assert.equal(rendered, 29184);
  assert.equal(gaps, 1056);

  // The reader supplies these inputs separately from sign/house geometry.
  for (const transiting of planets) for (const aspect of ['opposition','trine']) for (const variant of [1,2,3,4]) for (const pass of [1,2,3]) for (const voice of ['you','Audit Friend']) {
    const facts = { transiting, natal: 'moon', aspect, sign: 'capricorn', variant, pass, voice, isRetrograde: pass === 2, window: 'until October 4' };
    let actual;
    try { actual = shipped.renderTransitAspect(facts); }
    catch(error) { assert.match(String(error), /SOURCE_GAP/); assert.throws(()=>source.renderTransitAspect(facts), /SOURCE_GAP/); assert.throws(()=>nodeRenderer.renderTransitAspect(facts), /SOURCE_GAP/); continue; }
    assert.deepEqual(receipt(source.renderTransitAspect(facts)), receipt(actual));
    assert.deepEqual(receipt(nodeRenderer.renderTransitAspect(facts)), receipt(actual));
  }

  // Change real supporting rows in memory. Their paragraphs must change, and their receipts must identify the source.
  for (const key of [...rows.hookRows.filter(row => row.contentKey.startsWith('fallback-hook/fog-note/')).map(row => row.contentKey), 'authored/transit-aspect-insert/sun/midheaven/opposition']) {
    let exercised = false;
    for (const voice of ['you', 'Audit Friend']) for (const natal of ['sun','moon','mercury','venus','midheaven']) {
      const facts = { transiting: key.startsWith('authored/') ? 'sun' : 'neptune', natal, aspect: 'opposition', sign: 'capricorn', voice, variant: 2 };
      const before = shipped.renderTransitAspect(facts);
      if (!before.sourceKeys.includes(key)) continue;
      const replace = row => row.contentKey === key ? { ...row, body: 'Synthetic dependency receipt.', body_you: 'Synthetic dependency receipt.', body_they: 'Synthetic dependency receipt.' } : row;
      const changed = shippedFactory({ authoredCards: authored.authoredCards.map(replace) }, templates, { ...rows, hookRows: rows.hookRows.map(replace) }).renderTransitAspect(facts);
      assert.notEqual(changed.body, before.body);
      assert.ok(changed.paragraphSources.some(p => p.text === 'Synthetic dependency receipt.' && p.sources.some(ref => ref.contentKey === key)));
      for (const paragraph of before.paragraphSources.filter(p => !p.sources.some(ref => ref.contentKey === key))) assert.ok(changed.paragraphSources.some(p => p.text === paragraph.text));
      exercised = true;
    }
    assert.ok(exercised, key);
  }
  // A future template-only path must report nested vocabulary, not just its template.
  const genericKey = 'fallback-template/transit.aspect';
  const genericTemplates = { templates: templates.templates.map(row => row.contentKey === genericKey ? { ...row, requiredSlots: [], body: '{{transitTopic}} / {{natalCore}}', body_they: '{{transitTopic}} / {{natalCore}}' } : row) };
  const genericRows = { ...rows, hookRows: [] };
  const genericFacts = { transiting: 'lilith', natal: 'north-node', aspect: 'trine', sign: 'capricorn', voice: 'you' };
  const generic = shippedFactory(authored, genericTemplates, genericRows).renderTransitAspect(genericFacts);
  assert.deepEqual(receipt(sourceFactory(authored, genericTemplates, genericRows).renderTransitAspect(genericFacts)), receipt(generic));
  assert.deepEqual(generic.sourceKeys, [genericKey, 'fallback-vocab/planet-topic/lilith', 'fallback-vocab/planet-core/north-node']);
  assert.ok(generic.paragraphSources[0].sources.every(ref => ref.field === 'body'));

  // Pass hooks are not in the approved base catalog. Isolated approved fixtures exercise the append path without publishing anything.
  const passKey = 'fallback-hook/transit-pass/2';
  const fixture = { contentKey: passKey, content_role: 'fallback_hook', review_status: 'approved', body_you: 'Synthetic second pass.', body_they: 'Synthetic friend second pass.' };
  const withPass = shippedFactory(authored, templates, { ...rows, hookRows: [...rows.hookRows, fixture] });
  for (const transiting of ['neptune','lilith']) for (const voice of ['you','Audit Friend']) {
    const facts = { transiting, natal: 'north-node', aspect: 'trine', sign: 'capricorn', pass: 2, variant: 3, isRetrograde: true, window: 'until October 4', voice };
    const output = withPass.renderTransitAspect(facts);
    assert.ok(output.paragraphSources.at(-1).sources.some(ref => ref.contentKey === passKey && ref.field === (voice === 'you' ? 'body_you' : 'body_they')));
    assert.ok(output.body.endsWith(voice === 'you' ? fixture.body_you : fixture.body_they));
  }
  console.log(`PASS transit source receipts: ${rendered} rendered and ${gaps} explicit gaps; all 30,240 cases agree across Node, browser source and shipped artifact; field ownership, supporting edits and pass fixtures verified.`);
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
