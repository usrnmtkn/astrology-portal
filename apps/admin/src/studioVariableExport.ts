import type { StudioVariable } from './studioVariableCatalog';
import type { CustomVariable } from './studioCustomVariableClient';
import {quoteCsvCell} from '../../../src/shared/csvText';
// @ts-ignore Shared deterministic reference validation used by the actual reader.
import {resolveIngressSource} from '../../web/src/content/fallbackArchitectureV3/resolver/skyIngressComposition.mjs';

export type VariableExportRow = {
  token: string; type: string; description: string; availableIn: string; allowedFields: string; provider: string; reference: string;
  sourceKey: string; field: string; version: string; audience: string; contentStatus: string; content: string; updatedAt: string;
};
export const variableExportColumns: Array<[keyof VariableExportRow, string]> = [
  ['token', 'Variable'], ['type', 'Type'], ['description', 'Meaning'], ['availableIn', 'Available in'],
  ['allowedFields', 'Allowed template fields'], ['reference', 'Shared source reference'],
  ['provider', 'Provider'], ['sourceKey', 'Source'], ['field', 'Field'], ['version', 'Version'],
  ['audience', 'Audience or override'], ['contentStatus', 'Content status'], ['content', 'Content'], ['updatedAt', 'Saved at']
];
const atPath = (record: any, field: string) => field.split('.').reduce((value, key) => value?.[key], record);

export function packVariableExportRows(rows: VariableExportRow[]) {
  const fieldContracts = [...new Set(rows.map(row => row.allowedFields))];
  const ids = new Map(fieldContracts.map((contract, index) => [contract, index]));
  return {fieldContracts, rows: rows.map(({allowedFields, ...row}) => ({...row, fieldContract: ids.get(allowedFields)!}))};
}

export function expandVariableExportRows(page: {rows: any[]; fieldContracts?: unknown}): VariableExportRow[] {
  if (page.fieldContracts === undefined) return page.rows;
  if (!Array.isArray(page.fieldContracts) || page.fieldContracts.some(contract => typeof contract !== 'string')) throw new Error('The variable export field contracts are incomplete.');
  const contracts = page.fieldContracts;
  return page.rows.map(({fieldContract, ...row}) => {
    if (!Number.isInteger(fieldContract) || typeof contracts[fieldContract] !== 'string') throw new Error('The variable export field contracts are incomplete.');
    return {...row, allowedFields: contracts[fieldContract]} as VariableExportRow;
  });
}

