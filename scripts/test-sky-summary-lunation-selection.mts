import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { daySurfaceEvents } from '../apps/web/src/features/calendar/calendarSurfaceEvents.ts';

const source = readFileSync('apps/web/src/App.tsx', 'utf8');
const ast = ts.createSourceFile('App.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(ast.parseDiagnostics.length, 0);
const names = ['todayLunation', 'event', 'selectedDate', 'eventDate', 'validEvent', 'eventIsToday', 'exactEventKey'];
const declarations = new Map<string, ts.VariableDeclaration>();
function visit(node: ts.Node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'SkyCards') {
    const walk = (child: ts.Node) => {
      if (ts.isVariableDeclaration(child) && ts.isIdentifier(child.name) && names.includes(child.name.text)) {
        assert(!declarations.has(child.name.text)); declarations.set(child.name.text, child);
      }
      ts.forEachChild(child, walk);
    };
    walk(node);
  } else ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(declarations.size, names.length);
const selection = names.map(name => `const ${declarations.get(name)!.getText(ast)};`).join('\n');
const runnable = ts.transpileModule(selection + '\n({ todayLunation, event, exactEventKey });', {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
}).outputText;
const dateKey = '2026-10-18';
const future = { name: 'Full Moon', sign: 'Taurus', occursAt: '2026-10-26T04:12:00Z' };
const event = (name: string, primary?: boolean, eclipseType?: string) => ({
  id: name, type: 'lunation', title: `${name} in Capricorn`, primary, eclipseType,
  sign: 'Capricorn', startsAt: '2026-10-18T16:12:00Z', dateKey, glyph: ''
});
function select(events: any[], moonEvent: any = future) {
  const original = JSON.stringify(events);
  const result = vm.runInNewContext(runnable, { Date, Intl, events,
    sky: { generatedAt: '2026-10-18T12:00:00Z', moonEvent }, timeZone: 'America/New_York', dayKey: dateKey, requestKey: 'same-selected-sky' });
  assert.equal(JSON.stringify(events), original, 'Selection never changes shared Calendar events.');
  return result;
}
for (const name of ['First Quarter Moon', 'Last Quarter Moon']) {
  const quarter = event(name, false), events = [quarter];
  const result = select(events);
  assert.equal(result.todayLunation, undefined, 'Quarter phases cannot enter the New/Full exact-placement path.');
  assert.equal(result.event, future, 'A quarter does not mask the next actual primary lunation.');
  assert.equal(result.exactEventKey, '', 'A quarter day alone must not start an event-time core request.');
  assert.equal(select(events, null).event, null);
  const calendar = daySurfaceEvents({ dateKey, events } as any);
  assert(calendar.includes(quarter), 'The original quarter event remains available in the Calendar day.');
  for (const primary of [event('New Moon'), event('Full Moon'), event('New Moon Solar Eclipse', true, 'solar'), event('Full Moon Lunar Eclipse', true, 'lunar')]) {
    const mixed = select([quarter, primary]);
    assert.equal(mixed.todayLunation, primary);
    assert.equal(mixed.event.occursAt, primary.startsAt);
    assert(mixed.exactEventKey.includes(primary.startsAt));
  }
}
for (const [name, eclipseType, expectedName] of [
  ['New Moon', undefined, 'New Moon'], ['Full Moon', undefined, 'Full Moon'],
  ['New Moon Solar Eclipse', 'solar', 'New Moon'], ['Full Moon Lunar Eclipse', 'lunar', 'Full Moon']
] as const) {
  for (const primary of [true, undefined]) {
    const actual = event(name, primary, eclipseType);
    const result = select([actual]);
    assert.equal(result.todayLunation, actual);
    assert.equal(result.event.name, expectedName);
    assert.equal(result.event.eclipseType, eclipseType);
    assert(result.exactEventKey.includes(actual.startsAt), 'Actual primary events retain their required exact-time calculation.');
  }
}
console.log('PASS: actual SkyCards quarter/primary selection, next-primary fallback, no quarter exact request, eclipse/legacy primary admission, and unchanged Calendar quarter events.');
