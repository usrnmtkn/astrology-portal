import { readFileSync, writeFileSync } from 'node:fs';
import semantics from '../src/astro-writing/transitNatalSemantics.cjs';
import { meaningHash, retrievePersonalTransitMeaningSources, assertPersonalTransitMeaningRecord } from '../src/astro-writing/personalTransitMeaningRecords.mjs';

// Inventory source coverage without inventing meanings or promoting approved
// serving prose into factual or preferred-voice authority.
const [catalogPath, sourcesPath, outputPath] = process.argv.slice(2);
if (!outputPath) throw Error('Usage: audit-personal-transit-writing-sources.mjs private-catalog.json private-writing-sources.json new-private-output.json');
const bytes = readFileSync(catalogPath, 'utf8'), catalog = JSON.parse(bytes);
const sourceBytes = readFileSync(sourcesPath, 'utf8'), sources = JSON.parse(sourceBytes);
if (!Array.isArray(catalog) || new Set(catalog.map(row => row.contentKey)).size !== catalog.length) throw Error('UNIQUE_CATALOG_REQUIRED');
const records = catalog.map(row => {
  const [,,transiting,natal,aspect] = row.contentKey.split('/');
  const packet = semantics.resolveTransitNatalSemantics({ transiting, natal, aspect });
  const retrieval = retrievePersonalTransitMeaningSources(row.contentKey, packet);
  const meanings = sources.meanings.filter(meaning => meaning.contentKey === row.contentKey);
  if (meanings.length > 1) throw Error('CONFLICTING_MEANING_RECORDS');
  if (meanings[0]) assertPersonalTransitMeaningRecord(meanings[0], packet, { allowProposed: true });
  return { contentKey: row.contentKey,
    existingReaderText: ['body_you','body_they'].map(field => {
      if (typeof row[field] !== 'string' || !row[field].trim()) throw Error('COMPLETE_CATALOG_PASSAGE_REQUIRED');
      return { field, text: row[field], sha256: meaningHash(row[field]), ownerApproved: row.ownerApproved === true,
        meaningAuthorityInferred: false, preferredVoiceAuthorityInferred: false };
    }),
    meaning: meanings[0] ? { status: meanings[0].status, recordSha256: meanings[0].recordSha256 } : { status: 'preparation-required' },
    retrieval };
});
const report = { schema: 'personal-transit-source-coverage/v1', catalogPath, catalogSha256: meaningHash(bytes),
  sourcesPath, sourcesSha256: meaningHash(sourceBytes),
  totals: { contacts: records.length, readerPassages: records.length * 2,
    exactContactSources: records.filter(record => record.retrieval.mode === 'exact-contact').length,
    componentSources: records.filter(record => record.retrieval.mode === 'component-derived').length,
    preparedMeanings: records.filter(record => record.meaning.status !== 'preparation-required').length,
    reviewedMeanings: records.filter(record => record.meaning.status === 'owner-accepted').length },
  records, contentWrites: 0, providerCalls: 0,
  limitation: 'Source availability and existing prose approval do not establish that a new meaning is accurate or that a passage is a preferred voice example.' };
writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(report.totals));
