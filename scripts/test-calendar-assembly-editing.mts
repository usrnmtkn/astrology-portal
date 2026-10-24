import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarTemplateParts, moveCalendarSection, insertCalendarVariable } from '../apps/admin/src/calendarPassageTemplateParts';
import { renderCalendarPassage } from '../src/shared/features/calendar/calendarPassageTemplates';
import { variableLabel, variableMatches } from '../apps/admin/src/variablePresentation';
import { filterStudioVariables, matchingVariableSources, type StudioVariable } from '../apps/admin/src/studioVariableCatalog';

test('a readable-name search finds the variable without hiding its writing sources', () => {
  const variable: StudioVariable = { id: 'fixture-variable', name: 'moonWriteup', token: '{{moonWriteup}}', kind: 'editable',
    description: 'Full lunar writing.', source: 'Lunar writing', usages: [{ key: 'fixture/template', label: 'Daily', surface: 'calendar' }],
    sources: [{ key: 'source/a', label: 'Source Alpha', field: 'body' }, { key: 'source/b', label: 'Source Beta', field: 'body' }] };
  assert.deepEqual(filterStudioVariables([variable], 'moon passage', 'editable', 'calendar'), [variable]);
  assert.deepEqual(matchingVariableSources(variable, 'moon passage'), variable.sources);
  assert.deepEqual(matchingVariableSources(variable, 'moon passage source alpha'), [variable.sources[0]]);
});

test('readable labels and searches keep the canonical token identity', () => {
  assert.equal(variableLabel('planetTitle'), 'Planet name');
  assert.equal(variableLabel('aspectsWhileRetrograde'), 'Aspects While Retrograde');
  assert.equal(variableMatches('{{planetTitle}} name', 'planetTitle', variableLabel('planetTitle')), true);
  assert.equal(variableMatches('moon phase', 'moonPhase', variableLabel('moonPhase')), true);
  assert.equal(variableMatches('unknown', 'planetTitle', variableLabel('planetTitle')), false);
});
test('fact insertion replaces selection; conditions preserve and select their complete wording', () => {
  const value = 'Before selected complete wording. After';
  const end = value.indexOf(' After');
  const start = value.indexOf('selected');
  assert.equal(insertCalendarVariable(value, 'moonSign', start, end).value, 'Before {{moonSign}} After');
  const conditional = insertCalendarVariable(value, 'hasFullMoon', start, end);
  assert.equal(conditional.value, 'Before {{#hasFullMoon}}selected complete wording.{{/hasFullMoon}} After');
  assert.equal(conditional.value.slice(conditional.start, conditional.end), 'selected complete wording.');
});
test('nested and repeated conditions render complete wording with the actual Calendar renderer', () => {
  const value = '{{#moonWriteup}}Complete opening. {{#hasFullMoon}}Full {{moonSign}} wording. {{#hasFullMoon}}Nested ending.{{/hasFullMoon}}{{/hasFullMoon}} Complete ending.{{/moonWriteup}}';
  const values = { moonWriteup: { text: 'Saved source', kind: 'copy' as const }, moonSign: { text: 'Aries', kind: 'fact' as const } };
  assert.equal(renderCalendarPassage(value, values), 'Complete opening.  Complete ending.');
  assert.equal(renderCalendarPassage(value, { ...values, hasFullMoon: { text: 'yes', kind: 'fact' } }), 'Complete opening. Full Aries wording. Nested ending. Complete ending.');
  assert.equal(renderCalendarPassage(value, {}), null);
  assert.equal(renderCalendarPassage(value + '{{/hasFullMoon}}', values), null);
});

const sun = '{{#sunSummary}}Complete Sun opening.\n\n{{sunSummary}} Complete Sun ending.{{/sunSummary}}';
const moon = '{{#moonWriteup}}Complete Moon opening. {{#hasFullMoon}}{{fullMoonDate}}{{/hasFullMoon}} Complete Moon ending.{{/moonWriteup}}';
test('moving Calendar sections preserves intact nested blocks, whitespace, and outside wording', () => {
  const template = `Intro\n${sun}\n\n---\n\n${moon}\nEnd`;
  const sections = calendarTemplateParts(template).sections;
  assert.deepEqual(sections.map(section => [section.name, section.depth]), [['sunSummary', 0], ['moonWriteup', 0], ['hasFullMoon', 1]]);
  const moved = moveCalendarSection(template, sections[1].from, -1);
  assert.equal(moved, `Intro\n${moon}\n\n---\n\n${sun}\nEnd`);
  assert.equal(moveCalendarSection(moved, calendarTemplateParts(moved).sections[0].from, 1), template);
});
test('nested blocks, boundaries, unknown variables, and malformed templates cannot be moved', () => {
  const value = `${sun}\n\n${moon}`;
  const sections = calendarTemplateParts(value).sections;
  assert.equal(moveCalendarSection(value, sections[0].from, -1), value);
  assert.equal(moveCalendarSection(value, sections[1].from, 1), value);
  assert.equal(moveCalendarSection(value, sections[2].from, -1), value);
  for (const invalid of [value + '{{unknown}}', value + '{{#sunSummary}}', value + '{{/moonWriteup}}']) {
    assert.equal(moveCalendarSection(invalid, 0, 1), invalid);
  }
});
test('repeated section names are addressed by position without losing literal characters', () => {
  const second = sun.replaceAll('Complete Sun', 'Second complete Sun');
  const template = `${sun}\n\n${second}`;
  const sections = calendarTemplateParts(template).sections;
  assert.equal(moveCalendarSection(template, sections[1].from, -1), `${second}\n\n${sun}`);
  assert.equal(calendarTemplateParts(template).parts.map(part => part.text).join(''), template);
});
