#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { pathToFileURL } from 'node:url';

export const ENVIRONMENT_LIMIT_BYTES = 64 * 1024;
export const ENVIRONMENT_WARNING_BYTES = 60 * 1024;

// Input is one complete, resolved deployment environment. Count UTF-8 bytes,
// including names and separators; never print values, hashes or value fragments.
export function measureDeploymentEnvironment(environment) {
  if (!environment || typeof environment !== 'object' || Array.isArray(environment) || !Object.keys(environment).length) {
    throw new Error('Supply a complete environment object with string values.');
  }
  const sizes = Object.entries(environment).map(([key, value]) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key) || typeof value !== 'string') {
      throw new Error('Environment entries must have valid names and unmasked string values.');
    }
    if (/^(?:\*{3,}|\[REDACTED\]|<redacted>)$/iu.test(value)) {
      throw new Error('Masked values cannot establish deployment size. Use the complete provisioning input.');
    }
    return { key, bytes: Buffer.byteLength(key) + Buffer.byteLength(value) + 2 };
  });
  const bytes = sizes.reduce((total, row) => total + row.bytes, 0);
  return { bytes, limitBytes: ENVIRONMENT_LIMIT_BYTES, remainingBytes: ENVIRONMENT_LIMIT_BYTES - bytes,
    status: bytes > ENVIRONMENT_LIMIT_BYTES ? 'over-limit' : bytes >= ENVIRONMENT_WARNING_BYTES ? 'near-limit' : 'ok',
    variables: sizes.length, largest: sizes.sort((a, b) => b.bytes - a.bytes).slice(0, 5) };
}

export function main(args) {
  const [format, file, ...extra] = args;
  if (!['--env-file', '--json-file', '--build'].includes(format) || extra.length || (format !== '--build' && !file) || (format === '--build' && file)) {
    throw new Error('Usage: check-deployment-env-size.mjs --env-file /private/complete.env | --json-file /private/complete.json | --build');
  }
  // Build environments include platform/shell variables, so this is a
  // conservative warning only. The complete provisioning file is the blocking
  // preflight, before Vercel can reject deployment creation at its own limit.
  // Vercel's encrypted transport envelope contains another copy of the project
  // environment; it is not a configured variable and must not be counted twice.
  const environment = format === '--build' ? Object.fromEntries(Object.entries(process.env)
    .filter(([key]) => key !== 'VERCEL_ENCRYPTED_ENV_CONTENT'))
    : format === '--env-file' ? parseEnv(readFileSync(file, 'utf8')) : JSON.parse(readFileSync(file, 'utf8'));
  const report = measureDeploymentEnvironment(environment);
  console.log(JSON.stringify({ ...report, source: format === '--build' ? 'build environment (excludes encrypted transport; includes other platform variables)' : 'complete provisioning environment' }));
  if (report.status !== 'ok') console.warn('Environment size is close to the deployment limit. Check the complete target environment before adding variables; move growing documents out of environment storage.');
  return format !== '--build' && report.status === 'over-limit' ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch { console.error('Environment size check failed. Supply a complete, unmasked target environment using --env-file or --json-file; no values were logged.'); process.exitCode = 1; }
}
