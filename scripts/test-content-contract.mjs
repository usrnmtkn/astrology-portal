#!/usr/bin/env node
/**
 * TLDR Astro — Reader-Facing Content Contract test (v1, Jul 21 2026)
 *
 * THIS FILE IS THE ARBITER OF CONTENT-CONTRACT.md AND MUST NOT BE MODIFIED.
 * Do not edit, weaken, skip, or wrap it. If it appears wrong, stop and raise
 * it with the author. Commit it as scripts/test-content-contract.mjs.
 *
 * It reads content through scripts/contract-adapter.mjs, which YOU implement:
 *
 *   export default async function loadUnits() {
 *     return [ {
 *       key:            'house.saturn.8',            // stable unique content key
 *       surface:        'house' | 'aspect' | 'daily' | 'compat',
 *       sourcePackage:  'moon-moon-matching-library-v1',
 *       version:        'author-final' | 'draft',
 *       declaredSlots:  ['tldr','headline','body'],  // slots the layout will render
 *       fields:         { tldr: '...', headline: '...', body: '...' },
 *     }, ... ]
 *   }
 *
 * Adapter rules: it must expose EVERY reader-facing unit exactly as the
 * renderer would receive it (post-import, pre-render). It must not filter,
 * repair, trim, or normalize content on the way out. Units the renderer can
 * select must all be present. {friend} placeholders are expected in compat.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---- floors: adapters that under-report are failing adapters, not passing suites
const REQUIRED_SURFACES = ['house', 'aspect', 'compat'];
const FLOORS = {
  totalUnits: 220,
  house: 60,
  compatMoon: 144, // exactly, both directions of every pairing incl. same-sign
};

const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

const ARTIFACTS = [
  [/-{4,}/, 'divider artifact (----)'],
  [/\.{4,}/, 'multi-dot truncation artifact (....)'],
  [/(\.{3}|…)\s*$/, 'field ends in ellipsis (truncated copy)'],
  [/^#{1,6}\s/m, 'markdown heading artifact'],
  [/\*{2,}/, 'markdown emphasis artifact'],
  [/\{(?!friend\})[^{}]{0,40}\}/, 'unresolved placeholder other than {friend}'],
  [/\b(undefined|NaN|\[object Object\])\b/, 'serialization artifact'],
];

const copyHash = (value) => crypto.createHash('sha1').update(String(value ?? '')).digest('hex');

function transitingBodyFromAspectKey(key) {
  const parts = String(key ?? '').split('.');
  return parts[0] === 'aspect' && parts.length >= 4 ? parts[1] : null;
}

function checkUnit(u, failures) {
  const fail = (rule, detail) =>
    failures.push({ key: u.key, surface: u.surface, rule, detail });

  if (!u.key || !u.surface || !u.version || !Array.isArray(u.declaredSlots) || !u.fields) {
    fail('ADAPTER', 'unit missing key/surface/version/declaredSlots/fields');
    return;
  }

  // R1: every declared slot non-empty
  for (const slot of u.declaredSlots) {
    const v = u.fields[slot];
    if (typeof v !== 'string' || v.trim().length === 0) {
      fail('R1-empty-slot', `declared slot "${slot}" is empty`);
    }
  }

  // R2: tldr never derived from body
  const tldr = u.fields.tldr;
  const body = u.fields.body;
  if (typeof tldr === 'string' && tldr.trim() && typeof body === 'string' && body.trim()) {
    const t = norm(tldr).replace(/(\.{3}|…|\.)+$/g, '').trim();
    const b = norm(body);
    if (t.length > 40 && (b.startsWith(t) || t === b)) {
      fail('R2-derived-tldr', 'tldr equals or is a prefix of body');
    }
  }

  // R3: artifacts in any display field
  for (const [slot, v] of Object.entries(u.fields)) {
    if (typeof v !== 'string' || !v.trim()) continue;
    for (const [re, label] of ARTIFACTS) {
      if (re.test(v)) fail('R3-artifact', `${label} in "${slot}"`);
    }
  }
}

function checkGlobal(units, failures) {
  const fail = (rule, detail) => failures.push({ key: '(global)', surface: '-', rule, detail });

  if (units.length < FLOORS.totalUnits) {
    fail('ADAPTER-floor', `only ${units.length} units exposed; floor is ${FLOORS.totalUnits}`);
  }
  for (const s of REQUIRED_SURFACES) {
    if (!units.some((u) => u.surface === s)) fail('ADAPTER-floor', `surface "${s}" exposed no units`);
  }
  const houses = units.filter((u) => u.surface === 'house');
  if (houses.length < FLOORS.house) {
    fail('ADAPTER-floor', `house units ${houses.length} < ${FLOORS.house}`);
  }
  const compatMoon = units.filter((u) => u.surface === 'compat' && /(^|\.)moon\./.test(u.key));
  if (compatMoon.length !== FLOORS.compatMoon) {
    fail('ADAPTER-floor', `compat moon units ${compatMoon.length} != ${FLOORS.compatMoon}`);
  }

  // R4: draft shadowed by author-final = stale, must not be served
  const finals = new Set(units.filter((u) => u.version === 'author-final').map((u) => u.key));
  for (const u of units) {
    if (u.version !== 'author-final' && finals.has(u.key)) {
      failures.push({ key: u.key, surface: u.surface, rule: 'R4-stale', detail: 'draft unit shadowed by author-final package is still exposed to the renderer' });
    }
  }

  // R4 addendum: served transit-aspect copy may not be reused across transiting bodies.
  const aspectBodies = new Map();
  for (const u of units) {
    if (u.surface !== 'aspect' || typeof u.fields?.body !== 'string' || !u.fields.body.trim()) continue;
    const transiting = transitingBodyFromAspectKey(u.key);
    if (!transiting) continue;
    const hash = copyHash(u.fields.body);
    if (!aspectBodies.has(hash)) aspectBodies.set(hash, []);
    aspectBodies.get(hash).push({ key: u.key, transiting });
  }
  for (const [hash, list] of aspectBodies) {
    const transitingBodies = new Set(list.map((item) => item.transiting));
    if (transitingBodies.size > 1) {
      failures.push({
        key: list.map((item) => item.key).join(', '),
        surface: 'aspect',
        rule: 'R4-duplicate-aspect-copy',
        detail: `identical body hash ${hash} is served for multiple transiting bodies: ${[...transitingBodies].sort().join(', ')}`
      });
    }
  }
}

async function main() {
  let loadUnits;
  try {
    ({ default: loadUnits } = await import(path.join(__dirname, 'contract-adapter.mjs')));
  } catch (e) {
    console.error('CONTRACT FAIL: scripts/contract-adapter.mjs missing or broken.');
    console.error('Implement the adapter described in this file\'s header. Error:', e.message);
    process.exit(1);
  }

  const units = await loadUnits();
  if (!Array.isArray(units)) {
    console.error('CONTRACT FAIL: adapter did not return an array.');
    process.exit(1);
  }

  const failures = [];
  const seen = new Set();
  for (const u of units) {
    if (u && u.key && u.version && seen.has(`${u.key}::${u.version}`)) {
      failures.push({ key: u.key, surface: u.surface, rule: 'ADAPTER', detail: 'duplicate key+version exposed' });
    }
    if (u && u.key && u.version) seen.add(`${u.key}::${u.version}`);
    checkUnit(u ?? {}, failures);
  }
  checkGlobal(units, failures);

  if (failures.length) {
    console.error(`\nCONTENT CONTRACT: ${failures.length} violation(s) across ${units.length} units\n`);
    const byRule = {};
    for (const f of failures) (byRule[f.rule] ??= []).push(f);
    for (const [rule, list] of Object.entries(byRule)) {
      console.error(`\n== ${rule} (${list.length})`);
      for (const f of list.slice(0, 40)) console.error(`  ${f.surface}  ${f.key}  ${f.detail}`);
      if (list.length > 40) console.error(`  ...and ${list.length - 40} more`);
    }
    console.error('\nFix the CONTENT, the import, or the adapter wiring. Do not edit this test.');
    process.exit(1);
  }

  console.log(`CONTENT CONTRACT PASSED: ${units.length} units clean across ${new Set(units.map((u) => u.surface)).size} surfaces.`);
}

main();
