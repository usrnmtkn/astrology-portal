#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { buildMemoryIndex, queryMemory, recallMemory, memoryDetail, sha256 } from '../api/_lib/agent-memory.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const command = argv.shift() ?? 'status';
function option(name, fallback = '') {
  const index = argv.indexOf(name);
  if (index < 0) return fallback;
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`Missing ${name} value`);
  argv.splice(index, 2); return value;
}
const ref = option('--ref', 'origin/main');
const repo = path.resolve(option('--repo', root));
const state = path.resolve(option('--state', '/Users/mprez/Code/tldr-astro-memory/state'));
const fetchRemote = argv.includes('--fetch');
const history = argv.includes('--history');
const kind = option('--kind');
const family = option('--family');
const register = option('--register');
const limit = Number(option('--limit', '4'));
const input = option('--file');
const query = argv.filter(value => !['--fetch', '--history'].includes(value)).join(' ');
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 24 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], timeout: 90_000 });

try {
  if (git('remote', 'get-url', 'origin').trim() !== 'https://github.com/usrnmtkn/astrology-portal.git') throw new Error('Source repository identity mismatch');
  if (!['sync', 'status', 'recall', 'search', 'show', 'remember'].includes(command)) throw new Error('Use sync, status, recall, search, show, or remember');
  if (ref.startsWith('-')) throw new Error('Invalid source reference');
  if (fetchRemote) git('fetch', '--prune', 'origin');
  const revision = git('rev-parse', '--verify', `${ref}^{commit}`).trim();
  fs.mkdirSync(state, { recursive: true, mode: 0o700 });
  const notesPath = path.join(state, 'notes.jsonl');
  if (!fs.existsSync(notesPath)) fs.writeFileSync(notesPath, '', { mode: 0o600 });
  if (command === 'remember') {
    if (!input) throw new Error('Use --file with a JSON note containing title, body, source_uri and source_date');
    const note = JSON.parse(fs.readFileSync(input, 'utf8'));
    if (![note.title, note.body, note.source_uri, note.source_date].every(value => typeof value === 'string' && value.trim()) || !/^(thread:|https:\/\/|file:)/u.test(note.source_uri) || !/^\d{4}-\d{2}-\d{2}$/u.test(note.source_date)) throw new Error('A note requires text, a provenance URI, and an ISO date');
    const record = { id: 'note-' + sha256(JSON.stringify([note.title, note.body, note.source_uri, note.source_date])).slice(0, 20), title: note.title, body: note.body, source_uri: note.source_uri, source_date: note.source_date, status: 'unverified', ownerApproved: false, promotionAuthorized: false };
    // appendFile is one synchronous append; duplicate retries are ignored before writing.
    const previous = fs.readFileSync(notesPath, 'utf8');
    if (!previous.split('\n').some(line => line && JSON.parse(line).id === record.id)) fs.appendFileSync(notesPath, JSON.stringify(record) + '\n');
    console.log(JSON.stringify({ ...record, storage: 'local-agent-notes', visibleInAdmin: false }, null, 2));
  } else {
    const sourceCache = new Map();
    const config = fs.readFileSync(path.join(root, 'config/agent-memory-sources-v1.json'), 'utf8');
    const readSource = name => {
      if (name === 'config/agent-memory-sources-v1.json') return config;
      if (sourceCache.has(name)) return sourceCache.get(name);
      let value;
      try { value = git('show', `${revision}:${name}`); }
      catch (error) {
        // Bootstrap-only agent decision file is not yet on main; never substitute
        // working-tree rules or examples when a pinned source is missing.
        if (name !== 'data/agent-memory/decisions.jsonl') throw error;
        value = '';
      }
      sourceCache.set(name, value); return value;
    };
    const index = buildMemoryIndex({ root, readSource, revision });
    const meta = { repository: repo, ref, revision, indexedAt: new Date().toISOString(), remoteFetchedNow: fetchRemote,
      sourceCount: index.sources.length, counts: index.counts, fingerprint: index.fingerprint,
      freshness: fetchRemote ? 'Remote refreshed for this request' : 'Local remote-tracking reference; use --fetch to refresh GitHub' };
    const snapshot = path.join(state, 'snapshots', revision);
    for (const [name, value] of sourceCache) {
      const destination = path.join(snapshot, name); fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o700 });
      if (!fs.existsSync(destination)) fs.writeFileSync(destination, value, { mode: 0o600 });
      else if (sha256(fs.readFileSync(destination)) !== sha256(value)) throw new Error('Local source snapshot hash mismatch');
    }
    fs.writeFileSync(path.join(state, 'status.json'), JSON.stringify(meta, null, 2) + '\n', { mode: 0o600 });
    let result;
    if (['sync', 'status'].includes(command)) result = meta;
    else if (command === 'show') result = memoryDetail(index, query);
    else if (command === 'search') result = queryMemory(index, { query, kind, family, register, history, limit });
    else {
      result = recallMemory(index, query, { family, register, history, limit });
      const terms = query.toLowerCase().split(/\s+/u).filter(Boolean);
      result.localNotes = fs.readFileSync(notesPath, 'utf8').split('\n').filter(Boolean).map(JSON.parse).filter(note => terms.some(term => `${note.title} ${note.body}`.toLowerCase().includes(term))).slice(-4);
      result.localNotesNotice = 'Local unverified task notes; these are not deployed admin memory or owner approval.';
    }
    console.log(JSON.stringify({ provenance: meta, snapshotDirectory: snapshot, result }, null, 2));
  }
} catch (error) {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) })); process.exitCode = 1;
}
