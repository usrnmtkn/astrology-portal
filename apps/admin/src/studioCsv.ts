/** Shared CSV contract. No browser, storage, or provider dependencies. */
import { isDynamicTransitNatalLibraryKey } from "../../web/src/content/transitNatalIdentity.js";
import { decodeCsvCell, quoteCsvCell } from '../../../src/shared/csvText.js';
export type CsvContentRow = {
  id: string; content_key: string; updated_at?: string | null; event_type?: string | null;
  block_type?: string | null; status: string; headline?: string | null; summary?: string | null;
  body?: string | null; sections?: unknown; source_snapshot?: Record<string, unknown> | null;
  inventory_only?: boolean;
  target_date?: string | null; facts?: unknown;
};
export type CsvRecord = Record<string, string>;
export const csvFormat = 'content-studio-csv/v1';
export const csvIdentityColumns = ['format', 'content_id', 'content_key', 'saved_version', 'content_type'];
export const csvContextColumns = ['source_role', 'saved_status', 'publication_status', 'publication_detail', 'target_date', 'valid_from', 'valid_to', 'validity_note', 'reference_date', 'reader_url', 'reader_link_detail', 'exported_at'];
export const csvMaxBytes = 10 * 1024 * 1024;
export const csvMaxRows = 5000;
export function csvRetainsTransitAlternate(record: CsvRecord): boolean {
  const authored = (record.primary_owner_authored ?? '').trim().toLowerCase();
  if (!['', 'yes', 'no'].includes(authored)) throw new Error('The primary_owner_authored column accepts yes or no.');
  if (authored === 'yes' && !/^thread:[a-f0-9-]{36}$/u.test(record.owner_source_uri ?? '')) throw new Error('Owner authorship requires its exact source thread.');
  const value = (record.keep_current_as_alternate ?? '').trim().toLowerCase();
  if (!['', 'yes', 'no'].includes(value)) throw new Error('The keep_current_as_alternate column accepts yes or no.');
  if (value === 'yes' && !record.content_key.startsWith('authored/transit-aspect/')) throw new Error('Only personal transit aspect rows support an alternate.');
  return value === 'yes';
}
export function csvWantsPublication(record: CsvRecord): boolean {
  const value = (record.publish ?? '').trim().toLowerCase();
  if (!['', 'yes', 'no'].includes(value)) throw new Error('The publish column accepts yes or no. Leave it blank to save a draft.');
  return value === 'yes';
}
const copyFields = ['headline', 'summary', 'body', 'body_you', 'body_they', 'text', 'fact_line', 'opening', 'tension', 'development', 'close'];
const object = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const safePath = (path: string) => path.split('.').every(part => /^[a-zA-Z0-9_-]+$/.test(part) && !['__proto__', 'prototype', 'constructor'].includes(part));
const at = (value: unknown, path: string): unknown => path.split('.').reduce<any>((current, key) => current?.[key], value);
function put(value: Record<string, any>, path: string, text: string) {
  if (!safePath(path)) throw new Error('Invalid text field.');
  const parts = path.split('.');
  let target = value;
  for (const key of parts.slice(0, -1)) target = target[key] ??= {};
  target[parts.at(-1)!] = text;
}
export const csvContentType = (row: CsvContentRow) => row.event_type || row.block_type || 'content';
export function csvUnavailableReason(row: CsvContentRow): string | null {
  if (row.id.startsWith('package:') || !row.updated_at) return 'Save this source in Studio before exporting it.';
  if (row.status === 'ARCHIVED') return 'Archived rows cannot be edited through CSV.';
  if (/^(studio-lunation|studio-variable|studio-writing-profile|studio-daily|studio-lunar)\//.test(row.content_key)) return 'Use this item’s dedicated writing workspace.';
  const sections = object(row.sections);
  if (sections.skyArticleEdition || sections.horoscopeEdition || sections.articleHoroscopes) return 'This structured edition requires its dedicated editor.';
  return null;
}
type Field = { column: string; path: string; value: string; package: boolean; section?: boolean };
export function csvTextFields(row: CsvContentRow): Field[] {
  const sections = object(row.sections);
  const base = object(sections.packageRecord);
  const record = { ...base, ...object(sections.packageDraft) };
  if (Object.keys(base).length) {
    const declared = Array.isArray(base.studio_editable_fields) ? base.studio_editable_fields.map((field: any) => field?.path).filter((path: unknown): path is string => typeof path === 'string' && safePath(path)) : [];
    // Explicit Studio definitions take precedence over generated reader mirrors.
    const paths = declared.length ? declared : copyFields.filter(key => typeof record[key] === 'string');
    if (row.content_key.startsWith('authored/transit-aspect/')) for (const field of ['body_you', 'body_they']) if (!paths.includes(field)) paths.push(field);
    if (record.render_policy === 'sky-placement-continuous-v2' && !declared.length) {
      for (const field of ['body', 'body_you']) { const index = paths.indexOf(field); if (index >= 0) paths.splice(index, 1); }
    }
    return [...new Set(paths)].filter(path => typeof at(record, path) === 'string' || row.content_key.startsWith('authored/transit-aspect/') && ['body_you', 'body_they'].includes(path)).map(path => ({ column: path === 'headline' ? 'title' : path, path, value: (typeof at(record, path) === 'string' ? at(record, path) : sections[path] ?? (path === 'body_you' ? row.body : '') ?? '') as string, package: true }));
  }
  const fields: Field[] = ['headline', 'summary', 'body'].map(path => ({ column: path === 'headline' ? 'title' : path, path, value: String(at(row, path) ?? ''), package: false }));
  const addSection = (path: string, column: string) => {
    const value = at(row.sections, path);
    if (typeof value === 'string') fields.push({ column, path, value, package: false, section: true });
  };
  addSection('intro', 'intro');
  const blocks = Array.isArray(row.sections) ? row.sections : sections.blocks;
  if (Array.isArray(blocks)) blocks.forEach((block, index) => {
    for (const key of ['heading', 'body', 'content']) if (typeof block?.[key] === 'string') {
      addSection(`${Array.isArray(row.sections) ? '' : 'blocks.'}${index}.${key}`, `section_${index + 1}_${key}`);
    }
  });
  // These documents render their structured passages. The top body is a mirror.
  if (fields.some(field => field.section)) fields.splice(fields.findIndex(field => field.path === 'body' && !field.section), 1);
  return fields;
}
export function csvRecordForRow(row: CsvContentRow, context?: CsvRecord): CsvRecord {
  const unavailable = csvUnavailableReason(row);
  if (unavailable) throw new Error(unavailable);
  if (row.inventory_only) throw new Error('Load the complete saved document before exporting.');
  const fields = csvTextFields(row);
  if (!fields.length) throw new Error('This source has no supported editable text fields.');
  return Object.fromEntries([
    ['format', csvFormat], ['content_id', row.id], ['content_key', row.content_key],
    ['saved_version', `v:${row.updated_at}`], ['content_type', csvContentType(row)], ['publish', 'no'],
    ...(context ? csvContextColumns.map(column => [column, context[column] ?? '']) : []),
    ...(row.content_key.startsWith('authored/transit-aspect/') ? [['keep_current_as_alternate', 'no'], ['primary_owner_authored', 'no'], ['owner_source_uri', '']] : []),
    ...fields.map(field => [field.column, field.value]),
  ]);
}
export function writeStudioCsv(records: CsvRecord[]): string {
  if (!records.length) throw new Error('No saved rows match this export.');
  if (records.length > csvMaxRows) throw new Error(`Export up to ${csvMaxRows} rows at a time.`);
  if (new Set(records.map(row => row.content_type)).size !== 1) throw new Error('Export one content type at a time.');
  const columns = [...csvIdentityColumns, ...new Set(records.flatMap(row => Object.keys(row).filter(key => !csvIdentityColumns.includes(key))))];
  const line = (values: string[]) => values.map(quoteCsvCell).join(',');
  const csv = '\uFEFF' + [line(columns), ...records.map(record => line(columns.map(column => record[column] ?? '')))].join('\r\n') + '\r\n';
  if (new TextEncoder().encode(csv).length > csvMaxBytes) throw new Error('Export fewer rows; CSV files are limited to 10 MB.');
  return csv;
}
export function readStudioCsv(input: string): CsvRecord[] {
  if (new TextEncoder().encode(input).length > csvMaxBytes) throw new Error('CSV files are limited to 10 MB.');
  const text = input.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false, closed = false;
  const endCell = () => { row.push(decodeCsvCell(cell)); cell = ''; closed = false; };
  const endRow = () => { endCell(); if (row.some(value => value !== '')) rows.push(row); row = []; if (rows.length > csvMaxRows + 1) throw new Error(`Import up to ${csvMaxRows} rows at a time.`); };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === ',') endCell();
    else if (char === '\r' || char === '\n') { endRow(); if (char === '\r' && text[i + 1] === '\n') i++; }
    else if (char === '"' && !cell && !closed) quoted = true;
    else { if (closed || char === '"') throw new Error('Invalid CSV quoting. Save the file as comma-separated UTF-8 CSV.'); cell += char; }
  }
  if (quoted) throw new Error('An unfinished quoted field was found in the CSV.');
  if (cell || row.length || closed) endRow();
  const columns = rows.shift();
  if (!columns || !rows.length) throw new Error('The CSV has no content rows.');
  if (new Set(columns).size !== columns.length || columns.some(column => !safePath(column))) throw new Error('CSV column names must be unique and unchanged.');
  if (rows.some(values => values[columns.indexOf('format')] === 'content-studio-reader-csv/v1')) throw new Error('Reader exports are read-only. Use Export sources for bulk editing to prepare an import.');
  if (csvIdentityColumns.some(column => !columns.includes(column))) throw new Error('Use a CSV exported by Content Studio. Keep all identity columns.');
  const records = rows.map((values, index) => {
    if (values.length !== columns.length) throw new Error(`CSV row ${index + 2} has the wrong number of columns.`);
    const record = Object.fromEntries(columns.map((column, i) => [column, values[i]]));
    if (record.format !== csvFormat || !record.content_id || !record.content_key || !record.saved_version.startsWith('v:')) throw new Error(`CSV row ${index + 2} has invalid identity fields.`);
    csvWantsPublication(record);
    csvRetainsTransitAlternate(record);
    return record;
  });
  if (new Set(records.map(record => record.content_id)).size !== records.length) throw new Error('Each content ID may appear only once. Remove duplicate rows.');
  if (new Set(records.map(record => record.content_type)).size !== 1) throw new Error('Import one content type at a time.');
  return records;
}
export function csvChanges(row: CsvContentRow, imported: CsvRecord) {
  csvWantsPublication(imported);
  csvRetainsTransitAlternate(imported);
  if (JSON.stringify(imported).length > 2_000_000) throw new Error('This row exceeds the 2 MB import limit. Edit it in Studio.');
  const current = csvRecordForRow(row);
  for (const column of csvIdentityColumns) {
    if (current[column] !== imported[column]) throw new Error(column === 'saved_version' ? 'Changed in Studio since export. Export this row again before editing.' : `The ${column} does not match the saved row.`);
  }
  const fields = csvTextFields(row);
  if (fields.some(field => !Object.hasOwn(imported, field.column))) throw new Error('An editable column is missing. Keep the exported columns.');
  for (const column of Object.keys(imported)) {
    if (csvContextColumns.includes(column)) continue;
    if (!Object.hasOwn(current, column) && imported[column] !== '') throw new Error(`The field ${column} is not editable for this row.`);
  }
  return fields.filter(field => field.value !== imported[field.column]).map(field => ({ ...field, before: field.value, after: imported[field.column] }));
}
export function csvDraftPatch(row: CsvContentRow, imported: CsvRecord) {
  const changes = csvChanges(row, imported);
  if (!changes.length) throw new Error('This CSV row has no text changes.');
  const patch: Record<string, any> = { status: 'DRAFT', ...(csvRetainsTransitAlternate(imported) ? { preserveCurrentTransitAsAlternate: true } : {}) };
  const sections = structuredClone(row.sections ?? {}) as Record<string, any>;
  if (changes.some(field => field.package)) {
    const proposal = { ...structuredClone(object(sections.packageRecord)), ...structuredClone(object(sections.packageDraft)) };
    for (const field of changes) put(proposal, field.path, field.after);
    sections.packageDraft = proposal;
    patch.reviewStatus = 'needs_review';
  } else for (const field of changes) {
    if (field.section) put(sections, field.path, field.after);
    else patch[field.path] = field.after;
  }
  if (sections && typeof sections === 'object' && !Array.isArray(sections)) sections.contentStudioReview = null;
  if (sections && typeof sections === 'object') patch.sections = sections;
  return patch;
}

