import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const VISUAL_MEMORIES_PER_SOURCE = 24;
const visualCache = new WeakMap();
export const MEMORY_SCHEMA = 'tldr-agent-memory/v1';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const memoryRecordId = (sourcePath, line) => 'm-' + sha256(`${sourcePath}:${line}`).slice(0, 20);
const stopWords = new Set('a an and are as at be by can could do does for from how i in is it me my of on or our should that the their this to use was we what when which with would you your please find remember'.split(' '));
const tokens = value => [...new Set((value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter(word => !stopWords.has(word)))];
const shortTitle = value => value.replace(/^TLDR-|\.md$/gu, '').replace(/[-_]/gu, ' ').replace(/\s+/gu, ' ').trim();

function markdownSections(text) {
  const lines = text.match(/[^\n]*\n|[^\n]+$/gu) ?? [];
  const result = [];
  let start = 0;
  let title = 'Introduction';
  function emit(end) {
    const body = lines.slice(start, end).join('');
    if (body.trim()) result.push({ title, body, line: start + 1, endLine: end });
  }
  lines.forEach((line, i) => {
    if (/^#{1,4} /u.test(line)) {
      emit(i); start = i; title = line.replace(/^#+\s*/u, '').trim();
    }
  });
  emit(lines.length);
  return result;
}

/** Shared by the authenticated API and the local agent CLI. Never imported by a browser. */
export function buildMemoryIndex({ root, readSource = name => fs.readFileSync(path.join(root, name), 'utf8'), revision = null }) {
  const config = JSON.parse(readSource('config/agent-memory-sources-v1.json'));
  const specs = [...config.sources];
  const known = new Set(specs.map(source => source.path));
  const authorityText = readSource(config.authorityIndex);
  const liveIndex = authorityText.split('## 4.')[0];
  // Explicit live links only. Never glob the repository or learn authority from a filename.
  for (const match of liveIndex.matchAll(/`([^`\n]+\.md)`/gu)) {
    const name = match[1].includes('/') ? match[1] : `${path.posix.dirname(config.authorityIndex)}/${match[1]}`;
    if (known.has(name)) continue;
    try { readSource(name); } catch { continue; }
    specs.push({ path: name, kind: 'rule', role: 'Indexed ruling' }); known.add(name);
  }
  const records = [], sources = [], edges = [], skipped = [];
  function add(spec, part, metadata = {}) {
    const id = memoryRecordId(spec.path, part.line);
    const record = {
      id, kind: spec.kind, status: spec.status ?? 'current', role: spec.role ?? spec.kind,
      title: part.title, body: part.body, sourceId: 's-' + sha256(spec.path).slice(0, 16),
      path: spec.path, line: part.line, endLine: part.endLine,
      bodySha256: sha256(part.body), family: String(metadata.family ?? ''),
      register: String(metadata.register ?? ''), contentKey: String(metadata.contentKey ?? metadata.content_key ?? ''),
      metadata, writerPacketEligible: false,
    };
    if (spec.kind === 'example') {
      record.status = metadata.ownerApproved === true ? 'current' : 'needs_review';
      record.role = metadata.authority === 'owner-approved-v9-governance-labeled' ? 'Matrix evidence' : 'Approved-source projection';
    }
    if (spec.kind === 'note') record.status = 'unverified';
    records.push(record);
    edges.push({ source: record.sourceId, target: id, relation: 'contains' });
  }
  for (const spec of specs) {
    if (path.posix.isAbsolute(spec.path) || spec.path.split('/').includes('..')) throw new Error('Invalid memory source path');
    const text = readSource(spec.path);
    sources.push({ id: 's-' + sha256(spec.path).slice(0, 16), path: spec.path,
      title: shortTitle(path.posix.basename(spec.path)), kind: spec.kind,
      status: spec.status ?? 'current', sha256: sha256(text) });
    if (spec.path.endsWith('.jsonl')) {
      text.split('\n').forEach((line, index) => {
        if (!line.trim()) return;
        const item = JSON.parse(line);
        const body = spec.kind === 'example' ? item.text : spec.kind === 'note' ? item.body : line;
        if (spec.kind === 'example' && (typeof body !== 'string' || !body.trim())) {
          skipped.push({ path: spec.path, line: index + 1, reason: 'empty_example' }); return;
        }
        if (typeof body !== 'string' || !body.trim()) throw new Error(`Missing memory body at ${spec.path}:${index + 1}`);
        add(spec, { line: index + 1, endLine: index + 1, body,
          title: String(item.title ?? item.id ?? item.rule ?? item.category ?? `Record ${index + 1}`) }, item);
      });
    } else {
      for (const part of markdownSections(text)) add(spec, part);
    }
  }
  const byPath = new Map(sources.map(source => [source.path, source]));
  for (const relationship of config.supersedes) {
    const oldSource = byPath.get(relationship.old), newSource = byPath.get(relationship.new);
    if (!oldSource || !newSource) throw new Error('Unresolved memory supersession');
    oldSource.status = 'superseded';
    edges.push({ source: newSource.id, target: oldSource.id, relation: 'supersedes' });
    for (const record of records.filter(record => record.path === relationship.old)) {
      record.status = 'superseded'; record.metadata.supersededBy = relationship.new;
    }
  }
  for (const qualification of config.qualifications) {
    const source = byPath.get(qualification.source);
    if (!source) throw new Error('Missing qualification source');
    for (const name of qualification.targets) {
      const target = byPath.get(name);
      if (!target) continue;
      edges.push({ source: source.id, target: target.id, relation: 'qualifies' });
      for (const record of records.filter(record => record.path === name)) {
        record.metadata.qualifiedBy = qualification.source;
      }
    }
  }
  // Only literal repository links establish citations. Similar text never does.
  for (const record of records) {
    const cited = new Set();
    for (const match of record.body.matchAll(/`([^`\n]+)`|\]\(([^)\s]+)\)/gu)) {
      const literal = match[1] ?? match[2];
      const reference = literal.split('#')[0];
      const target = byPath.get(reference) ?? byPath.get(path.posix.normalize(path.posix.join(path.posix.dirname(record.path), reference)));
      if (!target || target.id === record.sourceId || cited.has(target.id)) continue;
      cited.add(target.id);
      edges.push({ source: record.id, target: target.id, relation: 'cites', evidence: { path: record.path, line: record.line, reference: literal } });
    }
  }
  const rejectedText = new Map(), rejectedKeys = new Map();
  for (const record of records.filter(record => record.kind === 'correction')) {
    const meta = record.metadata;
    if (meta.bad) rejectedText.set(sha256(meta.bad.trim()), record.id);
    if (meta.positive_evidence_revoked && meta.content_key) rejectedKeys.set(meta.content_key, record.id);
  }
  for (const record of records.filter(record => record.kind === 'example')) {
    const rejectedBy = rejectedText.get(sha256(record.body.trim())) ?? rejectedKeys.get(record.contentKey);
    if (rejectedBy) {
      record.status = 'rejected'; record.metadata.rejectedBy = rejectedBy;
      edges.push({ source: rejectedBy, target: record.id, relation: 'rejects' });
    }
  }
  const counts = Object.fromEntries(['rule', 'correction', 'example', 'navigation', 'note'].map(kind => [kind, records.filter(record => record.kind === kind).length]));
  return { schema: MEMORY_SCHEMA, revision, fingerprint: sha256(JSON.stringify(sources)),
    sources, records, edges, counts, skipped, requiredContext: config.requiredContext,
    policy: 'Retrieval evidence only. Exact approval, writing eligibility, and serving remain governed by the canonical writer. Notes are unverified. No automatic extraction from conversations.' };
}

