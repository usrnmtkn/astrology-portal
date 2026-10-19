import {createHash} from 'node:crypto';

export const calendarLazyEntries = [
  'src/CalendarTemplatePreview.tsx',
  'src/CalendarOverviewEditor.tsx',
  'src/SkyForecastTemplateStudio.tsx'
];
export const calendarLazyImporters = {
  'src/CalendarTemplatePreview.tsx': 'src/SkyForecastTemplateStudio.tsx',
  'src/CalendarOverviewEditor.tsx': 'src/GeneratedContentAdminDashboard.tsx',
  'src/SkyForecastTemplateStudio.tsx': 'src/GeneratedContentAdminDashboard.tsx'
};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const object = value => value && typeof value === 'object' && !Array.isArray(value);

/** The grouped workspace must preserve each actual dynamic source boundary. */
export function calendarLazyBoundaryFailures({manifest, entryKey, proof, sourceBytes, chunkBytes}) {
  const failures = [];
  if (!object(proof) || proof.schema !== 'admin-lazy-boundaries/v1' || !object(proof.entries)
    || Object.keys(proof).sort().join(',') !== 'entries,schema'
    || Object.keys(proof.entries).sort().join(',') !== [...calendarLazyEntries].sort().join(',')) {
    return ['Calendar lazy-boundary mapping is missing or malformed.'];
  }
  const initial = new Set();
  function visit(key) {
    if (initial.has(key)) return;
    initial.add(key);
    if (!manifest[key]) { failures.push('Calendar startup import graph is incomplete.'); return; }
    for (const dependency of manifest[key].imports ?? []) visit(dependency);
  }
  visit(entryKey);
  for (const key of calendarLazyEntries) {
    const row = proof.entries[key];
    if (!object(row) || Object.keys(row).sort().join(',') !== 'chunkSha256,dynamicImporters,file,renderedLength,sourceSha256'
      || !/^assets\/admin-calendar-workspace-[A-Za-z0-9_-]+\.js$/u.test(row.file ?? '')
      || !Number.isInteger(row.renderedLength) || row.renderedLength <= 0
      || !Array.isArray(row.dynamicImporters) || row.dynamicImporters.length !== 1
      || row.dynamicImporters[0] !== calendarLazyImporters[key]) {
      failures.push(`Calendar lazy source membership/importer is invalid: ${key}`);
      continue;
    }
    const groups = Object.entries(manifest).filter(([, item]) => item.file === row.file);
    if (groups.length !== 1 || groups[0][1].name !== 'admin-calendar-workspace' || groups[0][1].isDynamicEntry !== true) {
      failures.push(`Calendar lazy emitted group is missing or not dynamic: ${key}`);
      continue;
    }
    if (initial.has(groups[0][0])) failures.push(`Calendar workspace entered the startup graph: ${key}`);
    try {
      if (hash(sourceBytes(key)) !== row.sourceSha256 || hash(chunkBytes(row.file)) !== row.chunkSha256) {
        failures.push(`Calendar lazy-boundary mapping is stale: ${key}`);
      }
    } catch { failures.push(`Calendar lazy-boundary source/chunk is missing: ${key}`); }
  }
  return failures;
}