export function studioVariableExportRows(variables: StudioVariable[], records: Map<string, any>, savedRows: any[], custom: CustomVariable[] = [], includeCalculated = true): VariableExportRow[] {
  const rows: VariableExportRow[] = [];
  const savedVersions = new Map<string, Map<string, any>>();
  for (const row of [...savedRows].filter(row => row.status !== 'ARCHIVED').sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))) {
    const versions = savedVersions.get(row.content_key) ?? new Map<string, any>();
    const version = row.sections?.packageDraft ? 'Saved draft' : `Saved ${String(row.status).toLowerCase()}`;
    if (!versions.has(version)) versions.set(version, row);
    savedVersions.set(row.content_key, versions);
  }
  const effectiveRecord = (key: string, version: string) => {
    const baseline = records.get(key);
    const row = savedVersions.get(key)?.get(version);
    if (!row) return baseline;
    const mirrors = !row.sections?.packageRecord && !row.sections?.packageDraft
      ? Object.fromEntries(['headline', 'summary', 'body'].filter(field => typeof row[field] === 'string').map(field => [field, row[field]])) : {};
    return {...baseline, ...mirrors, ...row.sections?.packageRecord, ...row.sections?.packageDraft};
  };
  const referenceRecords = new Map<string, any[]>();
  const recordsForVersion = (version: string) => {
    if (!referenceRecords.has(version)) referenceRecords.set(version, [...new Set([...records.keys(), ...savedVersions.keys()])].map(key => effectiveRecord(key, version)).filter(Boolean));
    return referenceRecords.get(version)!;
  };
  for (const variable of variables) {
    const base = { token: variable.token, type: variable.retired ? 'Retired variable' : variable.token.includes('{{#') ? 'Condition' : variable.kind === 'readonly' ? 'Calculated or assembled value' : 'Saved writing',
      description: variable.description, availableIn: [...new Set(variable.usages.map(usage => usage.surface))].join(', '),
      allowedFields: variable.usages.map(usage => `${usage.key}: ${usage.fields?.length ? usage.fields.join(', ') : 'Resolver dependency; no direct insertion field'}${usage.retired ? ' (retired)' : ''}`).join('\n'),
      provider: variable.source, reference: '' };
    if (!variable.sources.length) {
      if (includeCalculated) rows.push({ ...base, sourceKey: '', field: '', version: 'Context-dependent example', audience: '', contentStatus: variable.retired ? 'Retired; no active runtime provider' : 'Calculated for the selected context', content: variable.example ?? '', updatedAt: '' });
      continue;
    }
    for (const source of variable.sources) {
      const baseline = records.get(source.key);
      const versions = savedVersions.get(source.key) ?? new Map<string, any>();
      const values: Array<{ record: any; version: string; updatedAt: string; legacyBody?: boolean }> = [];
      if (baseline) values.push({ record: baseline, version: 'Package', updatedAt: '' });
      for (const [version, row] of versions) values.push({ record: effectiveRecord(source.key, version), version, updatedAt: row.updated_at ?? '',
        legacyBody: !row.sections?.packageRecord && !row.sections?.packageDraft && typeof row.body === 'string' });
      if (!values.length) rows.push({ ...base, sourceKey: source.key, field: source.field, version: 'No saved value', audience: '', contentStatus:'Empty', content: '', updatedAt: '' });
      for (const value of values) {
        const explicitVoices = variable.sources.some(item => item.key === source.key && ['body_you', 'body_they'].includes(item.field));
        const fields = source.field === 'body' && !explicitVoices && (value.record.body_you != null || value.record.body_they != null)
          ? ['body_you', 'body_they'] : [source.field];
        // Older saved rows carry a single body instead of a package proposal.
        // Export that real field once; do not relabel it as an audience variant.
        if (value.legacyBody && source === variable.sources.find(item => item.key === source.key) && !fields.includes('body')
          && !variable.sources.some(item => item !== source && item.key === source.key && item.field === 'body')) fields.push('body');
        for (const field of fields) {
          const raw = atPath(value.record, field) ?? (field === 'body_you' || field === 'body_they' ? value.record.body : undefined);
          const resolved = raw?.reference && field.startsWith('ingress.sources.')
            ? resolveIngressSource(value.record, field.slice('ingress.sources.'.length), recordsForVersion(value.version)) : null;
          const content = resolved ? resolved.text ?? '' : typeof raw === 'string' ? raw : typeof raw?.text === 'string' ? raw.text : raw == null ? '' : JSON.stringify(raw);
          rows.push({ ...base, sourceKey: source.key, field, version: value.version,
            reference: raw?.reference ? JSON.stringify(raw.reference) : '',
            audience: field.endsWith('_you') ? 'You' : field.endsWith('_they') ? 'They' : 'Shared', contentStatus: resolved?.reason ? `Unresolved reference: ${resolved.reason}` : content ? 'Has content' : 'Empty', content, updatedAt: value.updatedAt });
        }
      }
    }
  }
  for (const variable of custom) {
    const base = { token: `{{${variable.name}}}`, type: 'My variable', description: variable.description,
      availableIn: 'Editors with My variables', allowedFields: 'Fields supporting My variables', reference: '', provider: variable.label, sourceKey: `studio-variable/${variable.name.toLowerCase()}`,
      version: 'Saved custom value', updatedAt: variable.updatedAt };
    rows.push({ ...base, field: 'value', audience: 'Shared', contentStatus:variable.value?'Has content':'Empty', content: variable.value });
    for (const override of variable.overrides) rows.push({ ...base, field: 'overrides',
      audience: [override.scope, override.planet, override.sign].filter(Boolean).join(' / '), contentStatus:override.value?'Has content':'Empty', content: override.value });
  }
  return rows;
}

export function studioVariableExportCsv(rows: VariableExportRow[]) {
  return '\uFEFF' + [variableExportColumns.map(([, label]) => label), ...rows.map(row => variableExportColumns.map(([key]) => row[key]))]
    .map(row => row.map(quoteCsvCell).join(',')).join('\r\n');
}
