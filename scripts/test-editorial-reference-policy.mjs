#!/usr/bin/env node
/** Scan the complete tracked tree, including source metadata and historical packets. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Assemble the prohibited name so the guard is not itself an attribution.
const name = ['cha', 'ni'].join('');
const pattern = new RegExp(name, 'giu');
const ordinaryTail = /^(?:c|s[mts]|z)/iu;

function hasReference(value) {
  const text = String(value).normalize('NFKC').replace(/[\u200b-\u200d\ufeff]/gu, '');
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    const left = text.slice(Math.max(0, start - 2), start);
    const right = text.slice(start + match[0].length, start + match[0].length + 3);
    if (!(/me$/iu.test(left) && ordinaryTail.test(right))) return true;
  }
  return false;
}

// Verify filenames, URLs, embedded identifiers, provenance, casing, and false positives.
for (const text of [name, name.toUpperCase(), `https://${name}.com/source`, `raw_${name}_copy`, `source${name}Comparison`, `docs/${name}-notes.txt`, `{"sourceNotes":"${name}"}`, `me${name}Reference`]) {
  assert.equal(hasReference(text), true, `Missed reference: ${text}`);
}
for (const text of ['mechanism', 'mechanical', 'biomechanics', 'mechanisms', 'mechanistic', 'mechanization', 'mechanicalClarificationLine', 'resolveMechanism']) {
  assert.equal(hasReference(text), false, `Matched ordinary word: ${text}`);
}
const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: root, maxBuffer: 32 * 1024 * 1024 }).toString('utf8').split('\0').filter(Boolean);
const violations = [];
let textFiles = 0;
let binaryFiles = 0;
for (const relative of new Set(paths)) {
  const absolute = path.join(root, relative);
  // A tracked deletion is absent from the working tree; it is not a source file.
  if (!fs.existsSync(absolute)) continue;
  const stat = fs.lstatSync(absolute);
  if (hasReference(relative)) violations.push(`${relative}:filename`);
  if (stat.isSymbolicLink()) {
    if (hasReference(fs.readlinkSync(absolute))) violations.push(`${relative}:symlink`);
    continue;
  }
  if (!stat.isFile()) continue;
  const bytes = fs.readFileSync(absolute);
  let text;
  try {
    if (bytes[0] === 0xff && bytes[1] === 0xfe) text = new TextDecoder('utf-16le', { fatal: true }).decode(bytes.subarray(2));
    else if (bytes[0] === 0xfe && bytes[1] === 0xff) text = new TextDecoder('utf-16be', { fatal: true }).decode(bytes.subarray(2));
    else text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (text.includes('\0')) throw new Error('binary');
  } catch {
    binaryFiles += 1;
    continue;
  }
  textFiles += 1;
  for (const [line, value] of text.split(/\r?\n/u).entries()) {
    if (hasReference(value)) violations.push(`${relative}:${line + 1}`);
  }
}
assert.deepEqual(violations, [], `Prohibited editorial references remain; remove them rather than substituting an alias:\n${violations.join('\n')}`);
console.log(`Editorial reference policy passed: ${textFiles} text files; ${binaryFiles} binary filenames checked. Binary visual content is not covered by this text scan.`);
