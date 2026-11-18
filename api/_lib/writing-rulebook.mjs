import {sha256} from './agent-memory.mjs';

// These complete contracts are explicitly sourced by canonicalInstructions.mjs,
// the effective-rule registry, or the canonical surface workflows. This is a
// display inventory, never a change to writer authority or prompt assembly.
export const writingReferenceContracts = [
  'docs/writing/VOICE_CONTRACT.md', 'docs/writing/ASTROLOGY_CONTRACT.md',
  'docs/writing/owner-author_LONG_FORM_VOICE_STANDARD.md', 'docs/writing/REVIEW_RUBRIC.md',
  'docs/writing/LITERAL_LANGUAGE_RULES.md', 'docs/writing/ARGUMENT_DEVELOPMENT_STANDARD.md',
  'docs/writing/CONCRETENESS_CONTRACT.md', 'docs/writing/OWNER_APPROVAL_GOVERNANCE.md',
  'docs/writing/OWNER_CORRECTIONS.md',
];
const authorityPath = 'tldr-astro-phrasebank/TLDR-WRITING-AUTHORITY-INDEX.md';
const registryPath = 'config/writing-effective-rules-v1.json';
const amendmentsPath = 'docs/writing/RHETORICAL_PATTERN_PROTECTIONS.md';
const priority = [amendmentsPath, 'skills/tldr-astro-writer/SKILL.md',
  'docs/writing/WRITING_RULE_RECONCILIATION_OWNER_RULING_2026-08-25.md', authorityPath,
  'docs/writing/SKY_CALENDAR_ASPECT_STANDARD.md'];
export function ruleSourceUrl(revision, sourcePath) {
  return /^[a-f0-9]{40}$/u.test(revision ?? '')
    ? `https://github.com/usrnmtkn/astrology-portal/blob/${revision}/${sourcePath}` : null;
}

/** Immutable full-source projection. Examples and unverified task notes are not
 * promoted to rules. Superseded sources remain identifiable as historical. */
export function buildWritingRulebook(index, readSource) {
  const registryBody = readSource(registryPath), registry = JSON.parse(registryBody);
  if (!Array.isArray(registry.rules) || !registry.rules.length) throw new Error('Writing registry unavailable');
  const currentRules = registry.rules.filter(rule => rule.tier !== 'retired');
  const selected = new Set(index.sources.filter(source => (['rule','correction'].includes(source.kind)
    || source.kind === 'note' && source.path.startsWith('docs/'))
    && source.status === 'current').map(source => source.path));
  for (const name of [authorityPath, ...writingReferenceContracts,
    ...currentRules.map(rule => rule.ownerAuthority?.sourcePath)]) {
    if (typeof name !== 'string' || !name || name.startsWith('/') || name.split('/').includes('..'))
      throw new Error('Invalid writing reference source');
    selected.add(name);
  }
  const documents = [...selected].map(sourcePath => {
    const source = index.sources.find(item => item.path === sourcePath);
    if (source && source.status !== 'current') throw new Error('Superseded writing source selected');
    const body = readSource(sourcePath), sourceSha256 = sha256(body);
    if (!body.trim() || source && source.sha256 !== sourceSha256) throw new Error('Writing source integrity failed');
    const sourceRecords = index.records.filter(record => record.path === sourcePath);
    const title = /^#{1,6}\s+(.+)$/mu.exec(body)?.[1]
      ?? (source?.kind === 'correction' ? `Owner corrections · ${sourcePath.split('/').at(-1)}` : source?.title ?? sourcePath);
    const qualifications = [...new Set(sourceRecords.map(record => record.metadata?.qualifiedBy).filter(Boolean))];
    return {id: source?.id ?? `s-${sha256(sourcePath).slice(0,16)}`, title, path: sourcePath,
      role: sourceRecords[0]?.role ?? 'Referenced writing contract', kind: source?.kind ?? 'rule',
      body, bodySha256: sourceSha256, sourceSha256, sourceUrl: ruleSourceUrl(index.revision, sourcePath),
      qualifiedBy: qualifications,
      ...(sourcePath.endsWith('.jsonl') ? {records: body.split('\n').filter(line => line.trim()).map(line => JSON.parse(line))} : {})};
  }).sort((a,b) => {
    const rank = doc => priority.includes(doc.path) ? priority.indexOf(doc.path) : priority.length;
    return rank(a)-rank(b) || a.title.localeCompare(b.title) || a.path.localeCompare(b.path);
  });
  return {schema: 'writing-rulebook/v1', revision: index.revision, documents,
    amendmentsId: documents.find(doc => doc.path === amendmentsPath)?.id,
    registry: {path: registryPath, body: registryBody, sourceSha256: sha256(registryBody),
      sourceUrl: ruleSourceUrl(index.revision,registryPath), rules: currentRules,
      retired: registry.rules.filter(rule => rule.tier === 'retired')},
    superseded: index.sources.filter(source => source.kind === 'rule' && source.status === 'superseded')
      .map(source => ({path: source.path, title: source.title, sourceUrl: ruleSourceUrl(index.revision,source.path)}))};
}
