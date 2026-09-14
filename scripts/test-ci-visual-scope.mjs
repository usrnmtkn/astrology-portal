import assert from 'node:assert/strict';
import { affectedVisualSurfaces, changedFiles } from './ci-visual-scope.mjs';
const all = { reader: true, studio: true, friends: true, sky: true };
for (const file of ['apps/web/src/App.tsx', 'apps/web/src/main.tsx', 'apps/web/src/content/skyDailySummary.ts', 'apps/web/src/services/generatedContent.ts', 'apps/web/src/styles/theme.css', 'apps/web/src/components/Card.tsx', 'tests/helpers/sky.ts', 'package-lock.json', 'playwright.config.ts', 'packages/astro-knowledge/src/index.ts', 'api/_lib/content.ts', 'some-new-dependency.ts']) {
  assert.deepEqual(affectedVisualSurfaces([file]), all, file);
}
assert.equal(affectedVisualSurfaces(['apps/admin/src/studio-system.css']).sky, true);
assert.equal(affectedVisualSurfaces(['apps/admin/src/studio-system.css']).studio, true);
assert.equal(affectedVisualSurfaces(['apps/web/src/features/sky/SkyToday.tsx']).sky, true);
assert.equal(affectedVisualSurfaces(['apps/web/src/features/friends/Friends.tsx']).friends, true);
assert.deepEqual(affectedVisualSurfaces(['docs/qa/summary.md']), { reader: false, studio: false, friends: false, sky: false });
assert.deepEqual(affectedVisualSurfaces([], { full: true }), all);
assert.deepEqual(affectedVisualSurfaces(['docs/qa/summary.md', 'apps/web/src/App.tsx']), all);
assert.equal(changedFiles({ EVENT_NAME: 'workflow_dispatch' }), null);
assert.equal(changedFiles({ EVENT_NAME: 'push', PUSH_BASE_SHA: '0'.repeat(40), HEAD_SHA: 'a'.repeat(40) }), null);
console.log('PASS conservative visual scope: shared dependencies, unknown paths, deletions, manual runs, missing base');
