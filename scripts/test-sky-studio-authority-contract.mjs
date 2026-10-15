import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { assertSkyStudioAuthority } from './lib/assert-sky-studio-authority.mjs';

const app = fs.readFileSync('apps/web/src/App.tsx', 'utf8');
const calendar = fs.readFileSync('apps/web/src/features/calendar/LunarCalendar.tsx', 'utf8');
assertSkyStudioAuthority(app, calendar);
const mutations = [
  ['Sky signed priority', 'app', 'signedStudio ?? (options ? resolveSkyAspectContentStudioExact(options) : null)', '(options ? resolveSkyAspectContentStudioExact(options) : null) ?? signedStudio'],
  ['Sky signed tier', 'app', 'tier: signedStudio ? "content-studio-signed-sky-aspect-v1" : "content-studio-exact-sky-aspect-v1"', 'tier: "content-studio-exact-sky-aspect-v1"'],
  ['Sky canonical precedence', 'app', '  if (studio) {', '  if (studio) {'],
  ['Calendar signed priority', 'calendar', 'exact: signedStudio ?? studioExact ?? exact', 'exact: studioExact ?? signedStudio ?? exact'],
  ['Calendar canonical priority', 'calendar', 'exact: signedStudio ?? studioExact ?? exact', 'exact: exact ?? signedStudio ?? studioExact'],
  ['Calendar signed provenance', 'calendar', 'contentType === "owner-authored-sky-aspect"', 'contentType === "unverified"'],
  ['Calendar exact tier', 'calendar', 'tier: "content-studio-exact-sky-aspect-v1"', 'tier: "canonical"']
];
for (const [label, target, before, after] of mutations) {
  const source = target === 'app' ? app : calendar;
  assert.ok(source.includes(before), `${label}: mutation must change actual source`);
  const start = source.indexOf(target === 'app' ? 'function approvedExactSkyAspectWritingSection(' : 'export function normalizeCalendarEventSurface(');
  const prefix = source.slice(0, start);
  const scoped = source.slice(start);
  assert.ok(scoped.includes(before), `${label}: mutation must reach the authority builder`);
  let changed = prefix + scoped.replace(before, after);
  if (label === 'Sky canonical precedence') {
    const studioStart = source.indexOf('  if (studio) {', start);
    const canonicalStart = source.indexOf('  const registry = contentRegistryFor("sky");', studioStart);
    const builderEnd = source.indexOf('\n}\n\nfunction reviewedSkyAspectWritingSection(', canonicalStart);
    assert.ok(studioStart > start && canonicalStart > studioStart && builderEnd > canonicalStart);
    changed = source.slice(0, studioStart) + source.slice(canonicalStart, builderEnd)
      + '\n\n' + source.slice(studioStart, canonicalStart) + source.slice(builderEnd);
  }
  assert.notEqual(changed, source, `${label}: source must change`);
  const end = changed.indexOf(target === 'app' ? '\nfunction reviewedSkyAspectWritingSection(' : '\nfunction calendarCanonicalEventDateLine(', start);
  const syntax = ts.transpileModule(changed.slice(start, end), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: 'authority-mutant.tsx', reportDiagnostics: true
  });
  assert.deepEqual(syntax.diagnostics.filter(item => item.category === ts.DiagnosticCategory.Error), [], `${label}: mutant must be syntactically valid TypeScript`);
  assert.throws(() => assertSkyStudioAuthority(target === 'app' ? changed : app, target === 'calendar' ? changed : calendar), { name: 'AssertionError' }, label);
}
console.log(`Sky/Calendar authority builders passed; ${mutations.length} precedence/tier/provenance mutations rejected.`);
