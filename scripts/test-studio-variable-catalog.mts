import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { studioVariableCatalog } from './build-studio-variable-catalog.mts';
import { decodeStudioVariableCatalog, filterStudioVariables } from '../apps/admin/src/studioVariableCatalog.ts';
import { SKY_PLACEMENT_VARIABLES } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyPlacementVariables.mjs';
import { SKY_WRITING_LIBRARY_GROUPS } from '../apps/web/src/content/fallbackArchitectureV3/resolver/skyWritingLibraryRegistry.mjs';
import { skyDailySummaryFields } from '../apps/web/src/content/skyDailySummaryCatalog.ts';
const encoded = JSON.parse(await readFile('apps/admin/public/generated/studio-variables-v1.json', 'utf8'));
const {variables} = decodeStudioVariableCatalog(encoded);
assert.deepEqual(variables, studioVariableCatalog.variables, 'The shipped directory retains all contract metadata');
for (const {name} of SKY_PLACEMENT_VARIABLES) assert(variables.some(variable => variable.name === name && variable.kind === 'readonly'));
for (const group of SKY_WRITING_LIBRARY_GROUPS) for (const field of group.fields) assert(variables.some(variable => variable.name === field.id && variable.kind === 'editable' && variable.sources.length));
for (const field of skyDailySummaryFields) for (const name of field.allowedSlots) assert(variables.some(variable => variable.token === `{${name}}` && variable.usages.some(usage => usage.key === field.key)));
for (const name of ['zodiacSeason', 'zodiacSeasonPolarAxis']) {
  const result = filterStudioVariables(variables, `{{${name}}}`, 'editable', 'Natal');
  assert(result.some(variable => variable.name === name && variable.sources.length === 12));
  assert(result.some(variable => variable.usages.some(usage => usage.surface === 'Compatibility')));
}
assert(filterStudioVariables(variables, 'entryDate', 'readonly', 'Sky').some(variable => variable.name === 'entryDate'));
assert.equal(filterStudioVariables(variables, 'entryDate', 'editable', 'Sky').length, 0);
assert.equal(filterStudioVariables(variables, 'no-such-variable-fixture', '', '').length, 0);
assert(variables.filter(variable => variable.name === 'passEntryDate').every(variable => variable.usages.every(usage => !usage.key.endsWith('#placementArticle'))));
assert(variables.filter(variable => variable.kind === 'readonly').every(variable => variable.sources.length === 0));
assert.throws(() => decodeStudioVariableCatalog({...encoded, usages: []}), /incomplete/);
console.log(`PASS ${variables.length} variable definitions, contract coverage, source scopes, syntax, filters, and shipped catalog parity`);