function overview(record) {
  const { body, metadata, ...summary } = record;
  return summary;
}

export function queryMemory(index, { query = '', phrase = false, kind = '', source = '', family = '', register = '', history = false, offset = 0, limit = 60 } = {}) {
  if (typeof query !== 'string' || query.length > 500) throw new Error('Search must be at most 500 characters');
  if (kind && !Object.hasOwn(index.counts, kind)) throw new Error('Unknown memory type');
  if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(offset) || offset < 0) throw new Error('Invalid pagination');
  const terms = tokens(query).slice(0, 24);
  const results = [];
  for (const record of index.records) {
    if (!history && !['current', 'unverified'].includes(record.status)) continue;
    if (kind && record.kind !== kind || source && record.sourceId !== source || family && record.family !== family || register && record.register !== register) continue;
    let score = 0;
    if (query.trim()) {
      if (!terms.length) continue;
      const context = `${record.title} ${record.family} ${record.register} ${record.contentKey} ${record.path}`.toLowerCase();
      const body = record.body.toLowerCase();
      if (phrase && !context.includes(query.toLowerCase().trim()) && !body.includes(query.toLowerCase().trim())) continue;
      let matched = 0;
      for (const term of terms) {
        if (context.includes(term) || body.includes(term)) { matched++; score += context.includes(term) ? 4 : 1; }
      }
      if (!matched) continue;
      score += (matched / terms.length) * 20;
      if (body.includes(query.toLowerCase().trim())) score += 12;
    }
    results.push({ record, score });
  }
  results.sort((a, b) => b.score - a.score || a.record.path.localeCompare(b.record.path) || a.record.line - b.record.line);
  const summaries = results.slice(offset, offset + limit).map(({ record }) => overview(record));
  const groups = new Map();
  for (const { record } of results) {
    if (!groups.has(record.sourceId)) groups.set(record.sourceId, []);
    groups.get(record.sourceId).push(record);
  }
  // Spread the bounded sample across each source instead of taking its opening rows.
  const graphRecords = query || source ? summaries : [...groups.values()].flatMap(records => {
    const count = Math.min(records.length, VISUAL_MEMORIES_PER_SOURCE);
    return Array.from({ length: count }, (_, n) => overview(records[count === 1 ? 0 : Math.round(n * (records.length - 1) / (count - 1))]));
  });
  const visible = new Set([...summaries, ...graphRecords].map(record => record.id));
  const sourceIds = new Set(summaries.map(record => record.sourceId));
  const matchingCounts = new Map();
  for (const { record } of results) matchingCounts.set(record.sourceId, (matchingCounts.get(record.sourceId) ?? 0) + 1);
  const sources = index.sources.filter(item => matchingCounts.has(item.id)).map(item => ({
    ...item, count: matchingCounts.get(item.id),
  }));
  const sourceNodeIds = new Set(sources.map(item => item.id));
  const edges = index.edges.filter(edge => (visible.has(edge.source) || sourceIds.has(edge.source) || sourceNodeIds.has(edge.source)) && (visible.has(edge.target) || sourceIds.has(edge.target) || sourceNodeIds.has(edge.target)));
  return { schema: index.schema, revision: index.revision, fingerprint: index.fingerprint, counts: index.counts,
    total: results.length, offset, limit, records: summaries, graphRecords, sources, edges, policy: index.policy };
}

