import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolveConfig } from 'vite';
import { parseAst } from 'rollup/parseAst';
import { rollup } from 'rollup';
import { internJsonStringLiterals, internPublicJsonStringsPlugin } from './public-json-string-interning-plugin.mjs';

// Use the installed Vite JSON transform; no server, fixture serializer or copy rewrite.
const config = await resolveConfig({ configFile: false, envFile: false, json: { stringify: false }, plugins: [internPublicJsonStringsPlugin()] }, 'build');
const jsonPlugin = config.plugins.find(plugin => plugin.name === 'vite:json');
assert(config.plugins.indexOf(jsonPlugin) < config.plugins.findIndex(plugin => plugin.name === 'tldr-intern-public-json-strings'));
const transformJson = code => jsonPlugin.transform.handler.call({ error: message => { throw Error(message); }, warn: message => { throw Error(message); } }, code, '/fixture.json').code;
const evaluate = code => import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
function compare(a, b, pairs = new WeakMap(), reverse = new WeakMap()) {
  if (!a || typeof a !== 'object') {
    assert(Object.is(a, b));
    return;
  }
  assert(b && typeof b === 'object');
  if (pairs.has(a)) { assert.equal(b, pairs.get(a)); return; }
  assert(!reverse.has(b), 'Distinct original objects must remain distinct');
  pairs.set(a, b); reverse.set(b, a);
  const originalPrototype = Object.getPrototypeOf(a);
  const changedPrototype = Object.getPrototypeOf(b);
  if ([null, Object.prototype, Array.prototype].includes(originalPrototype)) assert.equal(changedPrototype, originalPrototype);
  else compare(originalPrototype, changedPrototype, pairs, reverse);
  assert.deepStrictEqual(Reflect.ownKeys(b), Reflect.ownKeys(a));
  for (const key of Reflect.ownKeys(a)) {
    const left = Object.getOwnPropertyDescriptor(a, key);
    const right = Object.getOwnPropertyDescriptor(b, key);
    for (const flag of ['enumerable', 'configurable', 'writable', 'get', 'set']) assert.equal(right[flag], left[flag]);
    compare(left.value, right.value, pairs, reverse);
  }
}

const long = 'Synthetic repeated string with Unicode 🌙 é and separators \u2028\u2029. '.repeat(3);
const filterPlugin = internPublicJsonStringsPlugin();
const filterCode = transformJson(JSON.stringify({ first: long, second: long }));
for (const file of ['bundled-sky-core-rows-v3.json', 'bundled-sky-placement-rows-v3.json', 'bundled-deferred-core-rows-v3.json']) {
  const id = `/repo/apps/web/src/content/fallbackArchitectureV3/${file}`;
  assert(filterPlugin.transform.call({ parse: parseAst }, filterCode, id));
  for (const suffix of ['?raw', '?url', '?import']) assert.equal(filterPlugin.transform.call({ parse: parseAst }, filterCode, id + suffix), undefined);
}
assert.equal(filterPlugin.transform.call({ parse: parseAst }, filterCode, '/repo/unrelated.json'), undefined);
assert.equal(filterPlugin.transform.call({ parse: parseAst }, filterCode, '/repo/apps/web/src/content/fallbackArchitectureV3/bundled-initial-reader-rows-v3.json'), undefined);
const fixtures = [
  JSON.stringify({ [long]: long, second: long, surrogate: '\ud800', repeatedSurrogate: '\ud800'.repeat(100) }),
  JSON.stringify({ a: { copy: long }, b: { copy: long }, $tldrJsonString0: [long, long], '0': long }),
  `{"a":${JSON.stringify(long)},"b":${JSON.stringify(long)},"negative":-0,"__proto__":{"own":true},"nested":{"__proto__":${JSON.stringify(long)}}}`,
];
for (const raw of fixtures) {
  const original = transformJson(raw);
  const changed = internJsonStringLiterals(original, parseAst);
  assert(changed);
  const before = await evaluate(original);
  const after = await evaluate(changed.code);
  compare(before, after);
  const keys = Object.keys(before);
  for (const key of keys) {
    if (key !== 'default') assert.equal(after[key] === after.default[key], before[key] === before.default[key]);
  }
  if (after.default.a && after.default.b && typeof after.default.a === 'object') assert.notEqual(after.default.a, after.default.b);
}
assert.equal(internJsonStringLiterals('export default "short";', parseAst), null);
const source = `export const unused=${JSON.stringify(long)}; export const used=${JSON.stringify(long)};`;
const transformed = internJsonStringLiterals(source, parseAst).code;
const bundle = await rollup({ input: 'entry', plugins: [{ name: 'fixture', resolveId: id => id, load: id => id === 'entry' ? 'export { used } from "data";' : transformed }] });
const output = await bundle.generate({ format: 'es' });
assert(!output.output[0].code.includes('unused'));
assert.equal((await evaluate(output.output[0].code)).used, long);
await bundle.close();
for (const file of ['bundled-sky-core-rows-v3.json', 'bundled-sky-placement-rows-v3.json', 'bundled-deferred-core-rows-v3.json']) {
  const path = new URL(`../apps/web/src/content/fallbackArchitectureV3/${file}`, import.meta.url);
  const raw = await readFile(path);
  const digest = createHash('sha256').update(raw).digest('hex');
  const original = transformJson(raw.toString());
  const changed = internJsonStringLiterals(original, parseAst);
  assert(changed);
  compare(await evaluate(original), await evaluate(changed.code));
  assert.equal(createHash('sha256').update(await readFile(path)).digest('hex'), digest);
}
console.log('PASS actual Vite exports, values, own-key order, identities, Unicode, collisions, tree shaking and governed input digests');
