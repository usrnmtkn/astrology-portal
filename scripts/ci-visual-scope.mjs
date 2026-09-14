import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function affectedVisualSurfaces(files, { full = false } = {}) {
  const result = { reader: false, studio: false, friends: false, sky: false };
  const all = () => Object.fromEntries(Object.keys(result).map(key => [key, true]));
  if (full) return all();
  for (const file of files) {
    // Only independently non-runtime documentation is known to need no browser.
    if (/^(docs\/|README(?:\.[^/]+)?$|LICENSE(?:\.[^/]+)?$)/u.test(file)) continue;
    // Shared entry points, styling, content, services and fixtures affect all tabs.
    if (/^(apps\/web\/(?:src\/(?:App\.tsx|main\.tsx|content\/|services\/|components\/|hooks\/|styles|types\.ts)|public\/)|api\/_lib\/|packages\/|tests\/helpers\/|config\/|src\/|\.github\/|package(?:-lock)?\.json$|playwright\.|scripts\/ci-)/u.test(file)) return all();
    if (file.startsWith('apps/admin/')) { result.reader = true; result.studio = true; result.sky = true; continue; }
    if (/^(apps\/web\/src\/features\/(friends|you)\/|api\/(friend|you-report|report-share|generate-friend)|tests\/visual\/.*friends)/u.test(file)) { result.reader = true; result.friends = true; continue; }
    if (/^(apps\/web\/src\/features\/sky\/|tests\/visual\/sky|scripts\/.*sky)/u.test(file)) { result.reader = true; result.sky = true; continue; }
    if (file.startsWith('api/admin/')) { result.reader = true; result.studio = true; result.sky = true; continue; }
    // Unknown dependencies fail open to testing, never to skipping a suite.
    return all();
  }
  return result;
}

export function changedFiles(env = process.env) {
  const base = env.PR_BASE_SHA || env.PUSH_BASE_SHA;
  if (env.EVENT_NAME === 'workflow_dispatch' || !base || /^0+$/u.test(base)) return null;
  const head = env.HEAD_SHA;
  if (!/^[a-f0-9]{40}$/iu.test(base) || !/^[a-f0-9]{40}$/iu.test(head || '')) return null;
  try {
    // No rename collapsing: both removed and added paths must be classified.
    return execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', base, head], { encoding: 'utf8' }).split('\0').filter(Boolean);
  } catch { return null; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = changedFiles();
  const scope = affectedVisualSurfaces(files || [], { full: files === null });
  const lines = Object.entries(scope).map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
  console.log(lines);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines);
}