export function memoryDetail(index, id) {
  const record = index.records.find(item => item.id === id);
  if (!record) return null;
  if (sha256(record.body) !== record.bodySha256) throw new Error('Memory integrity mismatch');
  const source = index.sources.find(item => item.id === record.sourceId);
  const sourceUrl = record.metadata?.storage !== 'private-studio' && index.revision && /^[a-f0-9]{40}$/u.test(index.revision)
    ? `https://github.com/usrnmtkn/astrology-portal/blob/${index.revision}/${encodeURI(record.path)}#L${record.line}` : null;
  const linkedIds = new Set(index.edges.filter(edge => edge.source === id || edge.target === id).flatMap(edge => [edge.source, edge.target]));
  return { ...record, sourceSha256: source.sha256, sourceUrl, revision: index.revision,
    relationships: index.edges.filter(edge => edge.source === id || edge.target === id),
    connections: visualMemoryGraph(index).connections.filter(edge => edge.source === id || edge.target === id).map(edge => {
      const targetId = edge.source === id ? edge.target : edge.source;
      const target = index.records.find(item => item.id === targetId) ?? index.sources.find(item => item.id === targetId);
      return { ...edge, direction: edge.source === id ? 'outgoing' : 'incoming', target: target.body ? overview(target) : { ...target, isSource: true } };
    }),
    related: index.records.filter(item => item.id !== id && linkedIds.has(item.id)).map(overview),
    requiredContext: index.records.filter(item => index.requiredContext.includes(item.path)).map(item => ({ ...item })),
  };
}

export function recallMemory(index, query, options = {}) {
  const groups = {};
  for (const kind of Object.keys(index.counts)) {
    groups[kind] = queryMemory(index, { query, ...options, kind, limit: options.limit ?? 4 }).records.map(record => memoryDetail(index, record.id));
    // Required context is returned once, not copied into every item.
    for (const record of groups[kind]) delete record.requiredContext;
  }
  return { schema: index.schema, revision: index.revision, fingerprint: index.fingerprint, query,
    policy: index.policy, groups, requiredContext: index.records.filter(record => index.requiredContext.includes(record.path)) };
}

