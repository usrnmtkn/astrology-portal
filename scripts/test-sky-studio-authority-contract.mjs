import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { assertSkyStudioAuthority } from './lib/assert-sky-studio-authority.mjs';

const sources = {
  app: fs.readFileSync('apps/web/src/App.tsx', 'utf8'),
  calendar: fs.readFileSync('apps/web/src/features/calendar/LunarCalendar.tsx', 'utf8'),
  shared: fs.readFileSync('apps/web/src/services/skyAspectReading.ts', 'utf8')
};
assertSkyStudioAuthority(sources.app, sources.calendar, sources.shared);
const mutations = [
  ['Sky shared selection', 'app', 'const selected = registry?.resolveSkyAspectReading?.({', 'const selected = registry?.otherReading?.({'],
  ['Calendar shared selection', 'calendar', 'const selected = resolveSkyAspectReading({', 'const selected = otherReading({'],
  ['Shared signed priority', 'shared', 'const studioSelected = signed ?? studio', 'const studioSelected = studio ?? signed'],
  ['Shared canonical priority', 'shared', 'const exact: SkyAspectReading | null = studioSelected', 'const exact: SkyAspectReading | null = null'],
  ['Shared signed tier', 'shared', 'tier: signed ? "content-studio-signed-sky-aspect-v1" : "content-studio-exact-sky-aspect-v1"', 'tier: "canonical"'],
  ['Shared full passage', 'shared', 'body: studioSelected.body', 'body: studioSelected.body.slice(0, 10)'],
  ['Shared source identity', 'shared', 'sourceKeys: [studioSelected.content.contentKey]', 'sourceKeys: ["unverified"]']
];
for (const [label, target, before, after] of mutations) {
  const source = sources[target];
  assert.ok(source.includes(before), `${label}: mutation must change actual source`);
  const changed = source.replace(before, after);
  const syntax = ts.transpileModule(changed, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: 'authority-mutant.tsx', reportDiagnostics: true
  });
  assert.deepEqual(syntax.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error), [], `${label}: mutant must be syntactically valid TypeScript`);
  const mutant = { ...sources, [target]: changed };
  assert.throws(() => assertSkyStudioAuthority(mutant.app, mutant.calendar, mutant.shared), { name: 'AssertionError' }, label);
}
console.log(`Sky/Calendar shared authority passed; ${mutations.length} selection/tier/provenance mutations rejected.`);
