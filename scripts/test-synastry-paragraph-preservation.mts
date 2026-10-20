import assert from 'node:assert/strict';
import fs from 'node:fs';
import { renderSynastryPairVoice } from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.mjs';
import { createTransitSynastryRenderer as browser } from '../apps/web/src/content/fallbackArchitectureV3/resolver/renderTransitSynastry.browser.ts';
import { createTransitSynastryRenderer as shipped } from '../apps/web/src/content/fallbackArchitectureV3/dist/tldr-content.js';
const base = 'apps/web/src/content/fallbackArchitectureV3/';
const read = (file: string) => JSON.parse(fs.readFileSync(base + file, 'utf8'));
const rows = read('source-rows/fallback-source-rows-v3.json');
const templates = read('templates/fallback-templates-v3.json');
const moon = 'You read with {{holder2}}.  Both spaces remain.\n\nA second paragraph for the Moon reader.\n\nThe final Moon sentence.';
const uranus = 'You read with {{holder1}}.  Both spaces remain.\n\nA second paragraph for the Uranus reader.\n\nThe final Uranus sentence.';
const row = { contentKey: 'fallback-hook/synastry-pair/moon/uranus/opposition', content_role: 'fallback_hook', grammar_frame: 'complete_sentence', review_status: 'reviewed', body_you: moon, body_they: uranus };
for (const name of ['River', "O’Neil", '$&']) {
  assert.equal(renderSynastryPairVoice(moon, { holder1: 'you', holder2: name }), moon.split('{{holder2}}').join(name));
  assert.equal(renderSynastryPairVoice(uranus, { holder1: name, holder2: 'you' }), uranus.split('{{holder1}}').join(name));
  for (const factory of [browser, shipped]) {
    const original = factory({ authoredCards: [] }, templates, rows);
    const updated = factory({ authoredCards: [] }, templates, { ...rows, hookRows: [...rows.hookRows, row] });
    for (const [planetA, planetB, text, slot] of [['moon','uranus',moon,'holder2'], ['uranus','moon',uranus,'holder1']]) {
      const facts = { planetA, planetB, aspect: 'opposition', otherName: name, romanticAllowed: false, relationshipType: 'friend' };
      const result = updated.renderSynastryAspect(facts);
      assert.equal(result.contentKey, row.contentKey);
      assert.equal(result.body, text.split(`{{${slot}}}`).join(name));
      assert.equal(result.body.split('\n\n').length, 3);
      assert.equal(updated.renderSynastryAspect({ ...facts, aspect: 'square' }).body, original.renderSynastryAspect({ ...facts, aspect: 'square' }).body);
    }
  }
}
console.log('PASS exact synastry whitespace, both reader directions, literal names, exact opposition priority, square unchanged and Node/browser/shipped parity.');