/** Bounded canvas projection. Search/recall still cover the complete index. */
export function visualMemoryGraph(index) {
  if (visualCache.has(index)) return visualCache.get(index);
  const overview = queryMemory(index);
  const ids = new Set(overview.graphRecords.map(record => record.id));
  const selected = index.records.filter(record => ids.has(record.id));
  const recordedDate = record => {
    const date = record.metadata?.source_date ?? record.metadata?.date ?? record.metadata?.created_at;
    return date && Number.isFinite(Date.parse(date)) ? date : '';
  };
  const visible = new Set([...ids, ...overview.sources.map(source => source.id)]);
  const recorded = index.edges.filter(edge => edge.relation !== 'contains' && visible.has(edge.source) && visible.has(edge.target))
    .map(edge => ({ ...edge, basis: 'recorded' }));
  const connections = [...recorded, ...topicConnections(selected)];
  const graph = { revision: index.revision, total: overview.total, connections, documents: overview.sources.map(source => ({
    id: source.id, title: source.title, contentHash: source.sha256, orgId: 'tldr-astro', userId: 'project',
    status: 'done', createdAt: '', updatedAt: '', type: source.kind,
    // This is inventory metadata, not a summary or alteration of owner prose.
    summary: `${source.path}\n${source.count} indexed memories. The canvas shows up to ${VISUAL_MEMORIES_PER_SOURCE} evenly sampled records per source; search covers the full index.${connections.filter(edge => edge.source === source.id).map(edge => `\nRecorded: ${edge.relation} ${index.sources.find(item => item.id === edge.target)?.title ?? edge.target}`).join('')}`,
    url: index.revision ? `https://github.com/usrnmtkn/astrology-portal/blob/${index.revision}/${source.path}` : undefined,
    processingMetadata: { graphConnections: connections.filter(edge => edge.source === source.id || selected.some(record => record.sourceId === source.id && record.id === edge.source)) },
    memoryEntries: selected.filter(record => record.sourceId === source.id).map(record => ({
      id: record.id, documentId: source.id, title: record.title, content: record.body,
      createdAt: recordedDate(record), updatedAt: recordedDate(record), isLatest: true,
      metadata: { path: record.path, line: record.line, bodySha256: record.bodySha256, status: record.status, role: record.role },
    })),
  })) };
  visualCache.set(index, graph);
  return graph;
}


/** Explainable lexical suggestions, separate from the authoritative edge index. */
export function topicConnections(records) {
  const ignored = new Set('not only also all any must may has have been will than then into out its no one two other same each more such these those through before after without within example source text content record writing owner approved approval current status rule use'.split(' '));
  const terms = records.map(record => new Set(tokens(`${record.title} ${record.body}`).filter(term => term.length >= 4 && !ignored.has(term) && !/^\d+$/u.test(term))));
  const frequency = new Map();
  terms.forEach(set => set.forEach(term => frequency.set(term, (frequency.get(term) ?? 0) + 1)));
  const vectors = terms.map((set, i) => {
    const title = new Set(tokens(records[i].title));
    const weights = [...set].filter(term => frequency.get(term) >= 2 && frequency.get(term) <= Math.max(3, records.length * 0.35))
      .map(term => [term, Math.log(1 + records.length / frequency.get(term)) * (title.has(term) ? 1.5 : 1)])
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 32);
    const norm = Math.hypot(...weights.map(([, weight]) => weight));
    return new Map(weights.map(([term, weight]) => [term, weight / norm]));
  });
  const candidates = [];
  for (let i = 0; i < records.length; i++) for (let j = i + 1; j < records.length; j++) {
    if (records[i].sourceId === records[j].sourceId) continue;
    const shared = [...vectors[i]].filter(([term]) => vectors[j].has(term));
    if (shared.length < 3) continue;
    const score = shared.reduce((sum, [term, weight]) => sum + weight * vectors[j].get(term), 0);
    if (score < 0.28) continue;
    candidates.push({ source: records[i].id, target: records[j].id, relation: 'shared_terms', basis: 'suggested',
      score: Number(score.toFixed(4)), terms: shared.sort((a, b) => b[1] * vectors[j].get(b[0]) - a[1] * vectors[j].get(a[0])).slice(0, 6).map(([term]) => term) });
  }
  candidates.sort((a, b) => b.score - a.score || a.source.localeCompare(b.source) || a.target.localeCompare(b.target));
  const degree = new Map();
  return candidates.filter(edge => {
    if ((degree.get(edge.source) ?? 0) >= 2 || (degree.get(edge.target) ?? 0) >= 2) return false;
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
    return true;
  });
}