/** New rows have a narrow, explicit identity and are always saved as drafts first. */
export function newTransitCsvRow(record: CsvRecord): CsvContentRow {
  if (record.content_id !== `new:${record.content_key}` || record.saved_version !== 'v:new'
    || record.content_type !== 'transit-to-natal-aspect' || !isDynamicTransitNatalLibraryKey(record.content_key)) throw new Error('Invalid new personal transit row.');
  if (csvRetainsTransitAlternate(record)) throw new Error('A new row has no current wording to retain.');
  return { id: record.content_id, content_key: record.content_key, updated_at: 'new', status: 'DRAFT',
    event_type: 'transit-to-natal-aspect', headline: '', body: '',
    sections: { packageRecord: { contentKey: record.content_key, content_role: 'full_copy',
      reader_only: true, render_policy: 'personal-transit-exact-v1', review_status: 'needs_review',
      headline: '', body: '', body_you: '', body_they: '' } } };
}

export function csvCreateTransitBody(record: CsvRecord) {
  const row = newTransitCsvRow(record);
  const patch = csvDraftPatch(row, record);
  const source = patch.sections.packageDraft;
  if ((record.primary_owner_authored ?? '').trim().toLowerCase() === 'yes') { source.owner_authored = true; source.body_you_authorship = 'owner_authored'; source.body_they_authorship = 'owner_authored'; }
  return { contentKey: row.content_key, surface: 'you', mode: 'feed', eventType: row.event_type,
    blockType: 'fallback_hook', status: 'DRAFT', provider: 'tldrastro-fallback-architecture-v3',
    headline: source.headline, body: source.body_you, sections: { packageRecord: source },
    facts: { fallbackArchitectureV3: true }, sourceSnapshot: { sourcePackage: 'tldrastro-fallback-architecture-v3',
      editorialImport: { schema: 'content-studio-csv-create/v1', imported: record } } };
}
